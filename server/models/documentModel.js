import mongoose from "mongoose";

// an indexed ZIP project (the zip itself is never stored)
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
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "30d",
    },
  },
);

const documentModel = mongoose.model("Document", documentSchema);

export default documentModel;
