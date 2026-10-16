// Modal dialog component: centered on desktop, bottom sheet on mobile
import React from 'react';
import { X } from 'lucide-react';

export default function Modal({
  isOpen,
  onClose,
  title,
  description,
  children,
  maxWidth = 'max-w-md',
}) {
  if (!isOpen) return null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      className="fixed inset-0 z-50 flex items-end md:items-center justify-center p-0 md:p-4 bg-black/60"
      onClick={onClose}
    >
      {/* Modal card - bottom sheet on mobile, centered card on desktop */}
      <div
        className={`w-full ${maxWidth} bg-card border border-line rounded-t-2xl md:rounded-2xl p-6 shadow-xl relative max-h-[90vh] overflow-y-auto`}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-4 mb-4">
          <div>
            {title && (
              <h3 className="text-lg font-semibold text-ink tracking-tight">
                {title}
              </h3>
            )}
            {description && (
              <p className="text-sm text-muted mt-1 leading-normal">
                {description}
              </p>
            )}
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close dialog"
            className="text-muted hover:text-ink p-1 rounded-lg cursor-pointer outline-none focus:ring-2 focus:ring-[#0099FF]"
          >
            <X size={20} />
          </button>
        </div>

        {/* Body content */}
        <div>{children}</div>
      </div>
    </div>
  );
}
