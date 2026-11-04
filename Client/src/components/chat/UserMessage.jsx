// UserMessage.jsx: user bubble with Claude-style hover actions (time ago, Edit, Copy)
import { useEffect, useRef, useState } from "react";
import { Check, Copy, FileArchive, Paperclip, Pencil } from "lucide-react";

// relative time for the hover row ("3 minutes ago")
const timeAgo = (value) => {
  const seconds = Math.max(
    0,
    Math.floor((Date.now() - new Date(value || Date.now()).getTime()) / 1000),
  );
  if (seconds < 60) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  return `${days} day${days === 1 ? "" : "s"} ago`;
};

// clipboard copy with a fallback for non-secure contexts
const copyText = async (text) => {
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    const area = document.createElement("textarea");
    area.value = text;
    area.style.position = "fixed";
    area.style.opacity = "0";
    document.body.appendChild(area);
    area.select();
    document.execCommand("copy");
    document.body.removeChild(area);
  }
};

// the bubble look of the two places that use this component
const variants = {
  page: {
    bubble:
      "font-serif rounded-2xl p-4 text-base shadow-xs bg-gradient-to-r from-[#0099FF] to-[#6D5DFC] text-white whitespace-pre-wrap",
    textIsParagraph: false,
    chipsAbove: true,
    chips: "flex flex-wrap gap-1.5 mb-2 pb-2 border-b border-white/20",
    chip: "inline-flex items-center gap-1 bg-white/20 px-2 py-0.5 rounded text-[10px] text-white font-medium",
    area: "font-serif text-base",
  },
  panel: {
    bubble:
      "bg-[#0099FF] text-white rounded-2xl rounded-tr-xs px-4 py-2.5 font-serif text-sm shadow-xs",
    textIsParagraph: true,
    chipsAbove: false,
    chips: "mt-2 pt-1.5 border-t border-white/20 flex flex-wrap gap-1",
    chip: "inline-flex items-center gap-1 text-[10px] bg-white/20 px-2 py-0.5 rounded-md",
    area: "font-serif text-sm",
  },
};

export default function UserMessage({
  msg,
  variant = "page",
  isGenerating = false,
  onSave,
}) {
  const styles = variants[variant] || variants.page;
  const [isEditing, setIsEditing] = useState(false);
  const [draft, setDraft] = useState("");
  const [isCopied, setIsCopied] = useState(false);
  const areaRef = useRef(null);

  // edit only for saved messages, never for the auto "Fix preview error" command
  const canEdit = Boolean(msg.id) && msg.text !== "Fix preview error";

  // the edit box opens and the draft changes -> keep the textarea grown
  useEffect(() => {
    const area = areaRef.current;
    if (!isEditing || !area) return;
    area.style.height = "auto";
    area.style.height = `${area.scrollHeight}px`;
    area.focus();
  }, [isEditing, draft]);

  // copy: the icon turns into a check for a moment
  const handleCopy = async () => {
    await copyText(msg.text || "");
    setIsCopied(true);
    setTimeout(() => setIsCopied(false), 1500);
  };

  const startEdit = () => {
    setDraft(msg.text || "");
    setIsEditing(true);
  };

  // save only when the text really changed
  const canSave =
    Boolean(draft.trim()) && draft.trim() !== (msg.text || "").trim();
  const saveEdit = () => {
    if (!canSave) return;
    setIsEditing(false);
    onSave(draft.trim());
  };

  const chips =
    (msg.attachments || []).length > 0 && (
      <div className={styles.chips}>
        {msg.attachments.map((att, i) => (
          <span key={i} className={styles.chip}>
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
    );

  // edit mode: the bubble becomes an auto-growing textarea with Cancel/Save
  if (isEditing) {
    return (
      <div className="flex flex-col items-end w-full">
        <div className={`w-full ${styles.bubble}`}>
          {styles.chipsAbove && chips}
          <textarea
            ref={areaRef}
            value={draft}
            onChange={(e) => setDraft(e.target.value)}
            onKeyDown={(e) => {
              // Ctrl/Cmd+Enter saves, Esc cancels
              if (e.key === "Enter" && (e.ctrlKey || e.metaKey)) {
                e.preventDefault();
                saveEdit();
              } else if (e.key === "Escape") {
                setIsEditing(false);
              }
            }}
            className={`w-full bg-transparent text-white resize-none outline-none ${styles.area}`}
            rows={Math.min(10, Math.max(1, draft.split("\n").length))}
          />
          {!styles.chipsAbove && chips}
          <div className="flex justify-end gap-2 mt-2">
            <button
              type="button"
              onClick={() => setIsEditing(false)}
              className="px-3 py-1 rounded-lg text-xs bg-white/20 text-white hover:bg-white/30 cursor-pointer">
              Cancel
            </button>
            <button
              type="button"
              onClick={saveEdit}
              disabled={!canSave}
              className="px-3 py-1 rounded-lg text-xs bg-white text-[#0099FF] hover:bg-white/90 disabled:opacity-50 disabled:cursor-not-allowed cursor-pointer">
              Save
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="group flex w-full flex-col items-end">
      {/* natural bubble width, capped like before, pushed to the right edge */}
      <div className={`max-w-[85%] ${styles.bubble}`}>
        {styles.chipsAbove && chips}
        {styles.textIsParagraph ? (
          <p className="whitespace-pre-wrap">{msg.text}</p>
        ) : (
          msg.text
        )}
        {!styles.chipsAbove && chips}
      </div>

      {/* actions under the bubble: visible on hover, always on touch/mobile */}
      <div className="flex items-center gap-1 mt-1 transition-opacity opacity-100 [@media(hover:hover)]:opacity-0 [@media(hover:hover)]:group-hover:opacity-100">
        <span className="text-[11px] text-muted mr-1">
          {timeAgo(msg.createdAt)}
        </span>
        {canEdit && !isGenerating && (
          <button
            type="button"
            onClick={startEdit}
            title="Edit"
            className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface cursor-pointer">
            <Pencil size={13} />
          </button>
        )}
        <button
          type="button"
          onClick={handleCopy}
          title="Copy"
          className="p-1.5 rounded-md text-muted hover:text-ink hover:bg-surface cursor-pointer">
          {isCopied ? (
            <Check size={13} className="text-emerald-500" />
          ) : (
            <Copy size={13} />
          )}
        </button>
      </div>
    </div>
  );
}
