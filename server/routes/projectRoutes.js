import express from "express";
import projectController from "../controllers/project/projectController.js";
import protect from "../middleware/authMiddleware.js";
import validation from "../middleware/validateMiddleware.js";

const router = express.Router();
const { validate, validateId, schemas } = validation;

router.get("/", protect.forUser, projectController.getAllProjects);
router.post(
  "/",
  protect.forUser,
  validate(schemas.createProject),
  projectController.createProject,
);
router.get("/:id", protect.forUser, validateId("id"), projectController.getSingleProject);
router.patch(
  "/:id",
  protect.forUser,
  validateId("id"),
  validate(schemas.renameProject),
  projectController.updateProject,
);
router.delete("/:id", protect.forUser, validateId("id"), projectController.deleteProject);

router.put(
  "/:id/files",
  protect.forUser,
  validateId("id"),
  validate(schemas.saveFiles),
  projectController.saveFiles,
);
router.get("/:id/versions", protect.forUser, validateId("id"), projectController.getVersions);
router.post(
  "/:id/versions/:versionId/restore",
  protect.forUser,
  validateId("id", "versionId"),
  projectController.restoreVersion,
);

export default router;
