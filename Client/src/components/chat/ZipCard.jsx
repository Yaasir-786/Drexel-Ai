// ZipCard: downloadable zip file card inside the chat
import React, { useState } from "react";
import { useSelector } from "react-redux";
import toast from "react-hot-toast";
import { FileArchive, Download } from "lucide-react";
import chatService from "../../services/chatService";

export default function ZipCard({ chatId, name, fileCount, onDownload }) {
  const { user } = useSelector((state) => state.auth);
  const [downloading, setDownloading] = useState(false);

  // download the zip: the builder hands over the files directly, the chat uses the backend
  const handleDownload = async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      if (onDownload) {
        await onDownload();
      } else {
        const blob = await chatService.downloadZip(user?.token, chatId);
        const link = document.createElement("a");
        link.href = URL.createObjectURL(blob);
        link.download = `${name}.zip`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(link.href);
      }
    } catch {
      toast.error("Could not download the zip file");
    } finally {
      setDownloading(false);
    }
  };

  return (
    <div className="mt-1 flex items-center gap-3 w-full max-w-sm rounded-2xl border border-line bg-card p-3">
      <div className="p-2.5 rounded-xl bg-surface shrink-0">
        <FileArchive size={20} className="text-[#0099FF]" />
      </div>
      <div className="flex-1 min-w-0">
        <p className="text-sm font-medium text-ink truncate">{name}.zip</p>
        <p className="text-xs text-muted">{fileCount} files</p>
      </div>
      <button
        type="button"
        onClick={handleDownload}
        disabled={downloading}
        title="Download zip"
        className="p-2 rounded-xl bg-[#0099FF] text-white disabled:opacity-40 cursor-pointer shrink-0">
        <Download size={16} />
      </button>
    </div>
  );
}
