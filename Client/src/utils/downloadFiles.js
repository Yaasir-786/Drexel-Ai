import JSZip from "jszip";

export const downloadFile = (path, content) => {
  const filename = path.split("/").pop() || "download";
  const blob = new Blob([content], { type: "text/plain;charset=utf-8" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};

export const downloadZip = async (files = [], name = "project") => {
  const zip = new JSZip();
  files.forEach(({ path, content }) => {
    const cleanPath = path.startsWith("/") ? path.slice(1) : path;
    zip.file(cleanPath, content);
  });
  const blob = await zip.generateAsync({ type: "blob" });
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = `${name || "project"}.zip`;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
};
