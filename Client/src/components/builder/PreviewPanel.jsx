// PreviewPanel component: Sandpack live preview sandbox and error fix handler
import React from 'react';
import { SandpackProvider, SandpackPreview, useSandpack } from '@codesandbox/sandpack-react';
import { RefreshCw, Sparkles, AlertCircle } from 'lucide-react';
import Button from '../Button';

function SandpackContent({ onFixError }) {
  const { sandpack } = useSandpack();
  const errorMessage = sandpack.error?.message;

  const handleRefresh = () => {
    sandpack.dispatch({ type: 'refresh' });
  };

  return (
    <>
      {/* Browser Preview Frame */}
      <div className="flex-1 rounded-xl border border-line bg-card flex flex-col overflow-hidden shadow-xs">
        {/* Frame Browser Bar */}
        <div className="h-10 border-b border-line bg-surface/70 px-4 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2">
            <div className="w-2.5 h-2.5 rounded-full bg-red-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-amber-400" />
            <div className="w-2.5 h-2.5 rounded-full bg-emerald-400" />
            <div className="ml-3 px-3 py-1 rounded-md bg-card border border-line text-[11px] font-mono text-muted">
              https://app-preview.drexel.internal
            </div>
          </div>
          <div className="flex items-center gap-1 text-muted">
            <button
              type="button"
              onClick={handleRefresh}
              aria-label="Refresh preview"
              className="p-1 rounded hover:text-ink cursor-pointer"
              title="Refresh preview"
            >
              <RefreshCw size={14} />
            </button>
          </div>
        </div>

        {/* Live Sandpack Preview */}
        <div className="flex-1 w-full h-full relative">
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ width: '100%', height: '100%' }}
          />
        </div>
      </div>

      {/* Dynamic Error Bar */}
      {errorMessage && (
        <div className="h-12 px-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 flex items-center justify-between shrink-0">
          <div className="flex items-center gap-2 text-xs text-red-700 dark:text-red-400 font-mono truncate mr-2">
            <AlertCircle size={16} className="shrink-0" />
            <span className="truncate">Preview error: {errorMessage}</span>
          </div>
          <Button
            variant="danger"
            onClick={() => onFixError && onFixError(errorMessage.slice(0, 1000))}
            className="h-8 px-3 text-xs shrink-0"
          >
            Fix with AI
          </Button>
        </div>
      )}
    </>
  );
}

export default function PreviewPanel({ files = {}, onFixError, isNew = false }) {
  if (isNew || !files || Object.keys(files).length === 0) {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-surface text-muted">
        <Sparkles size={32} className="text-[#0099FF] mb-2" />
        <h3 className="text-base font-semibold text-ink">Your preview will appear here</h3>
        <p className="text-xs mt-1 max-w-sm">
          Describe the application you want to build in the Chat panel to generate live components.
        </p>
      </div>
    );
  }

  return (
    <div className="h-full p-4 flex flex-col gap-3 bg-surface overflow-hidden">
      <SandpackProvider
        template="vite-react"
        files={files}
        options={{
          recompileMode: 'delayed',
          recompileDelay: 500,
        }}
      >
        <SandpackContent onFixError={onFixError} />
      </SandpackProvider>
    </div>
  );
}
