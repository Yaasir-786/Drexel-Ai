// Chat page: Claude-inspired spacious AI interface with real-time SSE streaming
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Send,
  Paperclip,
  Menu,
  Coins,
  Square,
  FolderPlus,
  X,
  Eye,
  FileText,
  FileArchive,
} from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import ThemeToggle from "../components/ThemeToggle";
import ChatMessageContent from "../components/ChatMessageContent";
import Button from "../components/Button";
import chatService from "../services/chatService";
import agentService from "../services/agentService";
import { mapMessages } from "../services/projectService";
import uploadService from "../services/uploadService";
import ArtifactCard from "../components/chat/ArtifactCard";
import ArtifactPanel from "../components/chat/ArtifactPanel";
import { downloadZip } from "../utils/downloadFiles";
import { getProfile } from "../features/auth/authSlice";
import { createTypewriter } from "../utils/typewriter";
import RunStatus from "../components/RunStatus";
import PromptGlow from "../components/PromptGlow";
import Greeting from "../components/Greeting";
import ChatImage from "../components/chat/ChatImage";

// replaces the shimmer placeholder with the finished image message
const pushImageMessage = (setMessages, image) => {
  setMessages((prev) => {
    const next = [...prev];
    const index = next.findIndex((m) => m.type === "image-loading");
    const imageMessage = {
      type: "assistant",
      text: "Here is your image.",
      images: [{ url: image.url, publicId: image.publicId }],
    };
    if (index >= 0) next.splice(index, 1, imageMessage);
    else next.push(imageMessage);
    return next;
  });
};

// unique id for attachment chips
const newId = () => Date.now() + "-" + Math.random().toString(36).slice(2, 8);

