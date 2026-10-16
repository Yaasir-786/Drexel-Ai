import express from "express";
import chatController from "../controllers/chat/chatController.js";
import protect from "../middleware/authMiddleware.js";
import validation from "../middleware/validateMiddleware.js";

const router = express.Router();
const { validateId } = validation;

// mounted on /api/projects  ->  /api/projects/:id/chat
router.get("/:id/chat", protect.forUser, validateId("id"), chatController.getChat);
router.delete("/:id/chat", protect.forUser, validateId("id"), chatController.clearChat);

export default router;
