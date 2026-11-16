// CreditLimitBanner: shows the daily limit state above the prompt box (out of limit / reset)
import React, { useEffect, useState } from "react";
import { Gauge, X } from "lucide-react";

export default function CreditLimitBanner({ resetAt, canContinue, onContinue, onClose }) {
  // the banner flips to "ready" exactly when the reset time passes
  const [ready, setReady] = useState(() => !resetAt || new Date(resetAt).getTime() <= Date.now());

  useEffect(() => {
    if (!resetAt) return undefined;
    const delay = new Date(resetAt).getTime() - Date.now();
    if (delay <= 0) {
      setReady(true);
      return undefined;
    }
    const timer = setTimeout(() => setReady(true), delay);
    return () => clearTimeout(timer);
  }, [resetAt]);

  const resetTime = resetAt
    ? new Date(resetAt).toLocaleTimeString([], { hour: "numeric", minute: "2-digit" })
    : "";

  return (
    <div className="flex items-center gap-3 px-4 py-2.5 mb-2 rounded-2xl border border-line bg-card">
      <Gauge size={16} className="text-muted shrink-0" />
      <span className="text-sm text-muted flex-1 min-w-0">
        {ready ? "Your limit has reset" : `Out of limit · Resets at ${resetTime}`}
      </span>
      {ready && canContinue && (
        <button
          type="button"
          onClick={onContinue}
          className="px-3 py-1 rounded-lg bg-primary-gradient text-white text-xs font-medium cursor-pointer"
        >
          Continue
        </button>
      )}
      <button
        type="button"
        onClick={onClose}
        aria-label="Dismiss limit notice"
        className="p-1 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer shrink-0"
      >
        <X size={16} />
      </button>
    </div>
  );
}
