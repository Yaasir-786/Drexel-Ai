import mongoose from "mongoose";

// an indexed ZIP project (the original zip is kept on Cloudinary)
const documentSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    name: {
      type: String,
      required: true,
    },
    tree: {
      type: String,
      default: "",
    },
    fileCount: {
      type: Number,
      default: 0,
    },
    skippedCount: {
      type: Number,
      default: 0,
    },
    zipUrl: {
      type: String,
      default: null,
    },
    zipPublicId: {
      type: String,
      default: null,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
);

const documentModel = mongoose.model("Document", documentSchema);

export default documentModel;
