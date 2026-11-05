import dns from "dns";
dns.setDefaultResultOrder("ipv4first");
dns.setServers(["8.8.8.8", "8.8.4.4"]);

import "dotenv/config";
import express from "express";
import helmet from "helmet";
import cors from "cors";
import colors from "colors";
import path from "path";
import { fileURLToPath } from "url";
import connectDb from "./config/dbConfig.js";

import errorHandler, { notFound } from "./middleware/errorHandler.js";
import limiter from "./middleware/rateLimitMiddleware.js";
import healthRoutes from "./routes/healthRoutes.js";
import authRoutes from "./routes/authRoutes.js";
import userRoutes from "./routes/userRoutes.js";
import creditRoutes from "./routes/creditRoutes.js";
import projectRoutes from "./routes/projectRoutes.js";
import chatRoutes from "./routes/chatRoutes.js";
import chatListRoutes from "./routes/chatListRoutes.js";
import agentRoutes from "./routes/agentRoutes.js";
import uploadRoutes from "./routes/uploadRoutes.js";
import adminRoutes from "./routes/adminRoutes.js";

// ENV CHECK
const missingEnv = ["MONGO_URI", "JWT_SECRET"].filter(
  (key) => !process.env[key],
);
if (missingEnv.length > 0) {
  console.log(`MISSING ENV VARIABLES: ${missingEnv.join(", ")}`);
  process.exit(1);
}
if (process.env.JWT_SECRET.length < 16) {
  console.log("WARNING: JWT_SECRET is too short, use a long random string");
}
if (!process.env.LLM_API_KEY) {
  console.log("WARNING: LLM_API_KEY is missing, AI agents will not work");
}

const app = express();
const PORT = process.env.PORT || 5000;

// DB CONNECTION
connectDb();

// Security headers + CORS (only our own frontend)
if (process.env.NODE_ENV === "production") app.set("trust proxy", 1);
// CSP is off because the app is served from the same origin as the API and
// loads Google Fonts, Cloudinary images and the Sandpack preview iframe.
app.use(
  helmet({ contentSecurityPolicy: false, crossOriginEmbedderPolicy: false }),
);
app.use(cors({ origin: process.env.CLIENT_URL || "http://localhost:5173" }));

// Body-Parser
app.use(express.json({ limit: "2mb" }));
app.use(express.urlencoded({ extended: false, limit: "100kb" }));

// Rate limit for every API route
app.use("/api", limiter.apiLimiter);

// HEALTH ROUTES
app.use("/api/health", healthRoutes);

// AUTH ROUTES
app.use("/api/auth", authRoutes);

// USER ROUTES (onboarding, profile)
app.use("/api/users", userRoutes);

// CREDIT ROUTES
app.use("/api/credits", creditRoutes);

// PROJECT ROUTES (+ chat history of a project)
app.use("/api/projects", projectRoutes);
app.use("/api/projects", chatRoutes);

// CHAT ROUTES (standalone chats)
app.use("/api/chats", chatListRoutes);

// A.I AGENT ROUTES (planner + coder, streaming)
app.use("/api/agent", agentRoutes);

// UPLOAD ROUTES
app.use("/api/uploads", uploadRoutes);

// ADMIN ROUTES
app.use("/api/admin", adminRoutes);

// Unknown /api routes -> JSON 404
app.use("/api", notFound);

// SERVE REACT PRODUCTION BUILD (same as Docker image: ../Client/dist)
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const frontendPath = path.join(__dirname, "../Client/dist");

if (process.env.NODE_ENV === "production") {
  app.use(express.static(frontendPath));
  app.get("/{*path}", (req, res) => {
    res.sendFile(path.join(frontendPath, "index.html"));
  });
}

// 404 + error Handle
app.use(notFound);
app.use(errorHandler);

app.listen(PORT, () => {
  console.log(`SERVER IS RUNNING AT PORT: ${PORT}`.bgBlue);
});
