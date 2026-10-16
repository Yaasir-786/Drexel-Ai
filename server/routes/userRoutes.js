import express from "express";
import userController from "../controllers/user/userController.js";
import protect from "../middleware/authMiddleware.js";
import validation from "../middleware/validateMiddleware.js";

const router = express.Router();
const { validate, schemas } = validation;

router.post(
  "/onboarding",
  protect.forUser,
  validate(schemas.onboarding),
  userController.completeOnboarding,
);
router.patch(
  "/profile",
  protect.forUser,
  validate(schemas.updateProfile),
  userController.updateProfile,
);

export default router;
