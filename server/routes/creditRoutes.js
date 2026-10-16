import express from "express";
import creditController from "../controllers/credit/creditController.js";
import protect from "../middleware/authMiddleware.js";

const router = express.Router();

router.get("/usage", protect.forUser, creditController.getUsage);

export default router;
