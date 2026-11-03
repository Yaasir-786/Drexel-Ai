// BuilderTopBar component: mobile menu, back button, inline editable project name, preview, credits, and actions
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  ArrowLeft,
  Pencil,
  Download,
  Coins,
  MoreVertical,
  Menu,
  Eye,
} from 'lucide-react';
import ThemeToggle from '../ThemeToggle';
import Button from '../Button';
import { useSelector } from 'react-redux';

export default function BuilderTopBar({
  projectName,
  onRenameProject,
  onDownloadZip,
  onOpenMobileMenu,
  canPreview,
  isPreviewOpen,
  onOpenPreview,
}) {
  const { user } = useSelector((state) => state.auth);
  const [isEditing, setIsEditing] = useState(false);
  const [tempName, setTempName] = useState(projectName);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);

  const handleSave = () => {
    if (tempName.trim()) {
      onRenameProject(tempName.trim());
    } else {
      setTempName(projectName);
    }
    setIsEditing(false);
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter') handleSave();
    if (e.key === 'Escape') {
      setTempName(projectName);
      setIsEditing(false);
    }
  };

  const handleDownloadZip = () => {
    if (onDownloadZip) onDownloadZip();
  };

  return (
    <header className="h-16 border-b border-line bg-card px-4 flex items-center justify-between shrink-0 sticky top-0 z-30">
      {/* Left side: mobile menu, back to /projects and editable project name */}
      <div className="flex items-center gap-3 min-w-0">
        {/* Mobile sidebar menu button */}
        <button
          type="button"
          onClick={onOpenMobileMenu}
          aria-label="Open sidebar menu"
          className="lg:hidden p-2 rounded-xl text-muted hover:text-ink hover:bg-surface border border-line shrink-0 cursor-pointer"
        >
          <Menu size={18} />
        </button>

        <Link
          to="/projects"
          aria-label="Back to projects"
          className="p-2 rounded-xl text-muted hover:text-ink hover:bg-surface border border-line shrink-0 cursor-pointer"
        >
          <ArrowLeft size={18} />
        </Link>

        {isEditing ? (
          <input
            type="text"
            value={tempName}
            onChange={(e) => setTempName(e.target.value)}
            onBlur={handleSave}
            onKeyDown={handleKeyDown}
            autoFocus
            className="h-9 px-2.5 rounded-lg border border-[#0099FF] bg-surface text-sm font-semibold text-ink outline-none"
          />
        ) : (
          <div className="flex items-center gap-2 min-w-0">
            <h1 className="text-sm md:text-base font-semibold text-ink truncate max-w-[180px] sm:max-w-xs md:max-w-md">
              {projectName}
            </h1>
            <button
              type="button"
              onClick={() => {
                setTempName(projectName);
                setIsEditing(true);
              }}
              aria-label="Edit project name"
              className="text-muted hover:text-ink p-1 rounded-md cursor-pointer"
            >
              <Pencil size={15} />
            </button>
          </div>
        )}
      </div>

      {/* Right side: preview, credits pill, action buttons, theme toggle */}
      <div className="flex items-center gap-2.5 shrink-0">
        {/* Preview button: only when the project has files and the workspace is closed */}
        {canPreview && !isPreviewOpen && (
          <Button
            variant="secondary"
            onClick={onOpenPreview}
            icon={Eye}
            className="h-8 px-3 text-xs"
          >
            Preview
          </Button>
        )}

        {/* Credits pill (ONE line) */}
        <div className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full border border-line bg-surface text-xs font-medium text-ink whitespace-nowrap">
          <Coins size={14} className="text-[#0099FF] shrink-0" />
          <span>{user?.credits ?? 0} credits</span>
        </div>

        {/* Desktop Buttons (768px and up) */}
        <div className="hidden md:flex items-center gap-2">
          <Button
            variant="secondary"
            onClick={handleDownloadZip}
            className="h-10 px-3 text-xs"
            icon={Download}
          >
            Download ZIP
          </Button>
        </div>

        {/* Mobile menu button (below 768px) collapsing the two buttons */}
        <div className="md:hidden relative">
          <button
            type="button"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            aria-label="More actions"
            className="p-2 rounded-xl text-muted hover:text-ink hover:bg-surface border border-line cursor-pointer"
          >
            <MoreVertical size={18} />
          </button>

          {mobileMenuOpen && (
            <div className="absolute right-0 top-11 w-44 bg-card border border-line rounded-xl shadow-lg py-1 z-30">
              <button
                type="button"
                onClick={() => {
                  handleDownloadZip();
                  setMobileMenuOpen(false);
                }}
                className="w-full px-3 py-2 text-left text-xs font-medium text-ink hover:bg-surface flex items-center gap-2 cursor-pointer"
              >
                <Download size={16} /> Download ZIP
              </button>
            </div>
          )}
        </div>

        {/* Theme Toggle (40x40) */}
        <ThemeToggle />
      </div>
    </header>
  );
}
