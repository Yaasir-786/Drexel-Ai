// Builder page: full-screen IDE layout with conditional workspace (Code/Preview panels hidden until code generated)
import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { MessageSquare, Code2, Eye, Sparkles, FolderKanban } from 'lucide-react';
import BuilderTopBar from '../components/builder/BuilderTopBar';
import ChatPanel from '../components/builder/ChatPanel';
import PreviewPanel from '../components/builder/PreviewPanel';
import CodePanel from '../components/builder/CodePanel';
import VersionHistory from '../components/builder/VersionHistory';
import { getProject, saveProject, getSavedProjects } from '../utils/chatStorage';

export default function Builder() {
  const { id } = useParams();
  const navigate = useNavigate();
  const isNew = id === 'new';

  const [projectData, setProjectData] = useState(null);
  const [projectName, setProjectName] = useState(
    isNew ? 'Untitled Project' : 'E-Commerce Storefront'
  );
  const [messages, setMessages] = useState([]);
  const [files, setFiles] = useState({});
  const [hasGeneratedCode, setHasGeneratedCode] = useState(false);
  const [isGenerating, setIsGenerating] = useState(false);
  const [isHistoryOpen, setIsHistoryOpen] = useState(false);

  // Tab state: [preview | code]
  const [activeTab, setActiveTab] = useState('preview');

  // Load project on mount or id change
  useEffect(() => {
    if (isNew) {
      // New project starts a separate project-building chat
      const newProjId = 'proj-' + Date.now();
      const newProj = {
        id: newProjId,
        name: 'Untitled Project',
        hasGeneratedCode: false,
        messages: [],
        files: {},
      };
      saveProject(newProj);
      setProjectData(newProj);
      setProjectName(newProj.name);
      setMessages([]);
      setFiles({});
      setHasGeneratedCode(false);
      navigate(`/projects/${newProjId}`, { replace: true });
    } else {
      const existing = getProject(id);
      if (existing) {
        setProjectData(existing);
        setProjectName(existing.name || 'Untitled Project');
        setMessages(existing.messages || []);
        setFiles(existing.files || {});
        // Has generated code only if files exist and coder has created code
        const hasCode =
          existing.hasGeneratedCode ||
          (existing.files && Object.keys(existing.files).length > 0 &&
            existing.messages?.some((m) => m.type === 'coder'));
        setHasGeneratedCode(Boolean(hasCode));
      } else {
        // Fallback to initial projects if available
        const all = getSavedProjects();
        if (all.length > 0) {
          navigate(`/projects/${all[0].id}`, { replace: true });
        } else {
          navigate('/projects', { replace: true });
        }
      }
    }
  }, [id, isNew]);

  // Persist project changes
  const persistProject = (updatedFields) => {
    if (!projectData && !id) return;
    const targetId = projectData?.id || id;
    const updated = {
      ...(projectData || {}),
      id: targetId,
      name: projectName,
      messages,
      files,
      hasGeneratedCode,
      ...updatedFields,
    };
    setProjectData(updated);
    saveProject(updated);
  };

  const handleRename = (newName) => {
    setProjectName(newName);
    persistProject({ name: newName });
  };

  const handleSendMessage = (text, mode, attachments) => {
    const userMsg = { type: 'user', text, mode, attachments, timestamp: Date.now() };
    const updatedMessages = [...messages, userMsg];
    setMessages(updatedMessages);
    setIsGenerating(true);

    const isBuildMode = mode === 'Build';
    const isAppRequest =
      text.toLowerCase().includes('build') ||
      text.toLowerCase().includes('create') ||
      text.toLowerCase().includes('generate') ||
      text.toLowerCase().includes('app');

    // Simulate agent response
    setTimeout(() => {
      if (isBuildMode || isAppRequest) {
        // Build mode: trigger Planner and Coder, and reveal workspace!
        const plannerMsg = {
          type: 'planner',
          plan: {
            summary: `Synthesized architecture for "${text.slice(0, 45)}"`,
            steps: [
              'Scaffold core state management and routing',
              'Generate responsive layout components',
              'Integrate theme tokens and interactive controls',
            ],
            files: ['/src/App.jsx', '/src/components/Header.jsx', '/package.json'],
          },
        };

        const coderMsg = {
          type: 'coder',
          summary: 'Constructed component hierarchy with Tailwind CSS and live interactive preview.',
          files: ['/src/App.jsx', '/src/components/Header.jsx', '/src/components/ProductCard.jsx', '/package.json'],
          status: 'Code compiled and verified.',
        };

        const newFiles = {
          '/src/App.jsx': `import React from 'react';\nimport Header from './components/Header';\nimport ProductCard from './components/ProductCard';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-page text-ink">\n      <Header />\n      <main className="max-w-5xl mx-auto p-6">\n        <h1 className="text-2xl font-bold mb-4">${text.slice(0, 30)}</h1>\n        <ProductCard name="Interactive Component" price="$49.00" />\n      </main>\n    </div>\n  );\n}`,
          '/src/components/Header.jsx': `import React from 'react';\n\nexport default function Header() {\n  return (\n    <header className="h-16 border-b border-line px-6 flex items-center justify-between bg-card">\n      <div className="font-bold text-lg text-ink">App Builder</div>\n    </header>\n  );\n}`,
          '/package.json': `{\n  "name": "drexel-generated-app",\n  "version": "1.0.0"\n}`,
        };

        const allMessages = [...updatedMessages, plannerMsg, { type: 'switch' }, coderMsg];
        setMessages(allMessages);
        setFiles(newFiles);
        setHasGeneratedCode(true);
        setIsGenerating(false);

        persistProject({
          messages: allMessages,
          files: newFiles,
          hasGeneratedCode: true,
        });
      } else {
        // Chat mode (simple question or code snippet request):
        // Respond with code block in chat WITHOUT opening the Preview/Code workspace!
        const assistantMsg = {
          type: 'assistant',
          text: `Here is the requested snippet:\n\n\`\`\`jsx\n// Helper snippet for: ${text}\nexport function useExample() {\n  const [active, setActive] = React.useState(false);\n  return { active, toggle: () => setActive(prev => !prev) };\n}\n\`\`\`\n\nYou can copy this snippet directly using the Copy button above.`,
        };

        const allMessages = [...updatedMessages, assistantMsg];
        setMessages(allMessages);
        setIsGenerating(false);

        persistProject({
          messages: allMessages,
        });
      }
    }, 2000);
  };

  const handleStopGenerating = () => {
    setIsGenerating(false);
  };

  const handleClearChat = () => {
    setMessages([]);
    persistProject({ messages: [] });
  };

  return (
    <div className="h-screen flex flex-col bg-page text-ink overflow-hidden">
      {/* Builder Top Bar */}
      <BuilderTopBar
        projectName={projectName}
        onRenameProject={handleRename}
        onOpenHistory={() => setIsHistoryOpen(true)}
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
                  <CodePanel isNew={false} isGenerating={isGenerating} />
                ) : (
                  <PreviewPanel isNew={false} error={null} />
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
