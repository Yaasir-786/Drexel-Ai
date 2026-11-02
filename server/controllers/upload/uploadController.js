import crypto from "node:crypto";
import AdmZip from "adm-zip";
import { PDFParse } from "pdf-parse";
import cloudinaryService from "../../middleware/cloudinaryMiddleware.js";
import Document from "../../models/documentModel.js";
import DocChunk from "../../models/docChunkModel.js";
import { stripReservedTags } from "../../agents/prompts.js";

const MAX_PDF_TEXT = 15000;

// zip indexing guards
const MAX_ZIP_ENTRIES = 3000;
const MAX_ZIP_UNCOMPRESSED = 100 * 1024 * 1024;
const MAX_ZIP_TEXT = 3 * 1024 * 1024;
const MAX_ZIP_FILE_SIZE = 300 * 1024;
const ZIP_CHUNK_SIZE = 1500;

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

// files that never help the AI: folders, deps, builds, locks, env, binaries
const SKIP_SEGMENT = /(^|\/)(node_modules|\.git|dist|build)(\/|$)/i;
const SKIP_BINARY = /\.(png|jpe?g|gif|webp|ico|bmp|tiff?|pdf|zip|rar|7z|tar|gz|bz2|xz|exe|dll|so|dylib|bin|dmg|iso|apk|jar|class|pyc|wasm|node|woff2?|ttf|otf|eot|mp3|mp4|mov|avi|webm|wav|ogg|db|sqlite|psd|sketch|swf)$/i;
const SKIP_NAME = /(^|\/)(package-lock\.json|yarn\.lock|pnpm-lock\.yaml|composer\.lock|\.env[^\/]*|\.DS_Store)$/i;

const shouldSkip = (path) =>
  SKIP_SEGMENT.test(path) || SKIP_BINARY.test(path) || SKIP_NAME.test(path);

// parses a zip in memory: file tree + text chunks for the AI (no disk, no Cloudinary)
const processZip = (buffer) => {
  const zip = new AdmZip(buffer);
  const entries = zip.getEntries();

  if (entries.length > MAX_ZIP_ENTRIES) {
    throw new Error("ZIP Has Too Many Files (Max 3000)...");
  }

  let uncompressed = 0;
  for (const entry of entries) uncompressed += entry.header.size;
  if (uncompressed > MAX_ZIP_UNCOMPRESSED) {
    throw new Error("ZIP Is Too Large When Unpacked (Max 100 MB)...");
  }

  const kept = [];
  const chunks = [];
  let skippedCount = 0;
  let totalText = 0;

  for (const entry of entries) {
    const path = entry.entryName.replace(/\\/g, "/");

    if (
      entry.isDirectory ||
      shouldSkip(path) ||
      entry.header.size > MAX_ZIP_FILE_SIZE
    ) {
      skippedCount += 1;
      continue;
    }

    const clean = stripReservedTags(entry.getData().toString("utf8"));

    // stop indexing when the total text budget is used up
    if (totalText + clean.length > MAX_ZIP_TEXT) {
      skippedCount += 1;
      continue;
    }
    totalText += clean.length;

    kept.push(path);

    // split into ~1500-char chunks, keeping the file path and order
    for (let i = 0; i < clean.length; i += ZIP_CHUNK_SIZE) {
      chunks.push({ path, order: chunks.length, text: clean.slice(i, i + ZIP_CHUNK_SIZE) });
    }
  }

  const tree = kept.join("\n").slice(0, 10000);

  return { tree, chunks, fileCount: kept.length, skippedCount };
};

const uploadFiles = async (req, res) => {
  const results = [];

  for (const file of req.files) {
    if (file.kind === "zip") {
      // zips are indexed for text search, never stored on disk or Cloudinary
      const parsed = processZip(file.buffer);

      const document = await Document.create({
        userId: req.user._id,
        name: file.safeName,
        tree: parsed.tree,
        fileCount: parsed.fileCount,
        skippedCount: parsed.skippedCount,
      });

      if (parsed.chunks.length > 0) {
        await DocChunk.insertMany(
          parsed.chunks.map((chunk) => ({
            documentId: document._id,
            userId: req.user._id,
            path: chunk.path,
            order: chunk.order,
            text: chunk.text,
          })),
        );
      }

      results.push({
        documentId: document._id,
        name: file.safeName,
        type: "zip",
        tree: parsed.tree,
        fileCount: parsed.fileCount,
        skippedCount: parsed.skippedCount,
      });
      continue;
    }

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
