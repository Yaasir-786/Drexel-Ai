import React, { useMemo } from "react";
import { SandpackProvider, SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { Sparkles, AlertCircle } from "lucide-react";
import Button from "../Button";

// vite-react template keeps its own tested package.json / vite config; we only add the extra libraries
const getPreviewType = (files) => (files["/src/main.jsx"] ? "react" : files["/index.html"] ? "static" : "none");

const SAFE_VERSIONS = { "react-router-dom": "6.22.3", "lucide-react": "0.383.0" };
const IMPORT_RE = /(?:from|import)\s*["']([^"'./][^"']*)["']/g;
const getPackageName = (specifier) => (specifier.startsWith("@") ? specifier.split("/").slice(0, 2).join("/") : specifier.split("/")[0]);

const buildPreviewSetup = (files) => {
  let pkg = {};
  try { pkg = JSON.parse(files["/package.json"] || "{}"); } catch { pkg = {}; }
  const dependencies = { ...(pkg.dependencies || {}) };
  Object.entries(files).forEach(([path, content]) => {
    if (!/\.(jsx?|tsx?)$/.test(path) || typeof content !== "string") return;
    for (const match of content.matchAll(IMPORT_RE)) {
      if (match[1].startsWith("@/")) continue;
      const name = getPackageName(match[1]);
      dependencies[name] = SAFE_VERSIONS[name] || dependencies[name] || "latest";
    }
  });
  ["react", "react-dom", "vite", "@vitejs/plugin-react"].forEach((name) => delete dependencies[name]);
  const { "/package.json": removedPackage, "/vite.config.js": removedConfig, ...rest } = files;
  return { files: rest, dependencies };
};

function SandpackContent({ onFixError }) {
  const { sandpack } = useSandpack();
  const errorMessage = sandpack.error?.message;

  return (
    <div className="h-full flex flex-col relative">
      <div className="flex-1 min-h-0">
        <SandpackPreview
          showOpenInCodeSandbox={false}
          showRefreshButton={false}
          style={{ width: "100%", height: "100%" }}
        />
      </div>

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
  const type = getPreviewType(files);

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

  if (type === "none") {
    return (
      <div className="h-full flex flex-col items-center justify-center p-8 text-center bg-surface text-muted">
        <h3 className="text-base font-semibold text-ink">Preview is not available for this project</h3>
        <p className="text-xs mt-1 max-w-sm">
          This type of project cannot run in the browser. Open the Code tab or download the ZIP and run it locally (see README.md).
        </p>
      </div>
    );
  }

  if (type === "static") {
    return (
      <div className="h-full flex flex-col bg-surface overflow-hidden">
        <SandpackProvider
          template="static"
          files={files}
          options={{ recompileMode: "delayed", recompileDelay: 500 }}
          style={{ height: "100%", width: "100%" }}>
          <SandpackContent onFixError={onFixError} />
        </SandpackProvider>
      </div>
    );
  }

  return (
    <div className="h-full flex flex-col bg-surface overflow-hidden">
      <SandpackProvider
        key={JSON.stringify(setup.dependencies)}
        template="vite-react"
        files={setup.files}
        customSetup={{ dependencies: setup.dependencies }}
        options={{ recompileMode: "delayed", recompileDelay: 500 }}
        style={{ height: "100%", width: "100%" }}
      >
        <SandpackContent onFixError={onFixError} />
      </SandpackProvider>
    </div>
  );
}