export default function Chat() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(id || null);
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [preview, setPreview] = useState(true);
  const [chatTitle, setChatTitle] = useState("New chat");
  const [artifactPanelOpen, setArtifactPanelOpen] = useState(false);
  const [artifactChatId, setArtifactChatId] = useState(null);
  const [artifactFile, setArtifactFile] = useState(null);

  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWritingFiles, setIsWritingFiles] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Thinking…");
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);
  const controllerRef = useRef(null);

  // Load chat history if id exists
  const { data: chatData } = useQuery({
    queryKey: ["chat", id],
    queryFn: () => chatService.getChatById(user?.token, id),
    enabled: !!id && !!user?.token,
  });

  useEffect(() => {
    setCurrentChatId(id || null);
    if (id) {
      if (chatData) {
        setMessages(mapMessages(chatData.messages || []));
        setFiles(chatData.files || []);
        setPreview(chatData.preview !== false);
        setChatTitle(chatData.title || "New chat");
      }
    } else {
      setMessages([]);
      setFiles([]);
      setPreview(true);
      setChatTitle("New chat");
      setArtifactPanelOpen(false);
      setArtifactChatId(null);
    }
    return () => {
      controllerRef.current?.abort();
    };
  }, [id, chatData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "auto" });
  }, [messages, isGenerating]);

  // validate and keep the real File objects for the upload (zips index right away)
  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    e.target.value = "";
    if (!selected.length) return;

    const allowed = ["image/jpeg", "image/jpg", "image/png", "application/pdf"];
    const next = [...attachments];

    for (const file of selected) {
      if (next.length >= 3) {
        toast.error("You can attach at most 3 files");
        break;
      }
      const isZip =
        file.type === "application/zip" ||
        file.type === "application/x-zip-compressed" ||
        file.name.toLowerCase().endsWith(".zip");
      if (!allowed.includes(file.type) && !isZip) {
        toast.error(`${file.name}: only JPG, PNG, PDF and ZIP files are allowed`);
        continue;
      }
      if (file.size > (isZip ? 20 : 5) * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${isZip ? "20 MB" : "5 MB"}`);
        continue;
      }
      if (isZip) {
        next.push({ id: newId(), name: file.name, isZip: true, indexing: true, uploaded: null, zipFile: file });
      } else {
        next.push({
          id: newId(),
          file,
          name: file.name,
          size: (file.size / (1024 * 1024)).toFixed(1),
          // local preview url for images, null for PDFs
          preview: file.type.startsWith("image/") ? URL.createObjectURL(file) : null,
        });
      }
    }

    setAttachments(next);

    // index zip files immediately, so they are ready when the user sends
    next.forEach((entry) => {
      // only index the zips added in this call
      if (!entry.isZip || !entry.zipFile) return;
      uploadService
        .uploadFiles(user?.token, [entry.zipFile])
        .then((files) => {
          setAttachments((prev) =>
            prev.map((att) =>
              att.id === entry.id
                ? { ...att, indexing: false, uploaded: files[0], zipFile: null }
                : att,
            ),
          );
        })
        .catch(() => {
          setAttachments((prev) => prev.filter((att) => att.id !== entry.id));
          toast.error(`${entry.name}: could not index the ZIP file`);
        });
    });
  };

  const handleRemoveAttachment = (id) => {
    setAttachments(attachments.filter((att) => att.id !== id));
  };

  // image edit flow: optimistic bubbles around the image-edit API call
  const handleImageEditStart = (instruction) => {
    setMessages((prev) => [
      ...prev,
      { type: "user", text: `Edit: ${instruction}` },
      { type: "image-loading" },
    ]);
  };

  const handleImageEditSuccess = (data) => {
    if (data.image) pushImageMessage(setMessages, data.image);
  };

  const handleImageEditError = () => {
    setMessages((prev) => prev.filter((m) => m.type !== "image-loading"));
  };

  const runStream = async ({ message, type = "prompt", errorLog = "", attachments = [] }) => {
    if (
      (!message?.trim() && type !== "fix" && attachments.length === 0) ||
      isGenerating
    )
      return;

    let chatId = currentChatId;
    let isNewChat = false;
    let typer;

    try {
      if (!chatId) {
        const newChat = await chatService.createChat(user?.token, {
          title: "New chat",
        });
        chatId = newChat._id;
        setCurrentChatId(chatId);
        isNewChat = true;
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }

      const userMessage = {
        type: "user",
        text: type === "fix" ? "Fix preview error" : message,
        attachments: attachments.map((file) => ({
          url: file.url,
          name: file.name,
          type: file.type,
        })),
      };
      setMessages((prev) => [...prev, userMessage]);

      typer = createTypewriter((chunk) => {
        setMessages((prev) => {
          const last = prev[prev.length - 1];
          if (last && last.type === "assistant" && last.isStreaming) {
            return [
              ...prev.slice(0, -1),
              { ...last, text: last.text + chunk },
            ];
          }
          return [
            ...prev,
            { type: "assistant", text: chunk, isStreaming: true },
          ];
        });
      });

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsGenerating(true);
      setProcessingStatus("Thinking…");

      let doneData = null;

      await agentService.streamAgent({
        token: user?.token,
        body: {
          chatId,
          message: message || "",
          mode: type === "fix" ? "build" : "chat",
          type,
          errorLog,
          attachments,
        },
        signal: controller.signal,
        onEvent: (event, data) => {
          if (event === "status") {
            setProcessingStatus(
              /review/i.test(data.message) ? "Reviewing changes…" : /coder|code/i.test(data.message) ? "Generating code…" : "Thinking…"
            );
            // image generation: show a shimmer placeholder in the chat
            if (/image/i.test(data.message)) {
              setMessages((prev) =>
                prev.some((m) => m.type === "image-loading")
                  ? prev
                  : [...prev, { type: "image-loading" }],
              );
            }
          } else if (event === "image") {
            pushImageMessage(setMessages, data);
          } else if (event === "file_start") {
            setIsWritingFiles(true);
          } else if (event === "token") {
            typer.push(data.text);
          } else if (event === "credits") {
            if (data.credits != null) {
              dispatch(getProfile({ credits: data.credits }));
            }
          } else if (event === "error") {
            toast.error(data.message);
            // remove a leftover image placeholder after a failed generation
            setMessages((prev) => prev.filter((m) => m.type !== "image-loading"));
          } else if (event === "title") {
            if (data.title) {
              setChatTitle(data.title);
              queryClient.setQueryData(["chats"], (old = []) =>
                old.map((c) =>
                  c._id === data.chatId ? { ...c, title: data.title } : c,
                ),
              );
              queryClient.setQueryData(["chat", chatId], (old) =>
                old ? { ...old, title: data.title } : old,
              );
              queryClient.invalidateQueries({ queryKey: ["chats"] });
            }
          } else if (event === "done") {
            doneData = data;
            queryClient.invalidateQueries({ queryKey: ["chats"] });
          }
        },
      });

      await typer.drain();

      // remove a leftover image placeholder (aborted generation)
      setMessages((prev) => prev.filter((m) => m.type !== "image-loading"));

      setIsGenerating(false);
      setIsWritingFiles(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, isStreaming: false }];
        }
        return prev;
      });

      if (doneData?.changedFiles && doneData.changedFiles.length > 0) {
        await queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
        const fresh = queryClient.getQueryData(["chat", chatId]);
        if (fresh?.preview !== false) {
          setArtifactChatId(chatId);
          setArtifactPanelOpen(true);
        }
      }

      if (isNewChat) {
        navigate(`/chat/${chatId}`, { replace: true });
      }
    } catch (error) {
      typer?.stop();
      if (error.name !== "AbortError") {
        toast.error(error.message || "Something went wrong");
      }
    } finally {
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      setIsGenerating(false);
      setIsWritingFiles(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, isStreaming: false }];
        }
        return prev;
      });
    }
  };

  // block sending while a zip is still being indexed
  const isIndexing = attachments.some((att) => att.isZip && att.indexing);

  // upload the attached files first, then stream with the stored file objects
  const handleSendPrompt = async (textToSend) => {
    const text = (textToSend || inputPrompt)?.trim();
    if ((!text && attachments.length === 0) || isUploading || isGenerating || isIndexing)
      return;

    // zips are already indexed, images and PDFs upload now
    let uploaded = attachments
      .filter((att) => att.isZip && att.uploaded)
      .map((att) => ({
        documentId: att.uploaded.documentId,
        name: att.uploaded.name,
        type: "zip",
      }));

    const plainFiles = attachments.filter((att) => !att.isZip);
    if (plainFiles.length > 0) {
      try {
        setIsUploading(true);
        uploaded = uploaded.concat(
          await uploadService.uploadFiles(
            user?.token,
            plainFiles.map((att) => att.file),
          ),
        );
      } catch (error) {
        toast.error("File upload failed. Please try again.");
        return;
      } finally {
        setIsUploading(false);
      }
    }

    setInputPrompt("");
    setAttachments([]);
    runStream({ message: text, attachments: uploaded });
  };

  // Find last build or assistant message to place ArtifactCard under
  const targetCardIndex = (() => {
    for (let i = messages.length - 1; i >= 0; i--) {
      if (
        messages[i].type === "assistant" &&
        (messages[i].mode === "build" || (messages[i].files && messages[i].files.length > 0))
      ) {
        return i;
      }
    }
    for (let i = messages.length - 1; i >= 0; i--) {
      if (messages[i].type === "assistant") return i;
    }
    return -1;
  })();

  const lastMessage = messages[messages.length - 1];
  const showStatus = isGenerating && (!lastMessage?.isStreaming || isWritingFiles);
  const label = isWritingFiles || /code|review/i.test(processingStatus) ? "Running a command" : "Thinking";

  return (
    <div className="h-screen bg-page text-ink flex overflow-hidden">
      {/* Desktop Fixed Left Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[320px] z-40">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="w-[320px] h-full"
            onClick={(e) => e.stopPropagation()}>
            <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0 lg:pl-[320px] h-screen overflow-hidden">
        {/* Chat Stream Column */}
        <div className="flex-1 flex flex-col min-w-0 h-full overflow-hidden">
          {/* Chat Header */}
          <header className="h-16 border-b border-line bg-card/80 backdrop-blur-md px-4 md:px-8 flex items-center justify-between shrink-0 sticky top-0 z-30">
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsMobileMenuOpen(true)}
                aria-label="Open sidebar menu"
                className="lg:hidden p-2 rounded-xl text-muted hover:text-ink hover:bg-surface border border-line cursor-pointer">
                <Menu size={20} />
              </button>

              <div className="flex items-center gap-2">
                <span className="w-2.5 h-2.5 rounded-full bg-emerald-500 animate-pulse" />
                <span className="text-base font-semibold text-ink">
                  {chatTitle}
                </span>
                <span className="text-sm text-muted hidden sm:inline">
                  • General purpose code and chat
                </span>
              </div>
            </div>

            {/* Right Header: Credits pill, Theme toggle, Avatar */}
            <div className="flex items-center gap-3">
              {files.length > 0 && preview && !artifactPanelOpen && (
                <Button
                  variant="secondary"
                  onClick={() => {
                    setArtifactChatId(id);
                    setArtifactPanelOpen(true);
                  }}
                  icon={Eye}
                  className="h-8 px-3 text-xs"
                >
                  Preview
                </Button>
              )}

              <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-medium text-ink whitespace-nowrap">
                <Coins size={14} className="text-[#0099FF] shrink-0" />
                <span>{user?.credits ?? 0} credits</span>
              </div>

              <ThemeToggle />

              <Link
                to="/settings"
                className="w-9 h-9 rounded-xl bg-primary-gradient flex items-center justify-center text-white text-xs font-bold select-none shadow-sm cursor-pointer"
                title={user?.name || "Jane Doe"}>
                {user?.name?.slice(0, 2).toUpperCase()}
              </Link>
            </div>
          </header>

          {/* Scrollable Chat Area */}
          <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col items-center">
            <div className="w-full max-w-[800px] flex-1 flex flex-col justify-between">
              {messages.length === 0 ? (
                <div className="my-auto py-8 flex flex-col items-center text-center">
                  <div className="relative -top-2.5 w-20 h-20 mb-3 shrink-0">
                    <div
                      className="absolute left-1/2 top-1/2 w-[400%] h-[400%] -translate-x-1/2 -translate-y-1/2 rounded-full pointer-events-none"
                      style={{ background: "radial-gradient(circle, rgba(59,140,255,0.45) 0%, rgba(59,140,255,0.22) 30%, rgba(59,140,255,0) 70%)" }}
                    />
                    <img
                      src="/drexel-logo.svg"
                      alt="Drexel-Ai"
                      draggable={false}
                      className="relative w-full h-full"
                      style={{ filter: "drop-shadow(0 0 8px rgba(59,140,255,0.55))" }}
                    />
                  </div>
                  <Greeting />
                </div>
              ) : (
                <div className="flex flex-col gap-6 py-4">
                  {messages.map((msg, index) => {
                    const isUser = msg.type === "user";

                    // shimmer placeholder while an image is being generated
                    if (msg.type === "image-loading") {
                      return (
                        <div key={index} className="self-start flex gap-3.5 items-start">
                          <img src="/drexel-logo.svg" alt="Drexel-Ai" draggable={false} className="w-9 h-9 shrink-0" />
                          <div className="w-64 h-64 rounded-2xl border border-line bg-surface animate-pulse" />
                        </div>
                      );
                    }

                    return (
                      <div
                        key={index}
                        className={`flex flex-col ${
                          isUser ? "items-end" : "items-start"
                        }`}>
                        <div
                          className={`flex gap-3.5 ${
                            isUser ? "flex-row-reverse self-end max-w-[85%]" : "self-start max-w-[95%]"
                          }`}>
                          {!isUser && (
                            <img src="/drexel-logo.svg" alt="Drexel-Ai" draggable={false} className="w-9 h-9 shrink-0" />
                          )}

                          <div
                            className={`${
                              isUser
                                ? "font-serif rounded-2xl p-4 text-base shadow-xs bg-gradient-to-r from-[#0099FF] to-[#6D5DFC] text-white whitespace-pre-wrap"
                                : "min-w-0 pt-1 font-serif text-base text-ink leading-relaxed"
                            }`}>
                            {isUser && msg.attachments?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-white/20">
                                {msg.attachments.map((att, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] text-white font-medium">
                                    {att.type === "image" ? (
                                      <img
                                        src={att.url}
                                        alt={att.name}
                                        className="w-4 h-4 rounded object-cover shrink-0"
                                      />
                                    ) : att.type === "zip" ? (
                                      <FileArchive size={10} />
                                    ) : (
                                      <Paperclip size={10} />
                                    )}
                                    {att.name}
                                  </span>
                                ))}
                              </div>
                            )}

                            {isUser ? (
                              msg.text
                            ) : (
                              <ChatMessageContent content={msg.text || ""} />
                            )}
                          </div>
                        </div>

                        {/* Generated images under the assistant text */}
                        {!isUser && msg.images?.length > 0 && (
                          <div className="pl-12 mt-1 flex flex-col gap-2">
                            {msg.images.map((img, i) => (
                              <ChatImage
                                key={i}
                                url={img.url}
                                chatId={currentChatId}
                                onEditStart={handleImageEditStart}
                                onEditSuccess={handleImageEditSuccess}
                                onEditError={handleImageEditError}
                              />
                            ))}
                          </div>
                        )}

                        {/* ArtifactCard under last build message */}
                        {!isUser && index === targetCardIndex && files.length > 0 && preview === false && (
                          <div className="w-full max-w-[95%] pl-11">
                            <ArtifactCard
                              files={files}
                              preview={preview}
                              onOpen={(tab, filePath) => {
                                setArtifactFile(filePath || null);
                                setArtifactChatId(id);
                                setArtifactPanelOpen(true);
                              }}
                              onDownloadZip={() => downloadZip(files, chatTitle)}
                            />
                          </div>
                        )}
                      </div>
                    );
                  })}

                  {/* Status indicator during AI generation */}
                  {showStatus && (
                    <div className="self-start max-w-[95%] flex gap-3.5 items-center">
                      <img src="/drexel-logo.svg" alt="Drexel-Ai" draggable={false} className="w-9 h-9 shrink-0" />
                      <RunStatus label={label} />
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Pinned Bottom Input Card */}
          <div className="px-4 md:px-6 pt-4 pb-5 bg-page flex justify-center shrink-0">
            <PromptGlow rounded="2xl" active={isGenerating} className="max-w-[800px]">
            <div className="w-full max-w-[800px] bg-card border border-line focus-within:border-[#0099FF] rounded-2xl p-2.5 md:p-3 shadow-md transition-colors flex flex-col">
              {/* Attached file chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-line mb-2">
                  {attachments.map((att) => (
                    <div
                      key={att.id}
                      className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-lg px-2.5 py-1 text-[11px] text-ink">
                      {att.isZip ? (
                        <FileArchive size={13} className="text-muted shrink-0" />
                      ) : att.preview ? (
                        <img
                          src={att.preview}
                          alt={att.name}
                          className="w-5 h-5 rounded object-cover shrink-0"
                        />
                      ) : (
                        <FileText size={13} className="text-muted shrink-0" />
                      )}
                      <div className="flex flex-col leading-tight min-w-0">
                        <span className="truncate max-w-[140px]">{att.name}</span>
                        {att.isZip && (
                          <span className="text-[9px] text-muted">
                            {att.indexing
                              ? "Indexing..."
                              : `Indexed ${att.uploaded?.fileCount ?? 0} files`}
                          </span>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(att.id)}
                        className="text-muted hover:text-red-500 cursor-pointer">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input textarea */}
              <textarea
                rows={1}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder="Message Drexel AI... (Ask for code snippets, programming questions, or app concepts)"
                className="w-full bg-transparent font-serif text-ink text-base outline-none resize-none leading-relaxed placeholder:text-muted field-sizing-content max-h-40 overflow-y-auto"
              />

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between pt-1.5 border-t border-line/60 mt-0.5">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".jpg,.jpeg,.png,.pdf,.zip"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= 3}
                    title="Attach files (Max 3, JPG PNG PDF ZIP)"
                    className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer disabled:opacity-40">
                    <Paperclip size={18} />
                  </button>

                  <Link
                    to="/projects/new"
                    className="inline-flex items-center gap-1 px-2.5 py-1 rounded-lg text-xs text-muted hover:text-ink hover:bg-surface border border-line/60"
                    title="Switch to full project builder">
                    <FolderPlus size={13} className="text-[#0099FF]" />
                    <span className="text-[11px] font-medium hidden sm:inline">
                      Build Project
                    </span>
                  </Link>
                </div>

                {isGenerating ? (
                  <Button
                    variant="danger"
                    onClick={() => controllerRef.current?.abort()}
                    className="h-9! px-3 text-xs"
                    icon={Square}>
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleSendPrompt()}
                    disabled={
                      (!inputPrompt.trim() && attachments.length === 0) ||
                      isUploading ||
                      isIndexing
                    }
                    className="h-9! px-3.5 text-xs shadow-xs"
                    icon={Send}>
                    {isUploading ? "Uploading..." : "Send"}
                  </Button>
                )}
              </div>
            </div>
            </PromptGlow>
          </div>
        </div>

        {/* ArtifactPanel opens on the right */}
        {artifactPanelOpen && artifactChatId === id && files.length > 0 && (
          <ArtifactPanel
            files={files}
            preview={preview}
            tab="preview"
            file={artifactFile}
            title={chatTitle}
            onClose={() => setArtifactPanelOpen(false)}
            onFixError={(err) =>
              runStream({
                message: "The live preview shows an error. Find the cause and fix it.",
                type: "fix",
                errorLog: err,
              })
            }
          />
        )}
      </div>
    </div>
  );
}
