// ChatPanel component: clean Claude-style conversational interface with status progression and hidden internal agent details
import React, { useState, useRef, useEffect } from 'react';
import { useSelector } from 'react-redux';
import toast from 'react-hot-toast';
import {
  Send,
  Paperclip,
  X,
  Square,
  FileText,
  FileArchive,
} from 'lucide-react';
import Button from '../Button';
import Badge from '../Badge';
import ChatMessageContent from '../ChatMessageContent';
import RunStatus from '../RunStatus';
import PromptGlow from '../PromptGlow';
import Greeting from '../Greeting';
import ChatImage from '../chat/ChatImage';
import uploadService from '../../services/uploadService';

// unique id for attachment chips
const newId = () => Date.now() + '-' + Math.random().toString(36).slice(2, 8);

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
  projectId = null,
  onImageEditStart,
  onImageEditSuccess,
  onImageEditError,
}) {
  const [inputText, setInputText] = useState('');
  const [mode, setMode] = useState(activeMode); // 'Chat' or 'Build'
  const [attachments, setAttachments] = useState([]);
  const [isUploading, setIsUploading] = useState(false);
  const { user } = useSelector((state) => state.auth);
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

  // validate and keep the real File objects for the upload (zips index right away)
  const handleFileSelect = (e) => {
    const files = Array.from(e.target.files || []);
    e.target.value = '';
    if (!files.length) return;

    const allowed = ['image/jpeg', 'image/jpg', 'image/png', 'application/pdf'];
    const next = [...attachments];

    for (const file of files) {
      if (next.length >= 3) {
        toast.error('You can attach at most 3 files');
        break;
      }
      const isZip =
        file.type === 'application/zip' ||
        file.type === 'application/x-zip-compressed' ||
        file.name.toLowerCase().endsWith('.zip');
      if (!allowed.includes(file.type) && !isZip) {
        toast.error(`${file.name}: only JPG, PNG, PDF and ZIP files are allowed`);
        continue;
      }
      if (file.size > (isZip ? 20 : 5) * 1024 * 1024) {
        toast.error(`${file.name} is larger than ${isZip ? '20 MB' : '5 MB'}`);
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
          preview: file.type.startsWith('image/') ? URL.createObjectURL(file) : null,
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
        .then((uploaded) => {
          setAttachments((prev) =>
            prev.map((att) =>
              att.id === entry.id
                ? { ...att, indexing: false, uploaded: uploaded[0], zipFile: null }
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

  // block sending while a zip is still being indexed
  const isIndexing = attachments.some((att) => att.isZip && att.indexing);

  // upload the attached files first, then hand the stored objects to the builder
  const handleSend = async (e) => {
    e.preventDefault();
    if (
      (!inputText.trim() && attachments.length === 0) ||
      isGenerating ||
      isUploading ||
      isIndexing
    )
      return;

    // zips are already indexed, images and PDFs upload now
    let uploaded = attachments
      .filter((att) => att.isZip && att.uploaded)
      .map((att) => ({
        documentId: att.uploaded.documentId,
        name: att.uploaded.name,
        type: 'zip',
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
        toast.error('File upload failed. Please try again.');
        return;
      } finally {
        setIsUploading(false);
      }
    }

    onSendMessage(inputText.trim(), mode, uploaded);
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
            <div className="relative -top-2.5 w-14 h-14 mb-2 shrink-0">
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
          messages.map((msg, index) => {
            // HIDE visible Planner section, Coder section box, and "Switched to Coder" status message
            if (msg.type === 'switch' || msg.type === 'planner') {
              return null;
            }

            // Shimmer placeholder while an image is being generated
            if (msg.type === 'image-loading') {
              return (
                <div key={index} className="self-start flex gap-3 items-start">
                  <img src="/drexel-logo.svg" alt="Drexel-Ai" draggable={false} className="w-9 h-9 shrink-0" />
                  <div className="w-48 h-48 rounded-2xl border border-line bg-surface animate-pulse" />
                </div>
              );
            }

            // User message bubble
            if (msg.type === 'user') {
              return (
                <div
                  key={index}
                  className="self-end max-w-[85%] bg-[#0099FF] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 font-serif text-sm shadow-xs"
                >
                  <p className="whitespace-pre-wrap">{msg.text}</p>
                  {msg.attachments?.length > 0 && (
                    <div className="mt-2 pt-1.5 border-t border-white/20 flex flex-wrap gap-1">
                      {msg.attachments.map((att, i) => (
                        <span key={i} className="inline-flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-md">
                          {att.type === 'image' ? (
                            <img
                              src={att.url}
                              alt={att.name}
                              className="w-4 h-4 rounded object-cover shrink-0"
                            />
                          ) : att.type === 'zip' ? (
                            <FileArchive size={10} />
                          ) : (
                            <Paperclip size={10} />
                          )}
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
                  <img src="/drexel-logo.svg" alt="Drexel-Ai" draggable={false} className="w-9 h-9 shrink-0" />
                  <div className="flex-1 min-w-0 pt-1 font-serif text-sm text-ink leading-relaxed">
                    <ChatMessageContent content={responseText} />
                    {/* Generated images under the assistant text */}
                    {msg.images?.length > 0 && (
                      <div className="flex flex-col gap-2">
                        {msg.images.map((img, i) => (
                          <ChatImage
                            key={i}
                            url={img.url}
                            projectId={projectId}
                            onEditStart={onImageEditStart}
                            onEditSuccess={onImageEditSuccess}
                            onEditError={onImageEditError}
                          />
                        ))}
                      </div>
                    )}
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
            <img src="/drexel-logo.svg" alt="Drexel-Ai" draggable={false} className="w-9 h-9 shrink-0" />
            <RunStatus label={label} />
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      {/* Input Area Pinned at the Bottom */}
      <div className="px-4 pt-4 pb-5 border-t border-line bg-card shrink-0 flex flex-col gap-2">
        <PromptGlow rounded="xl" active={isGenerating} className="prompt-glow--tight">
        <textarea
          rows={2}
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
          className="w-full p-2.5 font-serif text-sm rounded-xl border border-line bg-surface text-ink outline-none focus:ring-2 focus:ring-[#0099FF] resize-none"
        />
        </PromptGlow>

        {/* Attachments */}
        {attachments.length > 0 && (
          <div className="flex flex-col gap-1">
            <div className="flex flex-wrap gap-1.5">
              {attachments.map((att) => (
                <div
                  key={att.id}
                  className="inline-flex items-center gap-1.5 bg-surface border border-line rounded-lg px-2 py-1 text-[11px] text-ink"
                >
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
                    <span className="truncate max-w-[120px]">{att.name}</span>
                    {att.isZip && (
                      <span className="text-[9px] text-muted">
                        {att.indexing
                          ? 'Indexing...'
                          : `Indexed ${att.uploaded?.fileCount ?? 0} files`}
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => handleRemoveAttachment(att.id)}
                    className="text-muted hover:text-red-500 cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                </div>
              ))}
            </div>
            <span className="text-[10px] text-muted">Max 3 files. JPG PNG PDF ZIP</span>
          </div>
        )}

        {/* Controls */}
        <div className="flex items-center justify-between gap-2 pt-1">
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
              className="h-9! px-4 text-xs"
              icon={Square}
            >
              Stop
            </Button>
          ) : (
            <Button
              variant="primary"
              onClick={handleSend}
              disabled={
                (!inputText.trim() && attachments.length === 0) ||
                isUploading ||
                isIndexing
              }
              className="h-9! px-4 text-xs"
              icon={Send}
            >
              {isUploading ? 'Uploading...' : 'Send'}
            </Button>
          )}
        </div>
      </div>
    </div>
  );
}
