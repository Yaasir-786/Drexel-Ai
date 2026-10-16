// Formatted CodeBlock component with copy-to-clipboard functionality
import React, { useState } from 'react';
import { Check, Copy, Code2 } from 'lucide-react';

export default function CodeBlock({ code, language = 'javascript' }) {
  const [copied, setCopied] = useState(false);

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(code);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    } catch {
      // Fallback if clipboard API is restricted
      const textarea = document.createElement('textarea');
      textarea.value = code;
      document.body.appendChild(textarea);
      textarea.select();
      document.execCommand('copy');
      document.body.removeChild(textarea);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  return (
    <div className="my-3 rounded-xl overflow-hidden border border-line bg-neutral-900 text-neutral-100 shadow-md">
      {/* CodeBlock Header */}
      <div className="h-9 px-3.5 bg-neutral-950/80 border-b border-neutral-800 flex items-center justify-between text-xs">
        <div className="flex items-center gap-2">
          <Code2 size={14} className="text-[#0099FF]" />
          <span className="font-mono text-[11px] uppercase tracking-wider text-neutral-400 font-semibold">
            {language}
          </span>
        </div>
        <button
          type="button"
          onClick={handleCopy}
          aria-label={copied ? 'Copied code' : 'Copy code to clipboard'}
          className={`flex items-center gap-1.5 px-2.5 py-1 rounded-md text-[11px] font-medium transition-colors cursor-pointer ${
            copied
              ? 'bg-emerald-500/20 text-emerald-400 border border-emerald-500/30'
              : 'hover:bg-neutral-800 text-neutral-300 hover:text-white border border-neutral-700/60'
          }`}
        >
          {copied ? (
            <>
              <Check size={13} className="text-emerald-400" />
              <span>Copied!</span>
            </>
          ) : (
            <>
              <Copy size={13} />
              <span>Copy code</span>
            </>
          )}
        </button>
      </div>

      {/* Code Canvas */}
      <pre className="p-4 font-mono text-[12px] leading-relaxed overflow-x-auto text-neutral-200 selection:bg-[#0099FF]/30">
        <code>{code}</code>
      </pre>
    </div>
  );
}
