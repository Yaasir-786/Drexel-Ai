// ChatPanel component: clean Claude-style conversational interface with status progression and hidden internal agent details
import React, { useState, useRef, useEffect } from 'react';
import {
  Send,
  Paperclip,
  X,
  Square,
  Sparkles,
} from 'lucide-react';
import Button from '../Button';
import Badge from '../Badge';
import ChatMessageContent from '../ChatMessageContent';
import RunStatus from '../RunStatus';

export default function ChatPanel({
  messages = [],
  onClearChat,
  onSendMessage,
  isGenerating = false,
  onStopGenerating,
  activeMode = 'Build',
  onModeChange,
  statusMessage,
  isWritingFiles = false,
}) {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState(activeMode); // 'Chat' or 'Build'
  const [attachments, setAttachments] = useState([]);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  const lastMessage = messages[messages.length - 1];
  const showStatus = isGenerating && (!lastMessage?.isStreaming || isWritingFiles);
  const label = isWritingFiles || /code|review/i.test(statusMessage) ? "Running a command" : "Thinking";

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'auto' });
  }, [messages, isGenerating]);

  const handleModeToggle = (newMode) => {
    setMode(newMode);
    if (onModeChange) onModeChange(newMode);
  };

  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    if (!files.length) return;
    const remainingSlots = 3 - attachments.length;
    const newAttachments = files.slice(0, remainingSlots).map((f) => ({
      name: f.name,
      size: (f.size / (1024 * 1024)).toFixed(1),
    }));
    setAttachments([...attachments, ...newAttachments]);
    e.target.value = '';
  };

  const handleRemoveAttachment = (index) => {
    setAttachments(attachments.filter((_, i) => i !== index));
  };

  const handleSend = (e) => {
    e.preventDefault();
    if (!inputText.trim() || isGenerating) return;
    onSendMessage(inputText.trim(), mode, attachments);
    setInputText('');
    setAttachments([]);
  };

  return (
    <div className="h-full flex flex-col bg-card border-r border-line overflow-hidden">
      {/* Header Row */}
      <div className="h-12 px-4 border-b border-line flex items-center justify-between shrink-0 bg-surface/40">
        <div className="flex items-center gap-2">
          <span className="text-xs font-semibold text-ink uppercase tracking-wider">Chat</span>
          <Badge variant={mode === 'Build' ? 'purple' : 'primary'}>{mode}</Badge>
        </div>
        <Button variant="ghost" onClick={onClearChat} className="h-8 px-2 text-xs">
          Clear chat
        </Button>
      </div>

      {/* Message List */}
      <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
        {messages.length === 0 ? (
          <div className="h-full flex flex-col items-center justify-center text-center p-6 text-muted">
            <Sparkles size={28} className="text-[#0099FF] mb-2" />
            <h3 className="text-sm font-semibold text-ink">What do you want to build?</h3>
            <p className="text-xs mt-1 max-w-xs">
              Ask questions for code snippets or describe your application to generate live components.
            </p>
          </div>
        ) : (
          messages.map((msg, index) => {
            // HIDE visible Planner section, Coder section box, and "Switched to Coder" status message
            if (msg.type === 'switch' || msg.type === 'planner') {
              return null;
            }

            // User message bubble
            if (msg.type === 'user') {
              return (
                <div
                  key={index}
                  className="self-end max-w-[85%] bg-[#0099FF] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 text-xs shadow-xs"
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.attachments?.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-white/20 flex flex-wrap gap-1">
                      {msg.attachments.map((att, i) => (
                        <span key={i} className="text-[10px] bg-white/20 px-2 py-0.5 rounded-md">
                          {att.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>
              );
            }

            // Show final AI response directly in the conversation, just like Claude
            if (msg.type === 'assistant' || msg.type === 'coder') {
              const responseText =
                msg.text ||
                (msg.summary
                  ? `${msg.summary}\n\nThe application is ready. You can test it in the Preview panel or inspect the code in the Code panel.`
                  : 'I have generated the components and configured the application according to your request.');

              return (
                <div key={index} className="self-start max-w-[95%] w-full flex gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-gradient flex items-center justify-center text-white shrink-0 mt-0.5 shadow-xs">
                    <Sparkles size={16} />
                  </div>
                  <div className="flex-1 min-w-0 pt-1 text-xs text-ink leading-relaxed">
                    <ChatMessageContent content={responseText} />
                  </div>
                </div>
              );
            }

            return null;
          })
        )}

        {/* Clean, user-friendly status message based on current processing state */}
        {showStatus && (
          <div className="self-start max-w-[95%] flex gap-3 items-center pt-1">
            <div className="w-8 h-8 flex items-center justify-center text-muted shrink-0">
              <Sparkles size={16} className="text-emerald-500" />
            </div>
            <RunStatus label={label} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area Pinned at the Bottom */}
      <div className="p-4 border-t border-line bg-card shrink-0 flex flex-col gap-2">
        <textarea
          rows={3}
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyDown={(e) => {
            if (e.key === 'Enter' && !e.shiftKey) {
              e.preventDefault();
              handleSend(e);
            }
          }}
          placeholder={
            mode === 'Chat'
              ? 'Ask any programming question or request a code snippet...'
              : 'Describe changes or application to build...'
          }
          className="w-full p-2.5 text-xs rounded-xl border border-line bg-surface text-ink outline-none focus:ring-2 focus:ring-[#0099FF] resize-none"
        />

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((att, i) => (
                <div
                  key={i}
                  className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-lg px-2 py-1 text-[11px] text-ink"
                >
                  <span className="truncate max-w-[120px]">{att.name}</span>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(i)}
                    className="text-muted hover:text-red-500 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-muted">Max 3 files, 5 MB, JPG PNG PDF</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
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
              title="Attach files (Max 3, JPG PNG PDF)"
              className="p-2 rounded-xl text-muted hover:text-ink hover:bg-surface border border-line cursor-pointer disabled:opacity-40"
            >
              <Paperclip size={18} />
            </button>

            {/* Segmented Toggle [Chat | Build] */}
            <div className="flex rounded-xl bg-surface border border-line p-0.5">
              <button
                type="button"
                onClick={() => handleModeToggle('Chat')}
                className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer ${
                  mode === 'Chat'
                    ? 'bg-card text-ink shadow-xs border border-line/60'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Chat
              </button>
              <button
                type="button"
                onClick={() => handleModeToggle('Build')}
                className={`px-3 py-1 text-xs font-medium rounded-lg cursor-pointer ${
                  mode === 'Build'
                    ? 'bg-primary-gradient text-white shadow-xs'
                    : 'text-muted hover:text-ink'
                }`}
              >
                Build
              </button>
            </div>
          </div>

          {/* Send or Stop Button */}
          {isGenerating ? (
            <Button
              variant="danger"
              onClick={onStopGenerating}
              className="h-9 px-4 text-xs"
              icon={Square}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={!inputText.trim()}
              className="h-9 px-4 text-xs"
              icon={Send}
            >
              Send
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
