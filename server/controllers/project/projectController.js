import Project, { PROJECT_LIMITS } from "../../models/projectModel.js";
import Chat from "../../models/chatModel.js";

const getAllProjects = async (req, res) => {
  const projects = await Project.find({ user: req.user._id })
    .select("name createdAt updatedAt")
    .sort({ updatedAt: -1 });

  res.status(200).json(projects);
};

const createProject = async (req, res) => {
  const { name } = req.body;

  const project = await Project.create({
    user: req.user._id,
    ...(name && { name }),
  });

  await Chat.create({ project: project._id, user: req.user._id });

  res.status(201).json({
    _id: project._id,
    name: project.name,
    files: [],
    createdAt: project.createdAt,
    updatedAt: project.updatedAt,
  });
};

const getSingleProject = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("-versions");

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  res.status(200).json(project);
};

const updateProject = async (req, res) => {
  const result = await Project.updateOne(
    { _id: req.params.id, user: req.user._id },
    { $set: { name: req.body.name } },
  );

  if (result.matchedCount === 0) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  const project = await Project.findById(req.params.id).select("-versions");

  res.status(200).json(project);
};

const deleteProject = async (req, res) => {
  const project = await Project.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  await Chat.deleteOne({ project: project._id });

  res.status(200).json({ message: "Project Deleted SuccessFully..." });
};

// saves files edited by the user in the code editor (replaces the file list)
const saveFiles = async (req, res) => {
  const unique = new Map();
  for (const file of req.body.files) unique.set(file.path, file.content);

  const files = [...unique].map(([path, content]) => ({ path, content }));
  const totalChars = files.reduce((sum, file) => sum + file.content.length, 0);

  if (files.length > PROJECT_LIMITS.maxFiles || totalChars > PROJECT_LIMITS.maxTotalChars) {
    res.status(413);
    throw new Error("Project Is Too Large To Save...");
  }

  const result = await Project.updateOne(
    { _id: req.params.id, user: req.user._id },
    { $set: { files } },
  );

  if (result.matchedCount === 0) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  const project = await Project.findById(req.params.id).select("-versions");

  res.status(200).json(project);
};

const getVersions = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("versions");

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  const versions = project.versions
    .map((version) => ({
      _id: version._id,
      label: version.label,
      fileCount: version.files.length,
      createdAt: version.createdAt,
    }))
    .reverse();

  res.status(200).json(versions);
};

const restoreVersion = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("versions");

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  const version = project.versions.id(req.params.versionId);

  if (!version) {
    res.status(404);
    throw new Error("Version Not Found...");
  }

  const files = version.files.map((file) => ({ path: file.path, content: file.content }));

  await Project.updateOne(
    { _id: project._id },
    {
      $set: { files },
      $push: {
        versions: {
          $each: [{ label: `Restored: ${version.label}`.slice(0, 100), files }],
          $slice: -PROJECT_LIMITS.maxVersions,
        },
      },
    },
  );

  const restored = await Project.findById(project._id).select("-versions");

  res.status(200).json(restored);
};

const projectController = {
  getAllProjects,
  createProject,
  getSingleProject,
  updateProject,
  deleteProject,
  saveFiles,
  getVersions,
  restoreVersion,
};

export default projectController;
