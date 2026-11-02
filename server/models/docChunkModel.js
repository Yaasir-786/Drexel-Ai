import mongoose from "mongoose";

// a searchable text chunk of one file inside an indexed ZIP
const docChunkSchema = new mongoose.Schema(
  {
    documentId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Document",
      required: true,
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    path: {
      type: String,
      required: true,
    },
    order: {
      type: Number,
      default: 0,
    },
    text: {
      type: String,
      required: true,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "30d",
    },
  },
);

// text search over the chunk text and file paths
docChunkSchema.index({ text: "text", path: "text" });
docChunkSchema.index({ documentId: 1 });

const docChunkModel = mongoose.model("DocChunk", docChunkSchema);

export default docChunkModel;
