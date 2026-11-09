// imageDataUrl.js: Google's OpenAI endpoint wants images as base64 data urls
// (only res.cloudinary.com URLs of this app's cloud are allowed)
const MAX_BYTES = 8 * 1024 * 1024;

// one Cloudinary image -> data:<mime>;base64,<data>, null when it fails
export const toDataUrl = async (url) => {
  if (!url) return null;
  if (url.startsWith("data:")) return url; // already a data url
  const allowed =
    `https://res.cloudinary.com/${process.env.CLOUDINARY_CLOUD_NAME || ""}/`;
  if (!url.startsWith(allowed)) return null;

  try {
    const response = await fetch(url, {
      signal: AbortSignal.timeout(15000),
    });
    if (!response.ok) return null;
    const buffer = Buffer.from(await response.arrayBuffer());
    if (!buffer.length || buffer.length > MAX_BYTES) return null;
    const mime = String(response.headers.get("content-type") || "image/jpeg").split(";")[0];
    return `data:${mime};base64,${buffer.toString("base64")}`;
  } catch {
    return null;
  }
};
