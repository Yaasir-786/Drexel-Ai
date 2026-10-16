import rateLimit from "express-rate-limit";

const makeLimiter = ({ windowMs, limit, message, keyGenerator }) =>
  rateLimit({
    windowMs,
    limit,
    standardHeaders: "draft-7",
    legacyHeaders: false,
    message: { message },
    ...(keyGenerator && { keyGenerator }),
  });

// per user limiters must run AFTER protect.forUser
const byUser = (req) => String(req.user._id);

// every /api request (per IP)
const apiLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 600,
  message: "Too Many Requests, Please Try Again Later...",
});

// signup / login / forgot / reset (per IP)
const authLimiter = makeLimiter({
  windowMs: 15 * 60 * 1000,
  limit: 20,
  message: "Too Many Attempts, Please Try Again After 15 Minutes...",
});

// AI agent calls (per user)
const agentLimiter = makeLimiter({
  windowMs: 60 * 1000,
  limit: 8,
  message: "Too Many AI Requests, Please Wait A Minute...",
  keyGenerator: byUser,
});

// file uploads (per user)
const uploadLimiter = makeLimiter({
  windowMs: 10 * 60 * 1000,
  limit: 20,
  message: "Too Many Uploads, Please Try Again Later...",
  keyGenerator: byUser,
});

const limiter = { apiLimiter, authLimiter, agentLimiter, uploadLimiter };

export default limiter;
