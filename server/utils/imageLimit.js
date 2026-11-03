import ImageUsage from "../models/imageUsageModel.js";

// daily image limit from the environment (default 10)
export const IMAGE_DAILY_LIMIT = Number(process.env.IMAGE_DAILY_LIMIT) || 10;

// today in UTC as YYYY-MM-DD
const today = () => new Date().toISOString().slice(0, 10);

// reserves one image slot for the user, admins are not limited
// returns false when the daily limit is reached
export const reserveImage = async (user) => {
  if (user.userType === "ADMIN") return true;

  try {
    await ImageUsage.findOneAndUpdate(
      { userId: user._id, day: today(), count: { $lt: IMAGE_DAILY_LIMIT } },
      { $inc: { count: 1 } },
      { upsert: true },
    );
    return true;
  } catch (error) {
    // duplicate key: the user already sits at the limit today
    if (error.code === 11000) return false;
    throw error;
  }
};

// gives a reserved slot back after a failed generation
export const refundImage = async (user) => {
  if (user.userType === "ADMIN") return;
  await ImageUsage.updateOne(
    { userId: user._id, day: today(), count: { $gt: 0 } },
    { $inc: { count: -1 } },
  );
};
