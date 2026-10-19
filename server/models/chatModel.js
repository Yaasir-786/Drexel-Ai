import mongoose from "mongoose";

export const MAX_CHAT_MESSAGES = 200;

const attachmentSchema = new mongoose.Schema(
  {
    url: { type: String, required: true },
    publicId: { type: String },
    name: { type: String },
    type: { type: String, enum: ["image", "pdf"] },
  },
  { _id: false },
);

const messageSchema = new mongoose.Schema(
  {
    role: {
      type: String,
      enum: ["user", "assistant"],
      required: true,
    },
    mode: {
      type: String,
      enum: ["chat", "build"],
      default: "chat",
    },
    agent: {
      type: String,
      enum: ["planner", "coder"],
    },
    content: {
      type: String,
      default: "",
    },
    attachments: [attachmentSchema],
    files: [String],
    tokensUsed: {
      type: Number,
      default: 0,
    },
    creditsUsed: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
    },
  },
  { _id: false },
);

const fileSchema = new mongoose.Schema(
  {
    path: { type: String, required: true },
    content: { type: String, default: "" },
  },
  { _id: false },
);

const chatSchema = new mongoose.Schema(
  {
    project: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Project",
      unique: true,
      sparse: true,
    },
    title: {
      type: String,
      default: "New chat",
      trim: true,
      maxlength: 60,
    },
    user: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
      index: true,
    },
    creditsUsed: {
      type: Number,
      default: 0,
    },
    tokensUsed: {
      type: Number,
      default: 0,
    },
    files: [fileSchema],
    preview: {
      type: Boolean,
      default: true,
    },
    messages: [messageSchema],
  },
  {
    timestamps: true,
  },
);

const Chat = mongoose.model("Chat", chatSchema);

export default Chat;
