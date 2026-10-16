// CodePanel component: 240px file tree, open tabs, line numbers, and editable code canvas
import React, { useState } from 'react';
import {
  Folder,
  FileCode,
  X,
  Save,
  Check,
  FolderOpen,
  FileText,
} from 'lucide-react';
import Button from '../Button';

// MOCK DATA: replace with API data later
const INITIAL_FILES = {
  '/src/App.jsx': `import React from 'react';\nimport Header from './components/Header';\nimport ProductCard from './components/ProductCard';\n\nexport default function App() {\n  return (\n    <div className="min-h-screen bg-white text-neutral-900">\n      <Header />\n      <main className="max-w-5xl mx-auto p-6">\n        <h1 className="text-2xl font-bold mb-4">Storefront</h1>\n        <ProductCard name="Keypad" price="$89.00" />\n      </main>\n    </div>\n  );\n}`,
  '/src/main.jsx': `import React from 'react';\nimport ReactDOM from 'react-dom/client';\nimport App from './App';\n\nReactDOM.createRoot(document.getElementById('root')).render(\n  <React.StrictMode>\n    <App />\n  </React.StrictMode>\n);`,
  '/src/components/Header.jsx': `import React from 'react';\n\nexport default function Header() {\n  return (\n    <header className="h-16 border-b px-6 flex items-center justify-between">\n      <div className="font-bold text-lg">AcmeStore</div>\n      <nav className="flex gap-4 text-sm text-neutral-600">\n        <a href="#products">Products</a>\n        <a href="#cart">Cart</a>\n      </nav>\n    </header>\n  );\n}`,
  '/src/components/ProductCard.jsx': `import React from 'react';\n\nexport default function ProductCard({ name, price }) {\n  return (\n    <div className="border rounded-xl p-4 bg-white shadow-sm">\n      <h3 className="font-semibold text-sm">{name}</h3>\n      <p className="text-neutral-500 text-xs mt-1">{price}</p>\n      <button className="mt-3 px-3 py-1.5 bg-blue-600 text-white rounded-lg text-xs">\n        Add to cart\n      </button>\n    </div>\n  );\n}`,
  '/package.json': `{\n  "name": "acme-store",\n  "private": true,\n  "version": "0.1.0",\n  "dependencies": {\n    "react": "^18.3.1",\n    "react-dom": "^18.3.1"\n  }\n}`,
};

export default function CodePanel({ isNew = false, isGenerating = false }) {
  const [files, setFiles] = useState(INITIAL_FILES);
  const [activeFile, setActiveFile] = useState('/src/App.jsx');
  const [openTabs, setOpenTabs] = useState(['/src/App.jsx', '/src/components/Header.jsx']);
  const [isEdited, setIsEdited] = useState(false);

  if (isNew) {
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

  const handleSelectFile = (path) => {
    setActiveFile(path);
    if (!openTabs.includes(path)) {
      setOpenTabs([...openTabs, path]);
    }
  };

  const handleCloseTab = (path, e) => {
    e.stopPropagation();
    // Rule: never close the last tab
    if (openTabs.length <= 1) return;
    const remaining = openTabs.filter((t) => t !== path);
    setOpenTabs(remaining);
    if (activeFile === path) {
      setActiveFile(remaining[0]);
    }
  };

  const handleCodeChange = (e) => {
    setFiles({ ...files, [activeFile]: e.target.value });
    setIsEdited(true);
  };

  const handleSave = () => {
    setIsEdited(false);
  };

  const lineCount = (files[activeFile] || '').split('\n').length;

  return (
    <div className="h-full flex bg-card overflow-hidden">
      {/* File Tree: 240px wide */}
      <div className="w-[240px] shrink-0 border-r border-line bg-surface/40 flex flex-col p-3 overflow-y-auto">
        <span className="text-[11px] font-semibold text-muted uppercase tracking-wider mb-2 px-1">
          Files
        </span>

        <div className="flex flex-col gap-0.5 text-xs text-ink font-mono">
          <div className="flex items-center gap-1.5 py-1 px-1.5 text-muted font-sans font-medium">
            <Folder size={14} className="text-[#0099FF]" /> src
          </div>
          <div className="pl-4 flex flex-col gap-0.5">
            <div className="flex items-center gap-1.5 py-1 px-1.5 text-muted font-sans font-medium">
              <Folder size={14} className="text-purple-500" /> components
            </div>
            <div className="pl-4 flex flex-col gap-0.5">
              {['/src/components/Header.jsx', '/src/components/ProductCard.jsx'].map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => handleSelectFile(p)}
                  className={`text-left py-1 px-1.5 rounded-md truncate cursor-pointer flex items-center gap-1.5 ${
                    activeFile === p ? 'bg-card text-[#0099FF] font-semibold border border-line' : 'text-muted hover:text-ink'
                  }`}
                >
                  <FileCode size={13} /> {p.split('/').pop()}
                </button>
              ))}
            </div>
            {['/src/App.jsx', '/src/main.jsx'].map((p) => (
              <button
                key={p}
                type="button"
                onClick={() => handleSelectFile(p)}
                className={`text-left py-1 px-1.5 rounded-md truncate cursor-pointer flex items-center justify-between ${
                  activeFile === p ? 'bg-card text-[#0099FF] font-semibold border border-line' : 'text-muted hover:text-ink'
                }`}
              >
                <span className="flex items-center gap-1.5 truncate">
                  <FileCode size={13} /> {p.split('/').pop()}
                </span>
                {/* When isGenerating is true, /src/App.jsx shows a plain static dot */}
                {p === '/src/App.jsx' && isGenerating && (
                  <span className="w-2 h-2 rounded-full bg-[#0099FF] shrink-0" />
                )}
              </button>
            ))}
          </div>
          <button
            type="button"
            onClick={() => handleSelectFile('/package.json')}
            className={`text-left py-1 px-1.5 rounded-md truncate cursor-pointer flex items-center gap-1.5 ${
              activeFile === '/package.json' ? 'bg-card text-[#0099FF] font-semibold border border-line' : 'text-muted hover:text-ink'
            }`}
          >
            <FileText size={13} /> package.json
          </button>
        </div>
      </div>

      {/* Editor Main Canvas */}
      <div className="flex-1 flex flex-col min-w-0 overflow-hidden">
        {/* File Tabs on Top */}
        <div className="h-10 border-b border-line bg-surface/70 flex items-center justify-between px-2 shrink-0">
          <div className="flex items-center gap-1 overflow-x-auto no-scrollbar">
            {openTabs.map((tab) => (
              <div
                key={tab}
                onClick={() => setActiveFile(tab)}
                className={`h-8 px-3 rounded-lg flex items-center gap-2 text-xs font-mono cursor-pointer border ${
                  activeFile === tab
                    ? 'bg-card text-ink border-line font-medium'
                    : 'bg-transparent text-muted border-transparent hover:bg-card/50'
                }`}
              >
                <span>{tab.split('/').pop()}</span>
                {openTabs.length > 1 && (
                  <button
                    type="button"
                    onClick={(e) => handleCloseTab(tab, e)}
                    className="text-muted hover:text-ink p-0.5 rounded"
                  >
                    <X size={12} />
                  </button>
                )}
              </div>
            ))}
          </div>

          {/* Top-right "Save changes" button when edited */}
          {isEdited && (
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
            value={files[activeFile] || ''}
            onChange={handleCodeChange}
            spellCheck="false"
            className="flex-1 p-3 font-mono text-xs text-ink bg-card outline-none leading-6 resize-none overflow-auto whitespace-pre font-normal"
          />
        </div>
      </div>
    </div>
  );
}
