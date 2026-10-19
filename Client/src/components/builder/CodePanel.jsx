// CodePanel component: flat file tree, open tabs, line numbers, and code viewer/editor
import React, { useState } from 'react';
import {
  FileCode,
  X,
  Save,
  Check,
  FolderOpen,
  Copy,
} from 'lucide-react';
import Button from '../Button';

export default function CodePanel({
  files = {},
  readOnly = false,
  initialFile = null,
  isNew = false,
}) {
  const sortedPaths = Object.keys(files || {}).sort();

  const [fileMap, setFileMap] = useState(files || {});
  const defaultFile =
    initialFile && sortedPaths.includes(initialFile)
      ? initialFile
      : sortedPaths[0] || '';

  const [activeFile, setActiveFile] = useState(defaultFile);
  const [openTabs, setOpenTabs] = useState(defaultFile ? [defaultFile] : []);
  const [isEdited, setIsEdited] = useState(false);
  const [copied, setCopied] = useState(false);

  if (isNew || sortedPaths.length === 0) {
    return (
      <div className="h-full flex items-center justify-center p-8 text-center bg-surface text-muted">
        <div>
          <FolderOpen size={32} className="mx-auto mb-2 text-muted" />
          <h3 className="text-base font-semibold text-ink">No files yet</h3>
          <p className="text-xs mt-1">Generated application files will appear here.</p>
        </div>
      </div>
    );
  }

  const currentActiveFile = sortedPaths.includes(activeFile)
    ? activeFile
    : sortedPaths[0] || '';

  const handleSelectFile = (path) => {
    setActiveFile(path);
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path]);
    }
  };

  const handleCloseTab = (path, e) => {
    e.stopPropagation();
    if (openTabs.length <= 1) return;
    const remaining = openTabs.filter((t) => t !== path);
    setOpenTabs(remaining);
    if (currentActiveFile === path) {
      setActiveFile(remaining[0]);
    }
  };

  const handleCodeChange = (e) => {
    if (readOnly) return;
    setFileMap({ ...fileMap, [currentActiveFile]: e.target.value });
    setIsEdited(true);
  };

  const handleSave = () => {
    setIsEdited(false);
  };

  const handleCopy = () => {
    const code = fileMap[currentActiveFile] || '';
    navigator.clipboard.writeText(code);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  };

  const lineCount = (fileMap[currentActiveFile] || '').split('\n').length;

  return (
    <div className="h-full flex bg-card overflow-hidden">
      {/* File Tree: shown only when more than one file */}
      {sortedPaths.length > 1 && (
        <div className="w-[200px] shrink-0 border-r border-line bg-surface/40 flex flex-col p-3 overflow-y-auto">
          <span className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2 px-1">
            Files
          </span>

          <div className="flex flex-col gap-0.5 text-xs text-ink font-mono">
            {sortedPaths.map((p) => {
              const displayName = p.startsWith('/') ? p.slice(1) : p;
              const isSelected = currentActiveFile === p;
              return (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectFile(p)}
                  className={`text-left py-1.5 px-2 rounded-md truncate cursor-pointer flex items-center gap-1.5 ${
                    isSelected
                      ? 'bg-card text-[#0099FF] font-semibold border border-line'
                      : 'text-muted hover:text-ink'
                  }`}
                >
                  <FileCode size={13} className="shrink-0" />
                  <span className="truncate">{displayName}</span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {/* Editor Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* File Tabs & Actions on Top */}
        <div className="h-10 border-b border-line bg-surface/70 flex items-center justify-between px-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {openTabs.map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveFile(tab)}
                className={`h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-mono cursor-pointer border ${
                  currentActiveFile === tab
                    ? 'bg-card text-ink border-line font-medium'
                    : 'bg-transparent text-muted border-transparent hover:bg-card/50'
                }`}
              >
                <span>{tab.split('/').pop()}</span>
                {openTabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab, e)}
                    className="text-muted hover:text-ink p-0.5 rounded cursor-pointer"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          <div className="flex items-center gap-2">
            <button
              type="button"
              onClick={handleCopy}
              className="h-7 px-2.5 rounded-lg border border-line bg-surface hover:bg-card text-xs text-ink flex items-center gap-1.5 cursor-pointer"
              title="Copy code"
            >
              {copied ? (
                <Check size={13} className="text-emerald-500" />
              ) : (
                <Copy size={13} />
              )}
              <span>{copied ? 'Copied' : 'Copy'}</span>
            </button>

            {!readOnly && isEdited && (
              <Button
                variant="primary"
                onClick={handleSave}
                className="h-7 px-3 text-xs"
                icon={Save}
              >
                Save changes
              </Button>
            )}
          </div>
        </div>

        {/* Editor: Line Numbers + Monospace Textarea */}
        <div className="flex-1 flex overflow-hidden bg-card">
          {/* Line-number column */}
          <div className="w-12 py-3 bg-surface/40 border-r border-line text-right pr-3 font-mono text-xs text-muted/60 select-none overflow-hidden shrink-0">
            {Array.from({ length: lineCount }).map((_, i) => (
              <div key={i} className="leading-6">
                {i + 1}
              </div>
            ))}
          </div>

          {/* Monospace textarea with horizontal & vertical scroll */}
          <textarea
            value={fileMap[currentActiveFile] || ''}
            onChange={handleCodeChange}
            readOnly={readOnly}
            spellCheck="false"
            className="flex-1 p-3 font-mono text-xs text-ink bg-card outline-none leading-6 resize-none overflow-auto whitespace-pre font-normal"
          />
        </div>
      </div>
    </div>
  );
}
