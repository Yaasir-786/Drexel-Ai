import express from "express";
import healthController from "../controllers/health/healthController.js";

const router = express.Router();

router.get("/", healthController.checkHealth);

export default router;
