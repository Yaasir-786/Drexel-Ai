import crypto from "node:crypto";
import { PDFParse } from "pdf-parse";
import cloudinaryService from "../../middleware/cloudinaryMiddleware.js";

const MAX_PDF_TEXT = 15000;

// text of a PDF (used by the AI). Scanned or broken PDFs return undefined
const extractPdfText = async (buffer) => {
  let parser;

  try {
    // copy of the buffer, so the original is still intact for the Cloudinary upload
    parser = new PDFParse({ data: new Uint8Array(buffer) });
    const result = await parser.getText({ first: 20 });

    const text = result.text
      .replace(/-- \d+ of \d+ --/g, " ")
      .replace(/\s+/g, " ")
      .trim()
      .slice(0, MAX_PDF_TEXT);

    return text || undefined;
  } catch (error) {
    return undefined;
  } finally {
    if (parser) await parser.destroy().catch(() => {});
  }
};

const uploadFiles = async (req, res) => {
  const results = [];

  for (const file of req.files) {
    const publicId = `delux_${req.user._id}_${crypto.randomUUID()}`;
    const text = file.kind === "pdf" ? await extractPdfText(file.buffer) : undefined;

    const uploaded = await cloudinaryService.uploadToCloudinary(file.buffer, {
      public_id: publicId,
    });

    results.push({
      url: uploaded.secure_url,
      publicId: uploaded.public_id,
      name: file.safeName,
      type: file.kind,
      mimeType: file.detectedMime,
      size: file.size,
      ...(text && { text }),
    });
  }

  res.status(201).json({ files: results });
};

const deleteFile = async (req, res) => {
  const { publicId } = req.params;

  // users can only delete their own files
  if (!publicId.startsWith(`delux_${req.user._id}_`) || !/^[A-Za-z0-9_-]+$/.test(publicId)) {
    res.status(403);
    throw new Error("You Can Only Delete Your Own Files...");
  }

  const deleted = await cloudinaryService.deleteFromCloudinary(publicId);

  if (!deleted) {
    res.status(404);
    throw new Error("File Not Found...");
  }

  res.status(200).json({ message: "File Deleted SuccessFully..." });
};

const uploadController = { uploadFiles, deleteFile };

export default uploadController;
