import mongoose from "mongoose";

// one counter per user and UTC day for the daily image limit
const imageUsageSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: true,
    },
    day: {
      type: String,
      required: true,
    },
    count: {
      type: Number,
      default: 0,
    },
    createdAt: {
      type: Date,
      default: Date.now,
      expires: "3d",
    },
  },
);

// exactly one document per user and day
imageUsageSchema.index({ userId: 1, day: 1 }, { unique: true });

const imageUsageModel = mongoose.model("ImageUsage", imageUsageSchema);

export default imageUsageModel;
