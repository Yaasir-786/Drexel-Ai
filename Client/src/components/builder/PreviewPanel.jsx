// PreviewPanel component: Sandpack live preview sandbox and error fix handler
import React, { useMemo } from 'react';
import { SandpackProvider, SandpackPreview, useSandpack } from '@codesandbox/sandpack-react';
import { Sparkles, AlertCircle } from 'lucide-react';
import Button from '../Button';

const buildPreviewSetup = (files) => {
  let pkg = {};
  try { pkg = JSON.parse(files["/package.json"] || "{}"); } catch { pkg = {}; }
  const dependencies = { ...(pkg.dependencies || {}) };
  ["react", "react-dom", "vite", "@vitejs/plugin-react"].forEach((name) => delete dependencies[name]);
  const { "/package.json": removedPackage, "/vite.config.js": removedConfig, "/index.html": html = "", ...rest } = files;
  const publicHtml = html.replace(/<script[^>]*type=["']module["'][^>]*>\s*<\/script>/gi, "");
  return { files: { ...rest, ...(publicHtml && { "/public/index.html": publicHtml }) }, dependencies };
};

function SandpackContent({ onFixError }) {
  const { sandpack } = useSandpack();
  const errorMessage = sandpack.error?.message;

  // Status-based overlay content
  const status = sandpack.status;

  // Top center loading/text messages (absolute positioned, no background)
  const statusOverlay = (
    <div className="absolute top-0 left-0 right-0 z-10 pointer-events-none p-2">
      {status === "initial" || status === "idle" || status === "running" && (
        <span className="text-xs text-muted">Loading preview…</span>
      )}
    </div>
  );

  // Timeout box - absolute centered
  const timeoutBox = sandpack.status === "timeout" && (
    <div className="absolute inset-0 z-10 flex items-center justify-center bg-surface text-ink p-6 text-sm">
      <p className="text-center text-sm">
        Preview could not start. The Sandpack bundler (CodeSandbox) is not reachable from your network. Check your internet, turn off VPN/ad-blocker or try another network, then press Refresh.
      </p>
      <Button
        variant="secondary"
        onClick={() => sandpack.dispatch?.({ type: "refresh" })}
        className="mt-3 px-4 py-1.5 text-xs"
      >
        Refresh
      </Button>
    </div>
  );

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 min-h-0">
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

      {statusOverlay}
      {timeoutBox}

      {/* Dynamic Error Bar */}
      {errorMessage && (
        <div className="h-12 px-4 rounded-xl border border-red-200 dark:border-red-900 bg-red-50 dark:bg-red-950/40 flex items-center justify-between shrink-0 m-2">
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
    </div>
  );
}

export default function PreviewPanel({ files = {}, onFixError, isNew = false }) {
  const setup = useMemo(() => buildPreviewSetup(files), [files]);

  if (isNew || !files || !files["/src/main.jsx"]) {
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
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      <SandpackProvider
        template="react"
        files={setup.files}
        customSetup={{ entry: "/src/main.jsx", dependencies: setup.dependencies }}
        options={{ recompileMode: "delayed", recompileDelay: 500, bundlerTimeOut: 30000 }}
        style={{ height: "100%", width: "100%" }}
      >
        <SandpackContent onFixError={onFixError} />
      </SandpackProvider>
    </div>
  );
}
