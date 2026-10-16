// VersionHistory drawer (400px right) displaying previous checkpoints and restore modal
import React, { useState } from 'react';
import { History, RotateCcw } from 'lucide-react';
import Drawer from '../Drawer';
import Modal from '../Modal';
import Button from '../Button';

// MOCK DATA: replace with API data later
const MOCK_VERSIONS = [
  { id: 'v4', label: 'Updated theme styles & layout', time: '5m ago', files: '15 files' },
  { id: 'v3', label: 'Integrated ProductCard component', time: '20m ago', files: '14 files' },
  { id: 'v2', label: 'Added Header & Navigation', time: '45m ago', files: '12 files' },
  { id: 'v1', label: 'Initial scaffold setup', time: '1h ago', files: '10 files' },
];

export default function VersionHistory({ isOpen, onClose }) {
  const [selectedVersion, setSelectedVersion] = useState(null);

  const handleConfirmRestore = () => {
    // Restore only closes the dialog and the drawer (UI only)
    setSelectedVersion(null);
    onClose();
  };

  return (
    <>
      <Drawer
        isOpen={isOpen}
        onClose={onClose}
        title="Version history"
        description="Restore your project to any previous checkpoint."
        width="w-full md:w-[400px]"
      >
        <div className="flex flex-col gap-3">
          {MOCK_VERSIONS.map((v) => (
            <div
              key={v.id}
              className="p-4 rounded-xl border border-line bg-surface hover:bg-card flex flex-col gap-2 shadow-xs"
            >
              <div className="flex items-start justify-between gap-2">
                <span className="text-xs font-semibold text-ink leading-tight">
                  {v.label}
                </span>
                <span className="text-[11px] text-muted whitespace-nowrap">
                  {v.time}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-[11px] text-muted font-mono">{v.files}</span>
                <Button
                  variant="secondary"
                  onClick={() => setSelectedVersion(v)}
                  className="h-8 px-3 text-xs"
                  icon={RotateCcw}
                >
                  Restore
                </Button>
              </div>
            </div>
          ))}
        </div>
      </Drawer>

      {/* Restore Confirmation Modal */}
      <Modal
        isOpen={!!selectedVersion}
        onClose={() => setSelectedVersion(null)}
        title="Restore this version?"
        description={
          selectedVersion
            ? `Your current files will be replaced with the state from "${selectedVersion.label}" (${selectedVersion.time}). Unsaved changes will be lost.`
            : ''
        }
      >
        <div className="flex items-center justify-end gap-3 pt-4">
          <Button
            variant="secondary"
            onClick={() => setSelectedVersion(null)}
            className="min-w-[100px]"
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            onClick={handleConfirmRestore}
            className="min-w-[100px]"
          >
            Restore
          </Button>
        </div>
      </Modal>
    </>
  );
}
