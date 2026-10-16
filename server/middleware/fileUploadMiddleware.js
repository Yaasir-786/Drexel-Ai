import multer from "multer";

const ALLOWED_EXTENSIONS = ["jpg", "jpeg", "png", "pdf"];
const ALLOWED_MIME = ["image/jpeg", "image/png", "application/pdf"];

export const MAX_FILE_SIZE = 5 * 1024 * 1024;
export const MAX_FILES = 3;

// files stay in memory (never written to disk), they go straight to Cloudinary
const storage = multer.memoryStorage();

const fileFilter = (req, file, cb) => {
  const extension = file.originalname.split(".").pop().toLowerCase();

  if (!ALLOWED_EXTENSIONS.includes(extension) || !ALLOWED_MIME.includes(file.mimetype)) {
    const error = new Error("Only JPG, JPEG, PNG And PDF Files Are Allowed...");
    error.status = 400;
    return cb(error);
  }

  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter,
  limits: { fileSize: MAX_FILE_SIZE, files: MAX_FILES },
});

export default upload;
