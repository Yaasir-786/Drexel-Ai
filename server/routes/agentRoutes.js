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

export default router;
