import { fileTypeFromBuffer } from "file-type";

// real file type (magic bytes) -> allowed extension
const ALLOWED_TYPES = {
  jpg: { mime: "image/jpeg", kind: "image" },
  png: { mime: "image/png", kind: "image" },
  pdf: { mime: "application/pdf", kind: "pdf" },
};

// active content inside a PDF (scripts, auto launch, embedded files)
const DANGEROUS_PDF = /\/(JavaScript|JS|Launch|EmbeddedFile)\b/;

const cleanName = (name) => {
  const clean = name
    .replace(/[^A-Za-z0-9._-]/g, "_")
    .replace(/\.{2,}/g, ".")
    .slice(0, 80);
  return clean || "file";
};

// does NOT trust extension or mime type sent by the browser, checks the real bytes
const scanFiles = async (req, res, next) => {
  if (!req.files || req.files.length === 0) {
    res.status(400);
    throw new Error("No File Uploaded...");
  }

  for (const file of req.files) {
    const detected = await fileTypeFromBuffer(file.buffer);
    const allowed = detected ? ALLOWED_TYPES[detected.ext] : null;

    if (!allowed || detected.mime !== allowed.mime) {
      res.status(400);
      throw new Error(`File "${cleanName(file.originalname)}" Is Not A Valid JPG, PNG Or PDF...`);
    }

    const declared = file.originalname.split(".").pop().toLowerCase().replace("jpeg", "jpg");
    if (declared !== detected.ext) {
      res.status(400);
      throw new Error(`File "${cleanName(file.originalname)}" Content Does Not Match Its Extension...`);
    }

    if (allowed.kind === "pdf" && DANGEROUS_PDF.test(file.buffer.toString("latin1"))) {
      res.status(400);
      throw new Error(`PDF "${cleanName(file.originalname)}" Contains Active Content And Was Rejected...`);
    }

    file.kind = allowed.kind;
    file.detectedMime = allowed.mime;
    file.safeName = cleanName(file.originalname);
  }

  next();
};

export default scanFiles;
