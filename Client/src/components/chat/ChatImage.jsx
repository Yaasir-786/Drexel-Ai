// ChatImage: generated image inside the chat with hover actions and a lightbox
import React, { useState } from "react";
import { useDispatch, useSelector } from "react-redux";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import toast from "react-hot-toast";
import { Pencil, Download, Send, X } from "lucide-react";
import { getProfile } from "../../features/auth/authSlice";
import imageService from "../../services/imageService";
import ImageLightbox from "./ImageLightbox";

export default function ChatImage({
  url,
  chatId,
  projectId,
  onEditStart,
  onEditSuccess,
  onEditError,
}) {
  const dispatch = useDispatch();
  const queryClient = useQueryClient();
  const { user } = useSelector((state) => state.auth);
  const [open, setOpen] = useState(false);
  const [editing, setEditing] = useState(false);
  const [instruction, setInstruction] = useState("");

  // edit the image through the backend, then sync the credits
  const editMutation = useMutation({
    mutationFn: (payload) => imageService.editImage(user?.token, payload),
    onSuccess: (data) => {
      dispatch(getProfile({ credits: data.credits }));
      queryClient.invalidateQueries({ queryKey: ["usage"] });
      onEditSuccess?.(data);
    },
    onError: (error) => {
      toast.error(
        error?.response?.data?.message || "Image edit failed. Please try again.",
      );
      onEditError?.();
    },
  });

  // download the image as a file
  const handleDownload = async () => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const link = document.createElement("a");
      link.href = URL.createObjectURL(blob);
      link.download = "drexel-image.jpg";
      document.body.appendChild(link);
      link.click();
      link.remove();
      URL.revokeObjectURL(link.href);
    } catch {
      // fallback: Cloudinary's attachment download
      window.open(url.replace("/upload/", "/upload/fl_attachment/"), "_blank");
    }
  };

  // edit send shared by the inline bar and the lightbox (text passed in)
  const handleEditSend = (rawText) => {
    const text = (rawText ?? instruction).trim();
    if (!text || editMutation.isPending) return;
    onEditStart?.(text);
    setEditing(false);
    setInstruction("");
    editMutation.mutate({
      chatId,
      projectId,
      imageUrl: url,
      instruction: text,
    });
  };

  // hover buttons stay out of the lightbox click
  const hoverButton =
    "p-2 rounded-lg bg-black/60 text-white hover:bg-black/80 cursor-pointer opacity-0 group-hover:opacity-100 [@media(hover:none)]:opacity-100 transition-opacity";

  return (
    <div className="mt-1 inline-flex flex-col gap-2 max-w-full">
      {/* Image with hover actions and lightbox */}
      <div className="group relative inline-block">
        <div
          role="button"
          tabIndex={0}
          className="cursor-zoom-in"
          onClick={() => setOpen(true)}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") {
              e.preventDefault();
              setOpen(true);
            }
          }}
        >
          <img
            src={url}
            alt="Generated image"
            draggable={false}
            className="max-w-md w-full rounded-2xl border border-line"
          />
        </div>
        <div
          className="absolute top-2 right-2 flex gap-1.5"
          onClick={(e) => e.stopPropagation()}>
          <button
            type="button"
            title="Edit image"
            onClick={() => setEditing(true)}
            className={hoverButton}>
            <Pencil size={14} />
          </button>
          <button
            type="button"
            title="Download image"
            onClick={handleDownload}
            className={hoverButton}>
            <Download size={14} />
          </button>
        </div>
      </div>

      {/* Inline edit bar */}
      {editing && (
        <div className="flex items-center gap-2 max-w-md">
          <input
            value={instruction}
            onChange={(e) => setInstruction(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter") {
                e.preventDefault();
                handleEditSend();
              }
              if (e.key === "Escape") setEditing(false);
            }}
            placeholder="Describe the changes..."
            disabled={editMutation.isPending}
            className="flex-1 h-9 px-3 rounded-xl border border-line bg-card text-sm text-ink outline-none focus:ring-2 focus:ring-[#0099FF]"
          />
          <button
            type="button"
            title="Send edit"
            onClick={() => handleEditSend()}
            disabled={editMutation.isPending || !instruction.trim()}
            className="p-2 rounded-xl bg-[#0099FF] text-white disabled:opacity-40 cursor-pointer">
            <Send size={14} />
          </button>
          <button
            type="button"
            title="Cancel"
            onClick={() => setEditing(false)}
            className="p-2 rounded-xl border border-line text-muted hover:text-ink cursor-pointer">
            <X size={14} />
          </button>
        </div>
      )}

      {/* Fullscreen lightbox */}
      {open && (
        <ImageLightbox
          url={url}
          onClose={() => setOpen(false)}
          onDownload={handleDownload}
          onEditSend={handleEditSend}
        />
      )}
    </div>
  );
}
