// Builder page: sidebar + chat by default, Preview/Code workspace opens on demand
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Code2, Eye, X } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import BuilderTopBar from '../components/builder/BuilderTopBar';
import ChatPanel from '../components/builder/ChatPanel';
import PreviewPanel from '../components/builder/PreviewPanel';
import CodePanel from '../components/builder/CodePanel';
import Sidebar from '../components/layout/Sidebar';
import projectService, { mapMessages } from '../services/projectService';
import agentService from '../services/agentService';
import { getProfile } from '../features/auth/authSlice';
import { downloadZip } from '../utils/downloadFiles';
import { createTypewriter } from '../utils/typewriter';

// replaces the shimmer placeholder with the finished image message
const pushImageMessage = (setMessages, image) => {
  setMessages((prev) => {
    const next = [...prev];
    const index = next.findIndex((m) => m.type === 'image-loading');
    const imageMessage = {
      type: 'assistant',
      text: 'Here is your image.',
      images: [{ url: image.url, publicId: image.publicId }],
    };
    if (index >= 0) next.splice(index, 1, imageMessage);
    else next.push(imageMessage);
    return next;
  });
};

export default function Builder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);

  const isNew = id === 'new';
  const [currentProjectId, setCurrentProjectId] = useState(isNew ? null : id);
  const [projectName, setProjectName] = useState('Untitled Project');
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState([]);
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isWritingFiles, setIsWritingFiles] = useState(false);
  const [statusMessage, setStatusMessage] = useState('');
  const [isSaving, setIsSaving] = useState(false);
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);

  // Preview/Code workspace: closed by default, opened only from the Preview button
  const [showWorkspace, setShowWorkspace] = useState(false);

  // Tab state: [preview | code]
  const [activeTab, setActiveTab] = useState('preview');
  const controllerRef = useRef(null);
  const typerRef = useRef(null);
  const requestIdRef = useRef(null);
  const shownLengthRef = useRef(0);

  // Fetch project details if not "new"
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.getProject(user?.token, id),
    enabled: id !== "new" && !!user?.token && !!id,
  });

  // Fetch chat history if not "new"
  const { data: chatData } = useQuery({
    queryKey: ["projectChat", id],
    queryFn: () => projectService.getChat(user?.token, id),
    enabled: id !== "new" && !!user?.token && !!id,
  });

  useEffect(() => {
    setCurrentProjectId(id === 'new' ? null : id);
    // the workspace starts closed on every project, but not right after a
    // new project was created in this session (the id just changed to it)
    if (id !== currentProjectId) setShowWorkspace(false);
    if (id === 'new') {
      setProjectName('Untitled Project');
      setMessages([]);
      setFiles([]);
      setHasGeneratedCode(false);
    }
    return () => {
      controllerRef.current?.abort();
    };
  }, [id]);

  useEffect(() => {
    if (project) {
      setProjectName(project.name || 'Untitled Project');
      const projectFiles = project.files || [];
      setFiles(projectFiles);
      setHasGeneratedCode(projectFiles.length > 0);
    }
  }, [project]);

  useEffect(() => {
    if (chatData) {
      setMessages(mapMessages(chatData.messages));
    }
  }, [chatData]);

  const handleRename = async (newName) => {
    setProjectName(newName);
    const targetId = currentProjectId || id;
    if (targetId && targetId !== 'new') {
      try {
        await projectService.renameProject(user?.token, targetId, newName);
        queryClient.invalidateQueries({ queryKey: ["project", targetId] });
        queryClient.invalidateQueries({ queryKey: ["projects", "project"] });
      } catch (err) {
        console.error("Failed to rename project:", err);
      }
    }
  };

  const handleSendMessage = async (
    text,
    mode,
    attachments = [],
    type = "prompt",
    errorLog = "",
    replaceFromMessageId = null,
  ) => {
    if ((!text?.trim() && type !== "fix" && attachments.length === 0) || isGenerating) return;

    let projectId = currentProjectId;
    let isCreated = false;
    let typer;

    // remember if the project had files before, so only the first build auto-opens the preview
    const hadFilesBefore = files.length > 0;

    try {
      if (id === "new" || !projectId) {
        const newProj = await projectService.createProject(user?.token, {});
        projectId = newProj._id;
        setCurrentProjectId(projectId);
        isCreated = true;
        queryClient.invalidateQueries({ queryKey: ["projects", "project"] });
      }

      const userMsg = {
        type: 'user',
        text: type === "fix" ? "Fix preview error" : text,
        mode,
        createdAt: Date.now(),
        // keep everything the re-run of an edited message needs (publicId etc.)
        attachments: attachments.map((file) => ({
          url: file.url,
          publicId: file.publicId,
          documentId: file.documentId,
          name: file.name,
          type: file.type,
          text: file.text,
        })),
      };
      setMessages((prev) => [...prev, userMsg]);

      typer = createTypewriter((chunk) => {
        // count what the user has actually seen (used when stopping)
        shownLengthRef.current += chunk.length;
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
      typerRef.current = typer;

      // the stop route on the server aborts this request id
      const requestId = crypto.randomUUID();
      requestIdRef.current = requestId;
      shownLengthRef.current = 0;

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsGenerating(true);
      setStatusMessage("Thinking…");

      let doneData = null;

      await agentService.streamAgent({
        token: user?.token,
        body: {
          projectId,
          message: text || "",
          mode: mode ? mode.toLowerCase() : "chat",
          type,
          errorLog,
          attachments,
          requestId,
          ...(replaceFromMessageId && { replaceFromMessageId }),
        },
        signal: controller.signal,
        onEvent: (event, data) => {
          if (event === "status") {
            setStatusMessage(
              /review/i.test(data.message) ? "Reviewing changes…" : /coder|code/i.test(data.message) ? "Generating code…" : "Thinking…"
            );
            // image generation: show a shimmer placeholder in the chat
            if (/image/i.test(data.message)) {
              setMessages((prev) =>
                prev.some((m) => m.type === 'image-loading')
                  ? prev
                  : [...prev, { type: 'image-loading' }],
              );
            }
          } else if (event === "image") {
            pushImageMessage(setMessages, data);
          } else if (event === "zip") {
            // zip download card for the assistant reply
            setMessages((prev) => [
              ...prev,
              { type: "assistant", text: "Here is your zip file.", zip: data },
            ]);
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
            setMessages((prev) => prev.filter((m) => m.type !== 'image-loading'));
          } else if (event === "done") {
            doneData = data;
          }
        },
      });

      await typer.drain();

      // the just-sent message became savable: give it the server id so Edit works
      if (doneData?.userMessageId) {
        setMessages((prev) => {
          const index = prev.findLastIndex((m) => m.type === 'user' && !m.id);
          if (index === -1) return prev;
          return prev.map((m, i) =>
            i === index ? { ...m, id: doneData.userMessageId } : m,
          );
        });
      }

      // remove a leftover image placeholder (aborted generation)
      setMessages((prev) => prev.filter((m) => m.type !== 'image-loading'));

      setIsGenerating(false);
      setIsWritingFiles(false);
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, isStreaming: false }];
        }
        return prev;
      });
      if (isCreated) {
        navigate(`/projects/${projectId}`, { replace: true });
      }
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projectChat", projectId] });

      // auto-open the workspace after the FIRST build of a new project (desktop only)
      if (
        !hadFilesBefore &&
        doneData?.changedFiles?.length > 0 &&
        window.innerWidth >= 1024
      ) {
        setShowWorkspace(true);
      }
    } catch (error) {
      typer?.stop();
      if (error.name !== "AbortError") {
        toast.error(error.message || "Something went wrong");
      }
    } finally {
      typerRef.current = null;
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      setIsGenerating(false);
      setIsWritingFiles(false);
      // remove a leftover image placeholder (stop or error paths)
      setMessages((prev) => prev.filter((m) => m.type !== 'image-loading'));
      setMessages((prev) => {
        const last = prev[prev.length - 1];
        if (last && last.isStreaming) {
          return [...prev.slice(0, -1), { ...last, isStreaming: false }];
        }
        return prev;
      });
    }
  };

  // Stop button: ask the server to abort + trim, then stop everything locally too
  const handleStopGenerating = () => {
    agentService.stopAgent(user?.token, {
      requestId: requestIdRef.current,
      shownLength: shownLengthRef.current,
    });
    controllerRef.current?.abort();
    typerRef.current?.stop();
    setIsGenerating(false);
    setIsWritingFiles(false);
    // remove the image shimmer and end the streaming state
    setMessages((prev) => {
      const filtered = prev.filter((m) => m.type !== 'image-loading');
      const last = filtered[filtered.length - 1];
      if (last && last.isStreaming) {
        return [...filtered.slice(0, -1), { ...last, isStreaming: false }];
      }
      return filtered;
    });
  };

  // Edit-save in the project chat: re-run the command after the old output is gone
  const handleEditMessage = async (messageId, newText) => {
    if (isGenerating) return;
    const index = messages.findIndex((m) => m.id === messageId);
    if (index === -1) return;
    const edited = messages[index];

    // drop the old message and its output; the run re-adds the edited command
    setMessages((prev) => prev.slice(0, index));

    try {
      await handleSendMessage(
        newText,
        edited.mode || "Chat",
        edited.attachments || [],
        "prompt",
        "",
        messageId,
      );
    } catch {
      // the run failed and saved nothing: the refetch below restores the screen
    }

    // refetch so the screen always matches the database (also after errors)
    const targetId = currentProjectId || id;
    if (targetId && targetId !== 'new') {
      await queryClient.invalidateQueries({ queryKey: ["projectChat", targetId] });
    }
  };

  // save the code-editor changes to the project (the next build reads them from the DB)
  const handleSaveFiles = async (savedFiles) => {
    const targetId = currentProjectId || id;
    if (!targetId || targetId === 'new' || isGenerating || isSaving) return;

    setIsSaving(true);
    try {
      const project = await projectService.saveFiles(user?.token, targetId, savedFiles);
      setFiles(project.files || []);
      toast.success("Changes saved");
      queryClient.invalidateQueries({ queryKey: ["project", targetId] });
    } catch (error) {
      toast.error(error.response?.data?.message || "Could not save changes");
    } finally {
      setIsSaving(false);
    }
  };

  // image edit flow: optimistic bubbles around the image-edit API call
  const handleImageEditStart = (instruction) => {
    setMessages((prev) => [
      ...prev,
      { type: 'user', text: `Edit: ${instruction}` },
      { type: 'image-loading' },
    ]);
  };

  const handleImageEditSuccess = (data) => {
    if (data.image) pushImageMessage(setMessages, data.image);
  };

  const handleImageEditError = () => {
    setMessages((prev) => prev.filter((m) => m.type !== 'image-loading'));
  };

  const handleFixError = (errorMessage) => {
    // on mobile the workspace is an overlay -> close it so the chat stays visible
    if (window.innerWidth < 1024) setShowWorkspace(false);
    handleSendMessage(
      "The live preview shows an error. Find the cause and fix it.",
      "build",
      [],
      "fix",
      errorMessage,
    );
  };

  const fileMap = Object.fromEntries(files.map((f) => [f.path, f.content]));

  // workspace tabs + panels, shared by the desktop column and the mobile overlay
  const workspace = (
    <>
      {/* Workspace Tab Selector */}
      <div className="h-11 border-b border-line bg-card px-4 flex items-center justify-between shrink-0">
        <div className="flex rounded-xl bg-surface border border-line p-0.5">
          <button
            type="button"
            onClick={() => setActiveTab('preview')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              activeTab === 'preview'
                ? 'bg-card text-ink shadow-xs border border-line/60 font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Eye size={14} className="text-[#0099FF]" />
            <span>Preview</span>
          </button>
          <button
            type="button"
            onClick={() => setActiveTab('code')}
            className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg cursor-pointer transition-colors ${
              activeTab === 'code'
                ? 'bg-card text-ink shadow-xs border border-line/60 font-semibold'
                : 'text-muted hover:text-ink'
            }`}
          >
            <Code2 size={14} className="text-purple-500" />
            <span>Code</span>
          </button>
        </div>

        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-emerald-500" />
          <span className="text-[11px] text-muted font-mono">Sandbox Live</span>
          {/* Close the workspace and return to the chat */}
          <button
            type="button"
            onClick={() => setShowWorkspace(false)}
            aria-label="Close workspace"
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer"
          >
            <X size={16} />
          </button>
        </div>
      </div>

      {/* Workspace Content */}
      <div className={activeTab === "preview" ? "h-full" : "hidden"}>
        <PreviewPanel files={fileMap} isNew={!hasGeneratedCode} onFixError={handleFixError} />
      </div>
      <div className={activeTab === "code" ? "h-full" : "hidden"}>
        <CodePanel key={files.reduce((n, f) => n + f.content.length, 0) + files.length} files={fileMap} isNew={!hasGeneratedCode} isGenerating={isGenerating} onSave={handleSaveFiles} isSaving={isSaving} />
      </div>
    </>
  );

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
      <div className="flex-1 flex flex-col min-w-0 lg:pl-[320px] h-screen overflow-hidden">
        {/* Builder Top Bar */}
        <BuilderTopBar
          projectName={projectName}
          onRenameProject={handleRename}
          onDownloadZip={() => downloadZip(files, projectName)}
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          canPreview={hasGeneratedCode}
          isPreviewOpen={showWorkspace}
          onOpenPreview={() => setShowWorkspace(true)}
        />

        {/* Main Area: chat only by default, chat + workspace after Preview */}
        <div className={`flex-1 flex min-h-0 overflow-hidden relative ${showWorkspace ? "" : "bg-card"}`}>
          {/* Chat column: centered by default, fixed 420px beside the workspace */}
          <div
            className={`h-full min-w-0 ${
              showWorkspace
                ? "hidden lg:block lg:w-[420px] shrink-0"
                : "w-full max-w-4xl mx-auto"
            }`}
          >
            <ChatPanel
              messages={messages}
              onSendMessage={handleSendMessage}
              isGenerating={isGenerating}
              onStopGenerating={handleStopGenerating}
              activeMode="Build"
              statusMessage={statusMessage}
              isWritingFiles={isWritingFiles}
              projectId={currentProjectId}
              onImageEditStart={handleImageEditStart}
              onImageEditSuccess={handleImageEditSuccess}
              onImageEditError={handleImageEditError}
              onDownloadZip={() => downloadZip(files, projectName)}
              onEditMessage={handleEditMessage}
            />
          </div>

          {/* Workspace: full-screen overlay on mobile, right column on desktop */}
          {showWorkspace && (
            <div className="fixed inset-0 z-50 bg-surface flex flex-col lg:static lg:flex-1 lg:z-auto lg:min-w-0">
              {workspace}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
