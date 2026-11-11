// ResizeHandle: vertical drag divider between the chat and the preview column (desktop only)
import React, { useRef, useState } from "react";
import { GripVertical } from "lucide-react";

export default function ResizeHandle({ onPointerDown }) {
  const handleRef = useRef(null);
  const [isDragging, setIsDragging] = useState(false);

  // pointer capture keeps the drag alive over the preview iframe
  const start = (event) => {
    event.preventDefault();
    onPointerDown?.(event);
    const handle = handleRef.current;
    if (!handle) return;
    handle.setPointerCapture(event.pointerId);
    setIsDragging(true);
    document.body.style.cursor = "col-resize";
    document.body.style.userSelect = "none";

    const end = () => {
      setIsDragging(false);
      document.body.style.cursor = "";
      document.body.style.userSelect = "";
    };
    handle.addEventListener("pointerup", end, { once: true });
    handle.addEventListener("pointercancel", end, { once: true });
  };

  return (
    <div
      ref={handleRef}
      onPointerDown={start}
      style={{ touchAction: "none" }}
      className="hidden lg:flex items-center justify-center w-[10px] shrink-0 cursor-col-resize group"
    >
      {/* visible 1px line, highlighted on hover and while dragging */}
      <div
        className={`relative h-full w-px transition-colors ${
          isDragging ? "bg-[#0099FF]" : "bg-line group-hover:bg-[#0099FF]"
        }`}
      >
        {/* grip pill in the middle of the line */}
        <div
          className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 p-1.5 rounded-full border border-line bg-card text-muted shadow-sm transition-opacity ${
            isDragging ? "opacity-100" : "opacity-0 group-hover:opacity-100"
          }`}
        >
          <GripVertical size={14} />
        </div>
      </div>
    </div>
  );
}
