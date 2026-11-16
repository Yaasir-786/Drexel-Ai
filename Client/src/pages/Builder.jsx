// Builder page: sidebar + chat by default, Preview/Code workspace opens on demand
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Code2, Eye, X, FileArchive, FileText } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import BuilderTopBar from '../components/builder/BuilderTopBar';
import ChatPanel from '../components/builder/ChatPanel';
import PreviewPanel from '../components/builder/PreviewPanel';
import CodePanel from '../components/builder/CodePanel';
import Sidebar from '../components/layout/Sidebar';
import ResizeHandle from '../components/ResizeHandle';
import usePanelResize from '../hooks/usePanelResize';
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
  // credit limit banner above the prompt box (null = hidden)
  const [limitNotice, setLimitNotice] = useState(null);

  // Preview/Code workspace: closed by default, opened only from the Preview button
  const [showWorkspace, setShowWorkspace] = useState(false);
  // resizable preview column (ratio 1 = full width)
  const {
    containerRef,
    ratio: previewRatio,
    previewStyle,
    onPointerDown: onResizeStart,
  } = usePanelResize({ open: showWorkspace });

  // Tab state: [preview | code]
  const [activeTab, setActiveTab] = useState('preview');
  // zip view in the workspace (read-only code view of the zip files)
  const [zipView, setZipView] = useState(null);
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
    setZipView(null);
    // restore the limit notice saved for this project (bad JSON is ignored)
    if (id && id !== 'new') {
      try {
        setLimitNotice(JSON.parse(localStorage.getItem(`drexel-limit-${id}`) || 'null'));
      } catch {
        setLimitNotice(null);
      }
    } else {
      setLimitNotice(null);
    }
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

  // open a delivered zip in the workspace when its files exist in the project
  const openZip = (zip) => {
    if (!zip) return;
    const has = zip.paths?.length
      ? files.some((file) => zip.paths.includes(file.path))
      : files.length > 0;
    if (!has) return;
    setZipView(zip);
    setActiveTab('code');
    setShowWorkspace(true);
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

    // a new send always clears the limit notice
    setLimitNotice(null);
    const noticeId = currentProjectId || id;
    if (noticeId) localStorage.removeItem(`drexel-limit-${noticeId}`);

    let projectId = currentProjectId;
    let isCreated = false;
    let typer;
    // file paths written in this run (covers the first build of a new project)
    const writtenPaths = new Set();

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
            // image GENERATION: shimmer box in the chat (reading an image has no box)
            if (/image/i.test(data.message) && /creating|generating/i.test(data.message)) {
              setMessages((prev) =>
                prev.some((m) => m.type === 'image-loading')
                  ? prev
                  : [...prev, { type: 'image-loading' }],
              );
            }
          } else if (event === "image") {
            pushImageMessage(setMessages, data);
          } else if (event === "zip") {
            // zip download card for the assistant reply; auto-opens on desktop
            setMessages((prev) => [
              ...prev,
              { type: "assistant", text: "Here is your zip file.", zip: data },
            ]);
            if (window.innerWidth >= 1024) openZip(data);
          } else if (event === "file_start") {
            setIsWritingFiles(true);
          } else if (event === "file_end") {
            writtenPaths.add(data.path);
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
          } else if (event === "warning") {
            toast(data.message);
          } else if (event === "done") {
            doneData = data;
            // the limit stopped the run in the middle: banner with a Continue button
            if (data.limitReached) {
              const notice = { resetAt: data.resetAt, canContinue: true, mode: data.mode };
              setLimitNotice(notice);
              localStorage.setItem(`drexel-limit-${projectId}`, JSON.stringify(notice));
            }
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
      await queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projectChat", projectId] });

      // auto-open the workspace after any build/edit that changed files and has
      // a preview (same rule as getPreviewType), even if it was closed before
      const allPaths = new Set([...files.map((f) => f.path), ...writtenPaths]);
      const hasPreview =
        allPaths.has("/src/main.jsx") || allPaths.has("/index.html");
      if (doneData?.changedFiles?.length > 0 && hasPreview && window.innerWidth >= 1024) {
        setZipView(null);
        setShowWorkspace(true);
      }
    } catch (error) {
      typer?.stop();
      if ((error.status === 402 || error.status === 429) && /credit/i.test(error.message)) {
        // the credit limit shows as a banner, not a toast
        setLimitNotice({
          resetAt: error.resetAt,
          canContinue: false,
          mode: mode ? mode.toLowerCase() : 'chat',
        });
      } else if (error.name !== "AbortError") {
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

  // Continue after the limit reset: same project, run goes on from where it stopped
  const handleContinueRun = () => {
    const text =
      limitNotice?.mode === 'build'
        ? 'Continue the previous build from where it stopped. Do not rewrite files that are already complete; finish the missing files and the cut-off parts.'
        : 'Continue exactly from where you stopped. Do not repeat anything you already wrote.';
    handleSendMessage(text, limitNotice?.mode === 'build' ? 'Build' : 'Chat', [], 'prompt');
  };

  // X on the banner: hide it and drop the saved notice
  const handleDismissLimitNotice = () => {
    setLimitNotice(null);
    const targetId = currentProjectId || id;
    if (targetId) localStorage.removeItem(`drexel-limit-${targetId}`);
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

  // zip view files: only the ones named by the zip (all files without paths)
  const zipFiles = zipView?.paths?.length
    ? files.filter((f) => zipView.paths.includes(f.path))
    : files;
  const zipMap = Object.fromEntries(zipFiles.map((f) => [f.path, f.content]));

  // workspace tabs + panels, shared by the desktop column and the mobile overlay
  const workspace = (
    <>
      {/* Workspace Tab Selector, replaced by the zip header in the zip view */}
      {zipView ? (
        <div className="h-11 border-b border-line bg-card px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 min-w-0">
            {zipView.kind === "files" ? (
              <FileText size={16} className="text-[#0099FF] shrink-0" />
            ) : (
              <FileArchive size={16} className="text-[#0099FF] shrink-0" />
            )}
            <span className="text-xs font-mono font-semibold text-ink truncate">
              {zipView.kind === "files" ? zipView.name : `${zipView.name}.zip`}
            </span>
            <span className="text-xs text-muted shrink-0">
              {zipFiles.length} {zipFiles.length === 1 ? "file" : "files"}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={() => {
                setShowWorkspace(false);
                setZipView(null);
              }}
              aria-label="Close workspace"
              className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer"
            >
              <X size={16} />
            </button>
          </div>
        </div>
      ) : (
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
      )}

      {/* Workspace Content */}
      {zipView ? (
        // zip view: read-only code viewer only, never the preview
        <div className="flex-1 min-h-0">
          <CodePanel readOnly key={`zip-${zipView.name}`} files={zipMap} />
        </div>
      ) : (
        <>
          <div className={activeTab === "preview" ? "flex-1 min-h-0" : "hidden"}>
            <PreviewPanel files={fileMap} isNew={!hasGeneratedCode} ratio={previewRatio} onFixError={handleFixError} />
          </div>
          <div className={activeTab === "code" ? "flex-1 min-h-0" : "hidden"}>
            <CodePanel key={files.reduce((n, f) => n + f.content.length, 0) + files.length} files={fileMap} isNew={!hasGeneratedCode} isGenerating={isGenerating} onSave={handleSaveFiles} isSaving={isSaving} />
          </div>
        </>
      )}
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
          onOpenMobileMenu={() => setIsMobileMenuOpen(true)}
          canPreview={hasGeneratedCode}
          isPreviewOpen={showWorkspace}
          onOpenPreview={() => {
            setZipView(null);
            setShowWorkspace(true);
          }}
        />

        {/* Main Area: chat only by default, chat + workspace after Preview */}
        <div
          ref={containerRef}
          className={`flex-1 flex min-h-0 overflow-clip relative ${showWorkspace ? "" : "bg-card"}`}
        >
          {/* Chat column: centered by default, fluid with a minimum beside the workspace */}
          <div
            className={`h-full min-w-0 ${
              showWorkspace
                ? "hidden lg:block lg:flex-1 lg:min-w-[420px]"
                : "w-full max-w-4xl mx-auto"
            }`}
          >
            <ChatPanel              messages={messages}
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
              onDownloadZip={(zip) =>
                downloadZip(
                  zip?.paths?.length
                    ? files.filter((f) => zip.paths.includes(f.path))
                    : files,
                  zip?.name || projectName,
                )
              }
              onEditMessage={handleEditMessage}
              onOpenZip={openZip}
              limitNotice={limitNotice}
              onContinue={handleContinueRun}
              onDismissLimitNotice={handleDismissLimitNotice}
            />
          </div>

          {/* Drag handle between chat and workspace (desktop only) */}
          {showWorkspace && (
            <ResizeHandle onPointerDown={onResizeStart} />
          )}

          {/* Workspace: full-screen overlay on mobile, resizable right column on desktop */}
          {showWorkspace && (
            <div
              style={previewStyle}
              className="fixed inset-0 z-50 bg-surface flex flex-col lg:static lg:z-auto lg:w-[var(--panel-w)] lg:shrink-0 lg:min-w-0 overflow-hidden"
            >
              {workspace}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
