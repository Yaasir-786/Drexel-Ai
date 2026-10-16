// Claude-inspired Chat interface for Drexel-Ai with formatted code blocks, copy buttons, and persistent history
import React, { useState, useEffect, useRef } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import {
  Sparkles,
  Send,
  Paperclip,
  X,
  Square,
  FolderPlus,
  Coins,
  Bot,
  User,
  ArrowUpRight,
  Code2,
  Menu,
} from "lucide-react";
import Sidebar from "../components/layout/Sidebar";
import Drawer from "../components/Drawer";
import ThemeToggle from "../components/ThemeToggle";
import ChatMessageContent from "../components/ChatMessageContent";
import Button from "../components/Button";
import { useAuth } from "../context/AuthContext";
import { getSavedChats, saveChat, createNewChat } from "../utils/chatStorage";

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
  const { user } = useAuth();

  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [currentChatId, setCurrentChatId] = useState(id || null);
  const [messages, setMessages] = useState([]);
  const [inputPrompt, setInputPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const [processingStatus, setProcessingStatus] = useState('Analyzing your request…');
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Status progression during generation: Analyzing -> Thinking -> Generating code -> Reviewing changes
  useEffect(() => {
    if (!isGenerating) {
      setProcessingStatus('Analyzing your request…');
      return;
    }

    const steps = [
      { time: 0, text: 'Analyzing your request…' },
      { time: 450, text: 'Thinking…' },
      { time: 950, text: 'Generating code…' },
      { time: 1400, text: 'Reviewing changes…' },
    ];

    const timers = steps.slice(1).map(({ time, text }) =>
      setTimeout(() => {
        setProcessingStatus(text);
      }, time)
    );

    return () => {
      timers.forEach(clearTimeout);
    };
  }, [isGenerating]);

  // Load chat on mount or id change
  useEffect(() => {
    const chats = getSavedChats();
    if (id) {
      const found = chats.find((c) => c.id === id);
      if (found) {
        setCurrentChatId(found.id);
        setMessages(found.messages || []);
      } else {
        // If id not found, create new chat
        const newChat = createNewChat();
        setCurrentChatId(newChat.id);
        setMessages([]);
        navigate(`/chat/${newChat.id}`, { replace: true });
      }
    } else {
      if (chats.length > 0) {
        setCurrentChatId(chats[0].id);
        setMessages(chats[0].messages || []);
        navigate(`/chat/${chats[0].id}`, { replace: true });
      } else {
        const newChat = createNewChat();
        setCurrentChatId(newChat.id);
        setMessages([]);
        navigate(`/chat/${newChat.id}`, { replace: true });
      }
    }
  }, [id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [messages, isGenerating]);

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remainingSlots = 3 - attachments.length;
    const newAttachments = files.slice(0, remainingSlots).map((f) => ({
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1),
    }));
    setAttachments([...attachments, ...newAttachments]);
    e.target.value = "";
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSendPrompt = (textToSend) => {
    const query = textToSend || inputPrompt;
    if (!query.trim() || isGenerating) return;

    const userMessage = {
      type: "user",
      text: query.trim(),
      attachments: [...attachments],
      timestamp: Date.now(),
    };

    const newMessages = [...messages, userMessage];
    setMessages(newMessages);
    setInputPrompt("");
    setAttachments([]);
    setIsGenerating(true);

    // Save user message immediately to storage
    const currentChat = getSavedChats().find((c) => c.id === currentChatId) || {
      id: currentChatId || "chat-" + Date.now(),
      title: query.trim().slice(0, 32),
      createdAt: "Just now",
    };

    saveChat({
      ...currentChat,
      title:
        currentChat.messages?.length === 0
          ? query.trim().slice(0, 32)
          : currentChat.title,
      messages: newMessages,
    });

    // Intelligent assistant response generation
    setTimeout(() => {
      let responseText = "";
      const lower = query.toLowerCase();

      if (lower.includes("debounce") || lower.includes("use-debounce")) {
        responseText = `Here is a production-grade \`useDebounce\` hook in React with automatic cleanup:\n\n\`\`\`jsx\nimport { useState, useEffect } from 'react';\n\nexport function useDebounce(value, delay = 300) {\n  const [debouncedValue, setDebouncedValue] = useState(value);\n\n  useEffect(() => {\n    const handler = setTimeout(() => {\n      setDebouncedValue(value);\n    }, delay);\n\n    return () => {\n      clearTimeout(handler);\n    };\n  }, [value, delay]);\n\n  return debouncedValue;\n}\n\`\`\`\n\n### Usage Example:\n\n\`\`\`jsx\nimport React, { useState } from 'react';\nimport { useDebounce } from './useDebounce';\n\nexport default function SearchBar() {\n  const [text, setText] = useState('');\n  const debouncedText = useDebounce(text, 500);\n\n  return (\n    <div className="p-4">\n      <input\n        type="text"\n        value={text}\n        onChange={(e) => setText(e.target.value)}\n        placeholder="Search keywords..."\n        className="px-3 py-2 border rounded-lg w-full"\n      />\n      <p className="mt-2 text-sm text-muted">Debounced Value: **{debouncedText}**</p>\n    </div>\n  );\n}\n\`\`\``;
      } else if (lower.includes("grid") || lower.includes("tailwind")) {
        responseText = `Here is how to build a fully responsive card grid in Tailwind CSS with automatic column wrapping:\n\n\`\`\`html\n<div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-6 p-6">\n  <div className="p-5 rounded-2xl bg-card border border-line shadow-sm hover:border-[#0099FF] transition-all">\n    <h3 className="font-semibold text-sm">Feature One</h3>\n    <p className="text-xs text-muted mt-1">High-performance reactive user interface.</p>\n  </div>\n  <div className="p-5 rounded-2xl bg-card border border-line shadow-sm hover:border-[#0099FF] transition-all">\n    <h3 className="font-semibold text-sm">Feature Two</h3>\n    <p className="text-xs text-muted mt-1">Real-time state synchronization.</p>\n  </div>\n</div>\n\`\`\`\n\n- **\`grid-cols-1\`**: Single column on mobile devices\n- **\`sm:grid-cols-2\`**: 2 columns on tablets\n- **\`lg:grid-cols-4\`**: 4 columns on desktop monitors`;
      } else if (
        lower.includes("storefront") ||
        lower.includes("build") ||
        lower.includes("app")
      ) {
        responseText = `I have planned the architecture for your application:\n\n### Architecture Plan:\n- **State Management**: Cart provider with add/remove items and persistent local storage.\n- **Components**: Header with dynamic cart counter, Hero banner, and ProductGrid.\n- **Theme**: Light & Dark mode support using Tailwind tokens.\n\n\`\`\`jsx\nimport React, { useState } from 'react';\n\nexport default function StoreApp() {\n  const [cart, setCart] = useState([]);\n  \n  const addToCart = (product) => {\n    setCart((prev) => [...prev, product]);\n  };\n\n  return (\n    <div className="min-h-screen bg-page text-ink p-6">\n      <header className="flex justify-between items-center pb-4 border-b border-line">\n        <h1 className="text-xl font-bold">Acme Workspace</h1>\n        <span className="px-3 py-1 bg-[#0099FF]/10 text-[#0099FF] rounded-full text-xs font-semibold">\n          Cart ({cart.length})\n        </span>\n      </header>\n      <main className="mt-6 grid grid-cols-1 md:grid-cols-3 gap-4">\n        <div className="border border-line rounded-xl p-4 bg-card">\n          <h3 className="font-semibold text-sm">Mechanical Keypad</h3>\n          <p className="text-xs text-muted mt-1">$89.00</p>\n          <button \n            onClick={() => addToCart({ name: 'Mechanical Keypad', price: 89 })}\n            className="mt-3 w-full py-1.5 bg-[#0099FF] text-white rounded-lg text-xs font-medium cursor-pointer"\n          >\n            Add to Cart\n          </button>\n        </div>\n      </main>\n    </div>\n  );\n}\n\`\`\`\n\n> To generate the full multi-file project with live Preview and Code workspace tabs, you can open **Projects > New Project**!`;
      } else {
        responseText = `Here is a clean solution for your request:\n\n\`\`\`javascript\n// Function implementation\nexport function processData(input) {\n  if (!input) return null;\n  return {\n    processedAt: new Date().toISOString(),\n    data: input,\n    status: 'success'\n  };\n}\n\`\`\`\n\nYou can import and use this helper across your React components. Let me know if you would like me to expand this or integrate it into a project!`;
      }

      const assistantMessage = {
        type: "assistant",
        text: responseText,
        timestamp: Date.now(),
      };

      const finalMessages = [...newMessages, assistantMessage];
      setMessages(finalMessages);
      setIsGenerating(false);

      saveChat({
        ...currentChat,
        title:
          currentChat.messages?.length === 0
            ? query.trim().slice(0, 32)
            : currentChat.title,
        messages: finalMessages,
      });
    }, 1750);
  };

  return (
    <div className="min-h-screen bg-page text-ink flex">
      {/* Desktop Fixed Left Sidebar */}
      <div className="hidden lg:block fixed inset-y-0 left-0 w-[264px] z-40">
        <Sidebar />
      </div>

      {/* Mobile Drawer Sidebar */}
      <Drawer
        isOpen={isMobileMenuOpen}
        onClose={() => setIsMobileMenuOpen(false)}
        position="left"
        width="w-[280px]">
        <div className="h-full -m-5">
          <Sidebar onItemClick={() => setIsMobileMenuOpen(false)} />
        </div>
      </Drawer>

      {/* Main Chat Canvas (offset by sidebar width on desktop) */}
      <div className="flex-1 lg:pl-[264px] flex flex-col min-w-0 h-screen overflow-hidden">
        {/* Chat Top Bar */}
        <header className="h-16 border-b border-line bg-card/80 px-4 md:px-8 flex items-center justify-between sticky top-0 z-30 backdrop-blur-sm shrink-0">
          <div className="flex items-center gap-3">
            <button
              type="button"
              onClick={() => setIsMobileMenuOpen(true)}
              aria-label="Open sidebar"
              className="lg:hidden p-2 rounded-xl text-muted hover:text-ink hover:bg-surface border border-line cursor-pointer">
              <Menu size={20} />
            </button>

            {/* Model Pill / Header Indicator */}
            <div className="flex items-center gap-2">
              <div className="w-7 h-7 rounded-lg bg-primary-gradient flex items-center justify-center text-white shadow-xs">
                <Sparkles size={14} />
              </div>
              <div className="flex flex-col">
                <div className="flex items-center gap-2">
                  <span className="font-bold text-sm text-ink tracking-tight">
                    Drexel AI
                  </span>
                </div>
                <span className="text-[10px] text-muted hidden sm:block">
                  General Coding & App Architecture
                </span>
              </div>
            </div>
          </div>

          {/* Right Header: Credits pill, Theme toggle, Avatar */}
          <div className="flex items-center gap-3">
            <div className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-medium text-ink whitespace-nowrap">
              <Coins size={14} className="text-[#0099FF] shrink-0" />
              <span>{user?.credits || "178.6"} credits</span>
            </div>

            <ThemeToggle />

            <Link
              to="/settings"
              className="w-9 h-9 rounded-xl bg-primary-gradient flex items-center justify-center text-white text-xs font-bold select-none shadow-sm cursor-pointer"
              title={user?.name || "Jane Doe"}>
              {user?.initials || "JD"}
            </Link>
          </div>
        </header>

        {/* Scrollable Chat Area */}
        <div className="flex-1 overflow-y-auto px-4 md:px-8 py-6 flex flex-col items-center">
          <div className="w-full max-w-[800px] flex-1 flex flex-col justify-between">
            {messages.length === 0 ? (
              // Claude-inspired spacious welcome and suggestion cards
              <div className="my-auto py-12 flex flex-col items-center text-center gap-6">
                <div className="w-16 h-16 rounded-2xl bg-primary-gradient flex items-center justify-center text-white shadow-lg shadow-blue-500/20">
                  <Sparkles size={32} />
                </div>

                <div className="space-y-2 max-w-lg">
                  <h1 className="text-3xl font-bold tracking-tight text-ink">
                    Welcome back,{" "}
                    {user?.name ? user.name.split(" ")[0] : "Developer"}
                  </h1>
                  <p className="text-sm text-muted">
                    Ask any programming question, get formatted code snippets
                    with one-click copy, or discuss project architecture.
                  </p>
                </div>

                {/* Prompt suggestion cards */}
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 w-full max-w-2xl mt-4 text-left">
                  {PROMPT_SUGGESTIONS.map((item, idx) => (
                    <button
                      key={idx}
                      type="button"
                      onClick={() => handleSendPrompt(item.prompt)}
                      className="p-4 rounded-2xl border border-line bg-card hover:border-[#0099FF] hover:bg-surface transition-all text-left group cursor-pointer shadow-xs">
                      <div className="flex items-center justify-between text-xs font-semibold text-ink group-hover:text-[#0099FF]">
                        <span>{item.title}</span>
                        <ArrowUpRight
                          size={14}
                          className="text-muted group-hover:text-[#0099FF] group-hover:translate-x-0.5 group-hover:-translate-y-0.5 transition-transform"
                        />
                      </div>
                      <p className="text-[11px] text-muted mt-1">
                        {item.subtitle}
                      </p>
                    </button>
                  ))}
                </div>
              </div>
            ) : (
              // Message Stream
              <div className="flex flex-col gap-6 pb-6">
                {messages.map((msg, index) => (
                  <div key={index} className="flex flex-col gap-2">
                    {msg.type === "user" ? (
                      <div className="self-end max-w-[85%] flex flex-col items-end">
                        <div className="bg-[#0099FF] text-white rounded-2xl rounded-tr-xs px-5 py-3 text-xs leading-relaxed shadow-sm">
                          <p className="whitespace-pre-wrap">{msg.text}</p>
                          {msg.attachments?.length > 0 && (
                            <div className="mt-2 pt-2 border-t border-white/20 flex flex-wrap gap-1.5">
                              {msg.attachments.map((att, i) => (
                                <span
                                  key={i}
                                  className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md">
                                  {att.name}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ) : (
                      <div className="self-start max-w-[95%] w-full flex gap-3">
                        <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                          <Sparkles size={16} />
                        </div>
                        <div className="flex-1 bg-card border border-line rounded-2xl p-5 shadow-xs">
                          <ChatMessageContent content={msg.text} />
                        </div>
                      </div>
                    )}
                  </div>
                ))}

                {isGenerating && (
                  <div className="self-start max-w-[95%] flex gap-3 items-center">
                    <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center text-white shrink-0 shadow-xs">
                      <Sparkles size={16} className="animate-spin" />
                    </div>
                    <div className="px-4 py-2 rounded-2xl bg-surface border border-line text-xs text-muted flex items-center gap-2.5 shadow-xs">
                      <span className="w-2 h-2 rounded-full bg-[#0099FF] animate-pulse" />
                      <span className="font-medium text-ink">{processingStatus}</span>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </div>
            )}
          </div>
        </div>

        {/* Floating Claude-inspired Prompt Input Container */}
        <div className="p-4 md:px-8 md:pb-6 bg-page shrink-0 flex justify-center">
          <div className="w-full max-w-[800px] bg-card border border-line rounded-2xl p-3 shadow-md focus-within:ring-2 focus-within:ring-[#0099FF]/40 focus-within:border-[#0099FF] transition-all">
            {/* Attachment chips */}
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
                  onClick={() => setIsGenerating(false)}
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
    </div>
  );
}
