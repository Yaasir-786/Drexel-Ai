import express from "express";
import uploadController from "../controllers/upload/uploadController.js";
import protect from "../middleware/authMiddleware.js";
import limiter from "../middleware/rateLimitMiddleware.js";
import upload from "../middleware/fileUploadMiddleware.js";
import scanFiles from "../middleware/fileScanMiddleware.js";

const router = express.Router();

router.post(
  "/",
  protect.forUser,
  limiter.uploadLimiter,
  upload.array("files", 3),
  scanFiles,
  uploadController.uploadFiles,
);
router.delete("/:publicId", protect.forUser, uploadController.deleteFile);

export default router;
