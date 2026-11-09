import crypto from "node:crypto";
import AdmZip from "adm-zip";
import { PDFParse } from "pdf-parse";
import cloudinaryService from "../../middleware/cloudinaryMiddleware.js";
import Document from "../../models/documentModel.js";
import DocChunk from "../../models/docChunkModel.js";
import { stripReservedTags } from "../../agents/prompts.js";
import { analyzeImage } from "../../agents/imageAnalyzer.js";

const MAX_PDF_TEXT = 15000;

// zip indexing guards (env configurable)
const MAX_ZIP_ENTRIES = Number(process.env.MAX_ZIP_ENTRIES) || 8000;
const MAX_ZIP_UNCOMPRESSED =
  (Number(process.env.MAX_ZIP_UNCOMPRESSED_MB) || 300) * 1024 * 1024;
const MAX_ZIP_TEXT =
  (Number(process.env.MAX_ZIP_TEXT_MB) || 8) * 1024 * 1024;
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
    throw new Error(`ZIP Has Too Many Files (Max ${MAX_ZIP_ENTRIES})...`);
  }

  let uncompressed = 0;
  for (const entry of entries) uncompressed += entry.header.size;
  if (uncompressed > MAX_ZIP_UNCOMPRESSED) {
    throw new Error(
      `ZIP Is Too Large When Unpacked (Max ${MAX_ZIP_UNCOMPRESSED / (1024 * 1024)} MB)...`,
    );
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
      // zips are indexed for text search; the original bytes also go to Cloudinary
      const parsed = processZip(file.buffer);

      // keep the original zip so the chat can hand it back as a download
      let zipUrl = null;
      let zipPublicId = null;
      try {
        const uploaded = await cloudinaryService.uploadToCloudinary(file.buffer, {
          public_id: `delux_${req.user._id}_${crypto.randomUUID()}`,
          resource_type: "raw",
        });
        zipUrl = uploaded.secure_url;
        zipPublicId = uploaded.public_id;
      } catch (error) {
        // indexing still worked, the download falls back to the rebuilt text files
        console.log(`ZIP UPLOAD FAILED... ${error.message}`);
      }

      const document = await Document.create({
        userId: req.user._id,
        name: file.safeName,
        tree: parsed.tree,
        fileCount: parsed.fileCount,
        skippedCount: parsed.skippedCount,
        zipUrl,
        zipPublicId,
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
    // pdfs keep their extracted text, images keep the local OCR + color analysis
    const text =
      file.kind === "pdf"
        ? await extractPdfText(file.buffer)
        : file.kind === "image"
          ? await analyzeImage(file.buffer)
          : undefined;

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

const uploadController = { uploadFiles };

export default uploadController;
