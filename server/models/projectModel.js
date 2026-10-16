import mongoose from "mongoose";

export const DEFAULT_PROJECT_NAME = "Untitled Project";

export const PROJECT_LIMITS = {
  maxFiles: 100,
  maxFileChars: 200000,
  maxTotalChars: 600000,
  maxVersions: 8,
};

const fileSchema = new mongoose.Schema(
  {
    path: {
      type: String,
      required: true,
    },
    content: {
      type: String,
      default: "",
    },
  },
  { _id: false },
);

const versionSchema = new mongoose.Schema({
  label: {
    type: String,
    default: "",
  },
  files: [fileSchema],
  createdAt: {
    type: Date,
    default: Date.now,
  },
});

const projectSchema = new mongoose.Schema(
  {
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: [true, "Please Enter Project Name:"],
      trim: true,
      maxlength: 60,
      default: DEFAULT_PROJECT_NAME,
    },
    files: [fileSchema],
    versions: [versionSchema],
  },
  {
    timestamps: true,
  },
);

projectSchema.index({ user: 1, updatedAt: -1 });

const Project = mongoose.model("Project", projectSchema);

export default Project;
