import express from "express";
import authController from "../controllers/auth/authController.js";
import protect from "../middleware/authMiddleware.js";
import limiter from "../middleware/rateLimitMiddleware.js";
import validation from "../middleware/validateMiddleware.js";

const router = express.Router();
const { validate, schemas } = validation;

router.post(
  "/signup",
  limiter.authLimiter,
  validate(schemas.signup),
  authController.userRegister,
);
router.post(
  "/login",
  limiter.authLimiter,
  validate(schemas.login),
  authController.userLogin,
);
router.get("/me", protect.forUser, authController.getMyProfile);
router.put(
  "/password",
  protect.forUser,
  limiter.authLimiter,
  validate(schemas.changePassword),
  authController.changePassword,
);

export default router;
