import express from "express";
import chatController from "../controllers/chat/chatController.js";
import protect from "../middleware/authMiddleware.js";
import validation from "../middleware/validateMiddleware.js";

const router = express.Router();
const { validate, validateId, schemas } = validation;

router.get("/", protect.forUser, chatController.getChats);
router.post(
  "/",
  protect.forUser,
  validate(schemas.createChat),
  chatController.createChat,
);
router.get("/:id", protect.forUser, validateId("id"), chatController.getChatById);
router.delete("/:id", protect.forUser, validateId("id"), chatController.deleteChat);

export default router;
