// ImageLightbox: fullscreen image viewer for chat images (Claude style)
import React, { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { Pencil, Download, X, Send } from "lucide-react";

export default function ImageLightbox({ url, onClose, onDownload, onEditSend }) {
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState("");

  // lock the page scroll while the lightbox is open
  useEffect(() => {
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = previous;
    };
  }, []);

  // Esc closes the lightbox
  useEffect(() => {
    const onKeyDown = (event) => {
      if (event.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [onClose]);

  const handleSend = () => {
    const text = instruction.trim();
    if (!text) return;
    onEditSend(text);
    onClose();
  };

  const toolButton =
    "p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 cursor-pointer";

  return createPortal(
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center bg-black/70 backdrop-blur-md"
      onClick={onClose}
    >
      {/* top-right toolbar */}
      <div
        className="fixed top-4 right-4 z-[61] flex gap-2"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          type="button"
          title="Edit image"
          onClick={() => setEditing((v) => !v)}
          className={toolButton}
        >
          <Pencil size={16} />
        </button>
        <button
          type="button"
          title="Download image"
          onClick={onDownload}
          className={toolButton}
        >
          <Download size={16} />
        </button>
        <button
          type="button"
          title="Close"
          onClick={onClose}
          className={toolButton}
        >
          <X size={16} />
        </button>
      </div>

      {/* centered image */}
      <img
        src={url}
        alt="Generated image"
        draggable={false}
        className="max-w-[90vw] max-h-[85vh] object-contain rounded-2xl"
        onClick={(e) => e.stopPropagation()}
      />

      {/* edit bar at the bottom */}
      {editing && (
        <div
          className="fixed bottom-6 left-1/2 -translate-x-1/2 z-[61] flex items-center gap-2 w-[90vw] max-w-xl"
          onClick={(e) => e.stopPropagation()}
        >
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleSend();
              }
            }}
            placeholder="Describe the changes..."
            autoFocus
            className="flex-1 h-10 px-3 rounded-xl border border-line bg-card text-sm text-ink outline-none focus:ring-2 focus:ring-[#0099FF]"
          />
          <button
            type="button"
            title="Send edit"
            onClick={handleSend}
            disabled={!instruction.trim()}
            className="p-2 rounded-xl bg-[#0099FF] text-white disabled:opacity-40 cursor-pointer"
          >
            <Send size={14} />
          </button>
        </div>
      )}
    </div>,
    document.body,
  );
}
