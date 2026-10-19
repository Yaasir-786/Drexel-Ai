import React, { useState } from "react";
import { Eye, Code2, Download, X } from "lucide-react";
import PreviewPanel from "../builder/PreviewPanel";
import CodePanel from "../builder/CodePanel";
import { downloadZip } from "../../utils/downloadFiles";

export default function ArtifactPanel({
  files = [],
  preview = true,
  tab = "preview",
  file = null,
  title = "Project",
  onClose,
  onFixError,
}) {
  const [activeTab, setActiveTab] = useState(preview ? (tab || "preview") : "code");
  const map = Object.fromEntries(files.map((f) => [f.path, f.content]));

  const displayName = file
    ? file.startsWith("/")
      ? file.slice(1)
      : file
    : title;

  return (
    <div className="fixed inset-0 z-50 lg:static lg:w-[50%] lg:shrink-0 lg:border-l border-line bg-card text-ink flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="h-14 border-b border-line px-4 flex items-center justify-between shrink-0 bg-surface/50">
        <div className="flex items-center gap-3 min-w-0">
          {preview ? (
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
          {preview && (
            <button
              type="button"
              onClick={() => downloadZip(files, title)}
              className="h-8 px-2.5 rounded-lg border border-line bg-surface hover:bg-card text-xs text-ink flex items-center gap-1.5 cursor-pointer"
              title="Download ZIP"
            >
              <Download size={14} />
              <span className="hidden sm:inline">Download ZIP</span>
            </button>
          )}
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
        {activeTab === "preview" && preview ? (
          <PreviewPanel files={map} onFixError={onFixError} />
        ) : (
          <CodePanel
            readOnly
            key={file || "all"}
            files={file ? { [file]: map[file] || "" } : map}
            initialFile={file}
          />
        )}
      </div>
    </div>
  );
}
