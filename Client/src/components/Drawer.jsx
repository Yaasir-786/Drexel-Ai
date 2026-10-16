// Reusable Drawer component: fixed width on desktop, full width on mobile
import React from 'react';
import { X } from 'lucide-react';

export default function Drawer({
  isOpen,
  onClose,
  title,
  description,
  children,
  position = 'right', // 'right' or 'left'
  width = 'w-full md:w-[400px]',
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 bg-black/60 flex"
      onClick={onClose}
    >
      <div
        className={`fixed top-0 bottom-0 ${
          position === 'left' ? 'left-0' : 'right-0'
        } ${width} w-full bg-card border-${
          position === 'left' ? 'r' : 'l'
        } border-line flex flex-col shadow-2xl z-50`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Drawer Header */}
        <div className="flex items-start justify-between p-5 border-b border-line">
          <div>
            {title && (
              <h2 className="text-lg font-semibold text-ink tracking-tight">
                {title}
              </h2>
            )}
            {description && (
              <p className="text-xs text-muted mt-1 leading-normal">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close drawer"
            className="text-muted hover:text-ink p-1 rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-[#0099FF]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Drawer Body */}
        <div className="flex-1 overflow-y-auto p-5">{children}</div>
      </div>
    </div>
  );
}
