// Toast notification component placed at top-right corner of the viewport
import React from 'react';
import { CheckCircle2, X } from 'lucide-react';

export default function Toast({ message, isVisible, onClose }) {
  if (!isVisible) return null;

  return (
    <div
      role="status"
      aria-live="polite"
      className="fixed top-5 right-5 z-50 flex items-center gap-3 px-4 py-3 rounded-xl border border-emerald-300 bg-emerald-50 dark:bg-emerald-950 dark:border-emerald-800 text-emerald-800 dark:text-emerald-200 shadow-lg text-sm font-medium"
    >
      <CheckCircle2 size={20} className="text-emerald-600 dark:text-emerald-400 shrink-0" />
      <span>{message}</span>
      <button
        type="button"
        onClick={onClose}
        aria-label="Close notification"
        className="ml-2 text-emerald-700 dark:text-emerald-300 hover:text-emerald-950 dark:hover:text-white cursor-pointer outline-none"
      >
        <X size={18} />
      </button>
    </div>
  );
}
