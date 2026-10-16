import express from "express";
import adminController from "../controllers/admin/adminController.js";
import protect from "../middleware/authMiddleware.js";
import validation from "../middleware/validateMiddleware.js";

const router = express.Router();
const { validate, validateId, schemas } = validation;

router.get("/stats", protect.forAdmin, adminController.getStats);
router.get("/users", protect.forAdmin, adminController.getAllUsers);
router.get("/users/:id", protect.forAdmin, validateId("id"), adminController.getSingleUser);

router.patch(
  "/users/:id/credits",
  protect.forAdmin,
  validateId("id"),
  validate(schemas.adminCredits),
  adminController.updateUserCredits,
);
router.patch(
  "/users/:id/block",
  protect.forAdmin,
  validateId("id"),
  validate(schemas.adminBlock),
  adminController.updateUserBlock,
);
router.delete("/users/:id", protect.forAdmin, validateId("id"), adminController.deleteUser);

export default router;
