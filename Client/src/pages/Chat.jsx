// Chat page: Claude-inspired spacious AI interface with real-time SSE streaming
import React, { useState, useRef, useEffect } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useSelector, useDispatch } from "react-redux";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import {
  Send,
  Paperclip,
  Sparkles,
  Menu,
  Coins,
  Square,
  FolderPlus,
  ArrowRight,
  X,
} from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import ThemeToggle from "../components/ThemeToggle";
import ChatMessageContent from "../components/ChatMessageContent";
import Button from "../components/Button";
import chatService from "../services/chatService";
import agentService from "../services/agentService";
import { mapMessages } from "../services/projectService";
import ArtifactCard from "../components/chat/ArtifactCard";
import ArtifactPanel from "../components/chat/ArtifactPanel";
import { downloadZip } from "../utils/downloadFiles";
import { getProfile } from "../features/auth/authSlice";

const PROMPT_SUGGESTIONS = [
  {
    title: "Custom React useDebounce hook",
    subtitle: "Hook with cleanup and delay timer",
    prompt:
      "Can you show me an example of a useDebounce hook in React with explanation and usage?",
  },
  {
    title: "Tailwind 4 responsive grid",
    subtitle: "Auto-fit layout with cards",
    prompt: "How do I create a responsive auto-fit grid in Tailwind CSS?",
  },
  {
    title: "React 19 Server Components",
    subtitle: "Difference from Client Components",
    prompt:
      "Explain the core difference between React Server Components and Client Components with code examples.",
  },
  {
    title: "Build a Storefront App",
    subtitle: "Planner and Coder architecture",
    prompt:
      "I want to build an e-commerce storefront for developer accessories with cart and product grid.",
  },
];

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
  const [artifactTab, setArtifactTab] = useState("preview");
  const [artifactFile, setArtifactFile] = useState(null);

  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingStatus, setProcessingStatus] = useState("Analyzing your request…");
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
    }
    return () => {
      controllerRef.current?.abort();
    };
  }, [id, chatData]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleFileSelect = (e) => {
    const selected = Array.from(e.target.files || []);
    if (!selected.length) return;
    const remainingSlots = 3 - attachments.length;
    const newAttachments = selected.slice(0, remainingSlots).map((f) => ({
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1),
    }));
    setAttachments([...attachments, ...newAttachments]);
    e.target.value = "";
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSendPrompt = async (textToSend) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isGenerating) return;

    const text = query.trim();
    setInputPrompt("");
    setAttachments([]);

    let chatId = currentChatId;
    let isNewChat = false;

    try {
      if (!chatId) {
        const newChat = await chatService.createChat(user?.token, {
          title: text.slice(0, 40),
        });
        chatId = newChat._id;
        setCurrentChatId(chatId);
        isNewChat = true;
        queryClient.invalidateQueries({ queryKey: ["chats"] });
      }

      const userMessage = {
        type: "user",
        text,
        attachments: [],
      };
      setMessages((prev) => [...prev, userMessage]);

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsGenerating(true);
      setProcessingStatus("Analyzing your request…");

      await agentService.streamAgent({
        token: user?.token,
        body: {
          chatId,
          message: text,
          mode: "chat",
        },
        signal: controller.signal,
        onEvent: (event, data) => {
          if (event === "status") {
            setProcessingStatus(data.message);
          } else if (event === "token") {
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.type === "assistant" && last.isStreaming) {
                return [
                  ...prev.slice(0, -1),
                  { ...last, text: last.text + data.text },
                ];
              }
              return [
                ...prev,
                { type: "assistant", text: data.text, isStreaming: true },
              ];
            });
          } else if (event === "credits") {
            if (data.credits != null) {
              dispatch(getProfile({ credits: data.credits }));
            }
          } else if (event === "error") {
            toast.error(data.message);
          } else if (event === "done") {
            setIsGenerating(false);
            setMessages((prev) => {
              const last = prev[prev.length - 1];
              if (last && last.isStreaming) {
                return [...prev.slice(0, -1), { ...last, isStreaming: false }];
              }
              return prev;
            });
            if (data.changedFiles && data.changedFiles.length > 0) {
              queryClient.invalidateQueries({ queryKey: ["chat", chatId] });
            }
            if (isNewChat) {
              navigate(`/chat/${chatId}`, { replace: true });
            }
          }
        },
      });
    } catch (error) {
      if (error.name !== "AbortError") {
        toast.error(error.message || "Something went wrong");
      }
    } finally {
      setIsGenerating(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, isStreaming: false }];
        }
        return prev;
      });
    }
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

  return (
    <div className="h-screen bg-page text-ink flex overflow-hidden">
      {/* Desktop Fixed Left Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[264px] z-40">
        <Sidebar />
      </div>

      {/* Mobile Drawer Backdrop */}
      {isMobileMenuOpen && (
        <div
          className="fixed inset-0 bg-black/60 z-50 lg:hidden backdrop-blur-xs animate-in fade-in"
          onClick={() => setIsMobileMenuOpen(false)}>
          <div
            className="w-[264px] h-full"
            onClick={(e) => e.stopPropagation()}>
            <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
          </div>
        </div>
      )}

      {/* Main Content Area */}
      <div className="flex-1 flex min-w-0 lg:pl-[264px] h-screen overflow-hidden">
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
                <span className="text-xs font-semibold text-ink">
                  {chatTitle}
                </span>
                <span className="text-[11px] text-muted hidden sm:inline">
                  • General purpose code and chat
                </span>
              </div>
            </div>

            {/* Right Header: Credits pill, Theme toggle, Avatar */}
            <div className="flex items-center gap-3">
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
                  <div className="w-14 h-14 rounded-2xl bg-primary-gradient flex items-center justify-center text-white shadow-lg mb-4">
                    <Sparkles size={28} />
                  </div>
                  <h1 className="text-2xl md:text-3xl font-bold tracking-tight text-ink">
                    How can I help you build today?
                  </h1>
                  <p className="text-xs md:text-sm text-muted mt-2 max-w-md">
                    Ask programming questions, request architecture plans, or generate
                    reusable React components and Tailwind snippets.
                  </p>

                  {/* Prompt suggestion cards (2x2 grid) */}
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full mt-8 text-left">
                    {PROMPT_SUGGESTIONS.map((item, idx) => (
                      <div
                        key={idx}
                        onClick={() => handleSendPrompt(item.prompt)}
                        className="p-4 rounded-2xl bg-card border border-line hover:border-[#0099FF] shadow-xs cursor-pointer group transition-all">
                        <div className="flex items-center justify-between">
                          <span className="text-xs font-semibold text-ink group-hover:text-[#0099FF] transition-colors">
                            {item.title}
                          </span>
                          <ArrowRight
                            size={14}
                            className="text-muted group-hover:text-[#0099FF] group-hover:translate-x-0.5 transition-all"
                          />
                        </div>
                        <p className="text-[11px] text-muted mt-1">
                          {item.subtitle}
                        </p>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex flex-col gap-6 py-4">
                  {messages.map((msg, index) => {
                    const isUser = msg.type === "user";
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
                            <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                              <Sparkles size={16} />
                            </div>
                          )}

                          <div
                            className={`rounded-2xl p-4 text-xs md:text-sm shadow-xs ${
                              isUser
                                ? "bg-gradient-to-r from-[#0099FF] to-[#6D5DFC] text-white whitespace-pre-wrap"
                                : "bg-card border border-line text-ink leading-relaxed"
                            }`}>
                            {isUser && msg.attachments?.length > 0 && (
                              <div className="flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-white/20">
                                {msg.attachments.map((att, i) => (
                                  <span
                                    key={i}
                                    className="inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] text-white font-medium">
                                    <Paperclip size={10} />
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

                        {/* ArtifactCard under last build message */}
                        {!isUser && index === targetCardIndex && files.length > 0 && (
                          <div className="w-full max-w-[95%] pl-11">
                            <ArtifactCard
                              files={files}
                              preview={preview}
                              onOpen={(tab, filePath) => {
                                setArtifactTab(tab);
                                setArtifactFile(filePath || null);
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
                  {isGenerating && (
                    <div className="self-start max-w-[95%] flex gap-3.5 items-center">
                      <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center text-white shrink-0 shadow-xs">
                        <Sparkles size={16} className="animate-spin" />
                      </div>
                      <div className="px-3.5 py-2 rounded-2xl bg-card border border-line text-xs text-muted flex items-center gap-2 shadow-xs">
                        <span className="w-2 h-2 rounded-full bg-[#0099FF] animate-pulse" />
                        <span className="font-medium text-ink">
                          {processingStatus}
                        </span>
                      </div>
                    </div>
                  )}
                  <div ref={messagesEndRef} />
                </div>
              )}
            </div>
          </div>

          {/* Pinned Bottom Input Card */}
          <div className="p-4 md:p-6 bg-page flex justify-center shrink-0">
            <div className="w-full max-w-[800px] bg-card border border-line focus-within:border-[#0099FF] rounded-2xl p-3 md:p-3.5 shadow-md transition-colors flex flex-col">
              {/* Attached file chips */}
              {attachments.length > 0 && (
                <div className="flex flex-wrap gap-1.5 pb-2 border-b border-line mb-2">
                  {attachments.map((att, i) => (
                    <div
                      key={i}
                      className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-lg px-2.5 py-1 text-[11px] text-ink">
                      <span className="truncate max-w-[140px]">{att.name}</span>
                      <button
                        type="button"
                        onClick={() => handleRemoveAttachment(i)}
                        className="text-muted hover:text-red-500 cursor-pointer">
                        <X size={12} />
                      </button>
                    </div>
                  ))}
                </div>
              )}

              {/* Input textarea */}
              <textarea
                rows={2}
                value={inputPrompt}
                onChange={(e) => setInputPrompt(e.target.value)}
                onKeyDown={(e) => {
                  if (e.key === "Enter" && !e.shiftKey) {
                    e.preventDefault();
                    handleSendPrompt();
                  }
                }}
                placeholder="Message Drexel AI... (Ask for code snippets, programming questions, or app concepts)"
                className="w-full bg-transparent text-ink text-xs md:text-sm outline-none resize-none leading-relaxed placeholder:text-muted"
              />

              {/* Bottom Actions Row */}
              <div className="flex items-center justify-between pt-2 border-t border-line/60 mt-1">
                <div className="flex items-center gap-2">
                  <input
                    type="file"
                    ref={fileInputRef}
                    onChange={handleFileSelect}
                    accept=".jpg,.jpeg,.png,.pdf"
                    multiple
                    className="hidden"
                  />
                  <button
                    type="button"
                    onClick={() => fileInputRef.current?.click()}
                    disabled={attachments.length >= 3}
                    title="Attach images or documents (Max 3, 5MB)"
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
                    className="h-8 px-3 text-xs"
                    icon={Square}>
                    Stop
                  </Button>
                ) : (
                  <Button
                    variant="primary"
                    onClick={() => handleSendPrompt()}
                    disabled={!inputPrompt.trim()}
                    className="h-8 px-3.5 text-xs shadow-xs"
                    icon={Send}>
                    Send
                  </Button>
                )}
              </div>
            </div>
          </div>
        </div>

        {/* ArtifactPanel opens on the right */}
        {artifactPanelOpen && files.length > 0 && (
          <ArtifactPanel
            files={files}
            preview={preview}
            tab={artifactTab}
            file={artifactFile}
            title={chatTitle}
            onClose={() => setArtifactPanelOpen(false)}
            onFixError={(err) => handleSendPrompt(`Fix error: ${err}`)}
          />
        )}
      </div>
    </div>
  );
}
