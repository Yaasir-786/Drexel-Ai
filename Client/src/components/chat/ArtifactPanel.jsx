import React, { useState, useMemo } from "react";
import { Eye, Code2, X, FileArchive, FileText } from "lucide-react";
import PreviewPanel from "../builder/PreviewPanel";
import CodePanel from "../builder/CodePanel";

export default function ArtifactPanel({
  files = [],
  preview = true,
  tab = "preview",
  file = null,
  title = "Project",
  ratio = 1,
  previewStyle,
  zip = null,
  onClose,
  onFixError,
}) {
  const [activeTab, setActiveTab] = useState(preview ? (tab || "preview") : "code");
  const map = useMemo(() => Object.fromEntries(files.map((f) => [f.path, f.content])), [files]);

  // the zip view is code-only: only the files named by the zip (all files without paths)
  const zipFiles = useMemo(
    () => (zip && zip.paths?.length ? files.filter((f) => zip.paths.includes(f.path)) : files),
    [zip, files],
  );
  const zipMap = useMemo(
    () => Object.fromEntries(zipFiles.map((f) => [f.path, f.content])),
    [zipFiles],
  );

  const displayName = file
    ? file.startsWith("/")
      ? file.slice(1)
      : file
    : title;

  return (
    <div
      style={previewStyle}
      className="fixed inset-0 z-50 lg:static lg:w-[var(--panel-w)] lg:shrink-0 lg:min-w-0 border-line bg-card text-ink flex flex-col h-full overflow-hidden"
    >
      {/* Header */}
      <div className="h-14 border-b border-line px-4 flex items-center justify-between shrink-0 bg-surface/50">
        <div className="flex items-center gap-3 min-w-0">
          {zip ? (
            // zip view: read-only header with the zip name and its file count
            <div className="flex items-center gap-2 min-w-0">
              {zip.kind === "files" ? (
                <FileText size={16} className="text-[#0099FF] shrink-0" />
              ) : (
                <FileArchive size={16} className="text-[#0099FF] shrink-0" />
              )}
              <span className="text-xs font-mono font-semibold text-ink truncate">
                {zip.kind === "files" ? zip.name : `${zip.name}.zip`}
              </span>
              <span className="text-xs text-muted shrink-0">
                {zipFiles.length} {zipFiles.length === 1 ? "file" : "files"}
              </span>
            </div>
          ) : preview ? (
            <div className="flex rounded-xl bg-surface border border-line p-0.5">
              <button
                type="button"
                onClick={() => setActiveTab("preview")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg cursor-pointer ${
                  activeTab === "preview"
                    ? "bg-card text-ink shadow-xs border border-line/60 font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Eye size={14} className="text-[#0099FF]" />
                <span>Preview</span>
              </button>
              <button
                type="button"
                onClick={() => setActiveTab("code")}
                className={`flex items-center gap-1.5 px-3 py-1 text-xs font-medium rounded-lg cursor-pointer ${
                  activeTab === "code"
                    ? "bg-card text-ink shadow-xs border border-line/60 font-semibold"
                    : "text-muted hover:text-ink"
                }`}
              >
                <Code2 size={14} className="text-purple-500" />
                <span>Code</span>
              </button>
            </div>
          ) : (
            <span className="text-xs font-mono font-semibold text-ink truncate">
              {displayName}
            </span>
          )}
        </div>

        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={onClose}
            aria-label="Close panel"
            className="p-1.5 rounded-lg text-muted hover:text-ink hover:bg-surface cursor-pointer"
          >
            <X size={18} />
          </button>
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 min-h-0 overflow-hidden bg-surface">
        {zip ? (
          // zip view: read-only code viewer only, never the preview
          <div className="h-full">
            <CodePanel readOnly key={`zip-${zip.name}`} files={zipMap} />
          </div>
        ) : (
          <>
            <div className={activeTab === "preview" ? "h-full" : "hidden"}>
              <PreviewPanel files={map} ratio={ratio} onFixError={onFixError} />
            </div>
            <div className={activeTab === "code" ? "h-full" : "hidden"}>
              <CodePanel
                readOnly
                key={`${file || "all"}-${files.length}-${files.reduce(
                  (n, f) => n + f.content.length,
                  0,
                )}`}
                files={file ? { [file]: map[file] || "" } : map}
                initialFile={file}
              />
            </div>
          </>
        )}
      </div>
    </div>
  );
}
