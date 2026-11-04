import express from "express";
import agentController from "../controllers/agent/agentController.js";
import protect from "../middleware/authMiddleware.js";
import limiter from "../middleware/rateLimitMiddleware.js";
import validation from "../middleware/validateMiddleware.js";
import credit from "../middleware/creditMiddleware.js";

const router = express.Router();
const { validate, schemas } = validation;

router.post(
  "/stream",
  protect.forUser,
  limiter.agentLimiter,
  validate(schemas.agent),
  credit.checkCredits,
  agentController.streamAgent,
);

// explicit stop: abort a running stream by requestId (no credit check needed)
router.post(
  "/stop",
  protect.forUser,
  validate(schemas.stopAgent),
  agentController.stopAgent,
);

router.post(
  "/image-edit",
  protect.forUser,
  limiter.agentLimiter,
  credit.checkCredits,
  validate(schemas.imageEdit),
  agentController.imageEdit,
);

export default router;
