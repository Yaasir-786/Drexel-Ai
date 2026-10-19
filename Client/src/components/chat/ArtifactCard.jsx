import React from "react";
import { Eye, Code2, Download, FileText, CheckCircle2 } from "lucide-react";
import Button from "../Button";
import { downloadFile } from "../../utils/downloadFiles";

export default function ArtifactCard({
  files = [],
  preview = true,
  onOpen,
  onDownloadZip,
}) {
  if (!files || files.length === 0) return null;

  if (preview) {
    return (
      <div className="mt-3 p-4 rounded-2xl bg-card border border-line shadow-xs flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-emerald-500/10 text-emerald-600 flex items-center justify-center">
              <CheckCircle2 size={18} />
            </div>
            <div>
              <h4 className="text-xs font-semibold text-ink">Your project is ready</h4>
              <p className="text-[11px] text-muted">
                {files.length} {files.length === 1 ? "file" : "files"}
              </p>
            </div>
          </div>
        </div>

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant="primary"
            onClick={() => onOpen && onOpen("preview")}
            className="h-8 px-3 text-xs"
            icon={Eye}
          >
            Preview
          </Button>
          <Button
            variant="secondary"
            onClick={() => onOpen && onOpen("code")}
            className="h-8 px-3 text-xs"
            icon={Code2}
          >
            Code
          </Button>
          <Button
            variant="secondary"
            onClick={() => onDownloadZip && onDownloadZip()}
            className="h-8 px-3 text-xs"
            icon={Download}
          >
            Download ZIP
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="mt-3 p-4 rounded-2xl bg-card border border-line shadow-xs flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="w-8 h-8 rounded-xl bg-blue-500/10 text-[#0099FF] flex items-center justify-center">
            <FileText size={18} />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-ink">Generated files</h4>
            <p className="text-[11px] text-muted">
              {files.length} {files.length === 1 ? "file" : "files"}
            </p>
          </div>
        </div>
        {files.length > 1 && (
          <Button
            variant="secondary"
            onClick={() => onDownloadZip && onDownloadZip()}
            className="h-7 px-2.5 text-xs"
            icon={Download}
          >
            Download all (ZIP)
          </Button>
        )}
      </div>

      <div className="flex flex-col divide-y divide-line/60 border border-line rounded-xl overflow-hidden bg-surface">
        {files.map((file, idx) => (
          <div
            key={idx}
            onClick={() => onOpen && onOpen("code", file.path)}
            className="p-2.5 flex items-center justify-between hover:bg-card cursor-pointer"
          >
            <div className="flex items-center gap-2 truncate">
              <FileText size={14} className="text-muted shrink-0" />
              <span className="text-xs font-mono text-ink truncate">
                {file.path.startsWith("/") ? file.path.slice(1) : file.path}
              </span>
            </div>
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                downloadFile(file.path, file.content);
              }}
              title="Download file"
              className="p-1 rounded text-muted hover:text-ink cursor-pointer shrink-0"
            >
              <Download size={14} />
            </button>
          </div>
        ))}
      </div>
    </div>
  );
}
