import React, { useMemo } from "react";
import { SandpackProvider, SandpackPreview, useSandpack } from "@codesandbox/sandpack-react";
import { Sparkles, AlertCircle } from "lucide-react";
import Button from "../Button";

// vite-react template keeps its own tested package.json / vite config; we only add the extra libraries
const getPreviewType = (files) => (files["/src/main.jsx"] ? "react" : files["/index.html"] ? "static" : "none");

// scrollbar style for the preview iframe only, never in saved or downloaded files
const SCROLLBAR_CSS =
  '<style data-drexel-scrollbar>' +
  "::-webkit-scrollbar{width:10px;height:10px}" +
  "::-webkit-scrollbar-track{background:transparent}" +
  "::-webkit-scrollbar-thumb{background:linear-gradient(180deg,#0099FF,#6D5DFC);border-radius:9999px;border:2px solid transparent;background-clip:padding-box}" +
  "@supports (-moz-appearance:none){html{scrollbar-width:thin;scrollbar-color:#6D5DFC transparent}}" +
  "</style>";

// inject the scrollbar style into the preview copy of /index.html
const injectScrollbarCss = (files) => {
  const index = files["/index.html"];
  if (typeof index !== "string" || !index.includes("</head>")) return files;
  if (index.includes("data-drexel-scrollbar")) return files;
  return {
    ...files,
    "/index.html": index.replace("</head>", `${SCROLLBAR_CSS}</head>`),
  };
};

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

// virtual viewport range: full width renders 1280px (desktop), narrowest renders 375px (mobile)
const DESKTOP_PREVIEW_WIDTH = 1280;
const MOBILE_PREVIEW_WIDTH = 375;

function SandpackContent({ onFixError, ratio = 1 }) {
  const { sandpack, listen } = useSandpack();
  const containerRef = React.useRef(null);
  const [containerWidth, setContainerWidth] = React.useState(0);
  const [runtimeError, setRuntimeError] = React.useState("");

  // the Nodebox runtime reports nothing but console errors: capture them
  React.useEffect(
    () =>
      listen((msg) => {
        if (msg.type === "start") {
          setRuntimeError("");
          return;
        }
        if (msg.type !== "console") return;
        const entry = (msg.log || []).find((item) => item.method === "error");
        if (!entry) return;
        const text = (entry.data || [])
          .map((part) => (typeof part === "string" ? part : part?.message || ""))
          .filter(Boolean)
          .join(" ");
        // bundler housekeeping is not a crashed app
        if (!text || /clearScreenDown|favicon|DevTools/i.test(text)) return;
        setRuntimeError(text.slice(0, 1000));
      }),
    [listen],
  );

  // measure the panel so the preview can render at its virtual width and scale down
  React.useEffect(() => {
    const element = containerRef.current;
    if (!element) return undefined;
    const observer = new ResizeObserver((entries) => {
      setContainerWidth(entries[0]?.contentRect?.width || 0);
    });
    observer.observe(element);
    return () => observer.disconnect();
  }, []);

  // compile error or runtime console error: both get the red bar + "Fix with AI"
  const errorMessage = sandpack.error?.message || runtimeError;

  // virtual viewport of the site: desktop at ratio 1, mobile at ratio 0
  const virtualWidth = MOBILE_PREVIEW_WIDTH + ratio * (DESKTOP_PREVIEW_WIDTH - MOBILE_PREVIEW_WIDTH);
  const scale = containerWidth ? Math.min(1, containerWidth / virtualWidth) : 1;

  return (
    <div ref={containerRef} className="h-full flex flex-col relative">
      <div className="flex-1 min-h-0 overflow-hidden">
        <div
          style={{
            width: containerWidth ? containerWidth / scale : "100%",
            height: `${100 / scale}%`,
            transform: `scale(${scale})`,
            transformOrigin: "top left",
          }}
        >
          <SandpackPreview
            showOpenInCodeSandbox={false}
            showRefreshButton={false}
            style={{ width: "100%", height: "100%" }}
          />
        </div>
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

export default function PreviewPanel({ files = {}, onFixError, isNew = false, ratio = 1 }) {
  const previewFiles = useMemo(() => injectScrollbarCss(files), [files]);
  const setup = useMemo(() => buildPreviewSetup(previewFiles), [previewFiles]);
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
          files={previewFiles}
          options={{ recompileMode: "delayed", recompileDelay: 500 }}
          style={{ height: "100%", width: "100%" }}>
          <SandpackContent onFixError={onFixError} ratio={ratio} />
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
        <SandpackContent onFixError={onFixError} ratio={ratio} />
      </SandpackProvider>
    </div>
  );
}