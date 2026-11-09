// clipboardFiles.js: files of a Ctrl/Cmd+V paste on the chat inputs
import toast from "react-hot-toast";

// allowed types on the server, used to decide if a pasted image must convert
const allowedTypes = ["image/jpeg", "image/jpg", "image/png"];

// pasted images arrive as "image.png": give them a unique real name again
const renamePastedImage = (file, index) => {
  const ext = (file.type.split("/")[1] || "png").replace("jpeg", "jpg");
  return new File([file], `pasted-image-${Date.now()}-${index}.${ext}`, {
    type: file.type,
  });
};

// draw the image on a canvas (longest side max 2000 px) and export as JPEG
const shrinkImage = (file) =>
  new Promise((resolve) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, 2000 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      canvas.toBlob(
        (blob) => {
          // still too big after shrinking -> rejected (null), the caller toasts
          if (!blob || blob.size > 5 * 1024 * 1024) {
            toast.error(
              `${file.name} is still larger than 5 MB after shrinking`,
            );
            resolve(null);
            return;
          }
          resolve(new File([blob], `pasted-image-${Date.now()}.jpg`, { type: "image/jpeg" }));
        },
        "image/jpeg",
        0.85,
      );
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      toast.error(`${file.name}: could not read the pasted image`);
      resolve(null);
    };
    img.src = url;
  });

// collect the files of one paste event as an array the chat inputs can add
export const pasteFiles = async (event) => {
  const pasted = Array.from(event.clipboardData?.files || []);

  // only paste attachments when the clipboard has no plain text
  if (pasted.length === 0 || event.clipboardData.getData("text/plain")) {
    return [];
  }
  event.preventDefault();

  const ready = [];
  for (const [index, file] of pasted.entries()) {
    if (file.type.startsWith("image/")) {
      let image = renamePastedImage(file, index);

      // too big, or a type the upload does not accept (e.g. webp) -> convert
      if (image.size > 5 * 1024 * 1024 || !allowedTypes.includes(image.type)) {
        image = await shrinkImage(image);
      }
      if (image) ready.push(image);
    } else {
      // PDFs and zips pass through, addFiles validates types and sizes
      ready.push(file);
    }
  }
  return ready;
};
