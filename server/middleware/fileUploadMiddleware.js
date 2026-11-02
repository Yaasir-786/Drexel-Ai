import multer from "multer";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf", "zip"];
const ALLOWED_MIME = [
  "image/jpeg",
  "image/png",
  "application/pdf",
  "application/zip",
  "application/x-zip-compressed",
  // some browsers send zips as a generic stream, the magic bytes check decides
  "application/octet-stream",
];

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_ZIP_SIZE = 20 * 1024 * 1024;
export const MAX_FILES = 3;

// files stay in memory (never written to disk), they go straight to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const extension = file.originalname.split(".").pop().toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension) || !ALLOWED_MIME.includes(file.mimetype)) {
    const error = new Error("Only JPG, JPEG, PNG, PDF And ZIP Files Are Allowed...");
    error.status = 400;
    return cb(error);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  // the real per-kind size limits are enforced in the scan middleware
  limits: { fileSize: MAX_ZIP_SIZE, files: MAX_FILES },
});

export default upload;
