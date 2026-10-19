// Builder page: full-screen IDE layout with conditional workspace (Code/Preview panels hidden until code generated)
import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { Code2, Eye } from 'lucide-react';
import { useSelector, useDispatch } from 'react-redux';
import { useQuery, useQueryClient } from '@tanstack/react-query';
import toast from 'react-hot-toast';
import BuilderTopBar from '../components/builder/BuilderTopBar';
import ChatPanel from '../components/builder/ChatPanel';
import PreviewPanel from '../components/builder/PreviewPanel';
import CodePanel from '../components/builder/CodePanel';
import VersionHistory from '../components/builder/VersionHistory';
import projectService, { mapMessages } from '../services/projectService';
import agentService from '../services/agentService';
import { getProfile } from '../features/auth/authSlice';
import { downloadZip } from '../utils/downloadFiles';

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
  const [statusMessage, setStatusMessage] = useState('');
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Tab state: [preview | code]
  const [activeTab, setActiveTab] = useState('preview');
  const controllerRef = useRef(null);

  // Fetch project details if not "new"
  const { data: project } = useQuery({
    queryKey: ["project", id],
    queryFn: () => projectService.getProject(user?.token, id),
    enabled: id !== "new" && !!user?.token && !!id,
  });

  // Fetch chat history if not "new"
  const { data: chatData } = useQuery({
    queryKey: ["chat", id],
    queryFn: () => projectService.getChat(user?.token, id),
    enabled: id !== "new" && !!user?.token && !!id,
  });

  useEffect(() => {
    setCurrentProjectId(id === 'new' ? null : id);
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
      setMessages(mapMessages(chatData));
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

  const handleSendMessage = async (text, mode, attachments = [], type = "prompt", errorLog = "") => {
    if ((!text?.trim() && type !== "fix") || isGenerating) return;

    let projectId = currentProjectId;
    let isCreated = false;

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
        attachments: [],
        timestamp: Date.now(),
      };
      setMessages((prev) => [...prev, userMsg]);

      const controller = new AbortController();
      controllerRef.current = controller;
      setIsGenerating(true);
      setStatusMessage("Analyzing your request…");

      await agentService.streamAgent({
        token: user?.token,
        body: {
          projectId,
          message: text || "",
          mode: mode ? mode.toLowerCase() : "chat",
          type,
          errorLog,
          attachments,
        },
        signal: controller.signal,
        onEvent: (event, data) => {
          if (event === "status") {
            setStatusMessage(data.message);
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
            if (isCreated) {
              navigate(`/projects/${projectId}`, { replace: true });
            }
            queryClient.invalidateQueries({ queryKey: ["project", projectId] });
            queryClient.invalidateQueries({ queryKey: ["chat", projectId] });
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

  const handleStopGenerating = () => {
    controllerRef.current?.abort();
  };

  const handleClearChat = () => {
    setMessages([]);
  };

  const handleFixError = (errorMessage) => {
    handleSendMessage(
      "The live preview shows an error. Find the cause and fix it.",
      "build",
      [],
      "fix",
      errorMessage,
    );
  };

  const fileMap = Object.fromEntries(files.map((f) => [f.path, f.content]));

  return (
    <div className="h-screen flex flex-col bg-page text-ink overflow-hidden">
      {/* Builder Top Bar */}
      <BuilderTopBar
        projectName={projectName}
        onRenameProject={handleRename}
        onOpenHistory={() => setIsHistoryOpen(true)}
        onDownloadZip={() => downloadZip(files, projectName)}
      />

      {/* Main Area */}
      <div className="flex-1 flex min-h-0 overflow-hidden relative">
        {/*
          CONDITIONAL WORKSPACE:
          - If hasGeneratedCode is false: Hide Preview & Code panels. ChatPanel takes full width!
          - If hasGeneratedCode is true: Show ChatPanel (420px on desktop) + Preview/Code workspace!
        */}
        {!hasGeneratedCode ? (
          // Full-width Chat layout when no application code is generated yet
          <div className="w-full h-full flex flex-col items-center bg-card">
            <div className="w-full max-w-4xl h-full flex flex-col">
              <ChatPanel
                messages={messages}
                onClearChat={handleClearChat}
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
                onStopGenerating={handleStopGenerating}
                activeMode="Build"
                statusMessage={statusMessage}
              />
            </div>
          </div>
        ) : (
          // Full Split IDE when code has been generated
          <div className="w-full h-full flex flex-col lg:flex-row">
            {/* Desktop Left: ChatPanel fixed 420px */}
            <div className="w-full lg:w-[420px] shrink-0 h-full">
              <ChatPanel
                messages={messages}
                onClearChat={handleClearChat}
                onSendMessage={handleSendMessage}
                isGenerating={isGenerating}
                onStopGenerating={handleStopGenerating}
                activeMode="Build"
                statusMessage={statusMessage}
              />
            </div>

            {/* Right: Code & Preview Workspace */}
            <div className="hidden lg:flex flex-1 flex-col h-full min-w-0 bg-surface">
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
                </div>
              </div>

              {/* Workspace Content */}
              <div className="flex-1 min-h-0 overflow-hidden">
                {activeTab === 'code' ? (
                  <CodePanel files={fileMap} isNew={!hasGeneratedCode} isGenerating={isGenerating} />
                ) : (
                  <PreviewPanel files={fileMap} isNew={!hasGeneratedCode} onFixError={handleFixError} />
                )}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Version History Drawer */}
      <VersionHistory
        isOpen={isHistoryOpen}
        onClose={() => setIsHistoryOpen(false)}
      />
    </div>
  );
}
