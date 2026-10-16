import User from "../models/userModel.js";

const todayKey = () => new Date().toISOString().slice(0, 10);

const dailyLimit = () => Number(process.env.DAILY_CREDIT_LIMIT) || 100;

// 1 credit = 1000 tokens by default (CREDITS_PER_1K_TOKENS in .env)
const tokensToCredits = (tokens) => {
  const rate = Number(process.env.CREDITS_PER_1K_TOKENS) || 1;
  return Math.round((tokens / 1000) * rate * 100) / 100;
};

const round2 = (value) => Math.round(value * 100) / 100;

// runs before the agent: enough credits + daily limit not crossed
const checkCredits = async (req, res, next) => {
  const user = req.user;
  const isBuild = req.body.mode === "build" || req.body.type === "fix";
  const needed = isBuild ? Number(process.env.BUILD_MIN_CREDITS) || 10 : 1;

  if (user.credits < needed) {
    res.status(402);
    throw new Error(`Not Enough Credits... You Need At Least ${needed} Credits...`);
  }

  const usedToday = user.dailyDate === todayKey() ? user.dailyUsed : 0;
  if (usedToday >= dailyLimit()) {
    res.status(429);
    throw new Error("Daily Credit Limit Reached, Please Try Again Tomorrow...");
  }

  next();
};

// runs after the agent: atomic deduction, credits never go below 0
const deductCredits = async (userId, credits, tokens = 0) => {
  if (!(credits > 0)) return User.findById(userId);

  const today = todayKey();

  // new day -> reset the daily counter (safe to run many times)
  await User.updateOne(
    { _id: userId, dailyDate: { $ne: today } },
    { $set: { dailyDate: today, dailyUsed: 0 } },
  );

  // enough credits -> subtract (one atomic query)
  const result = await User.updateOne(
    { _id: userId, credits: { $gte: credits } },
    {
      $inc: {
        credits: -credits,
        dailyUsed: credits,
        totalCreditsUsed: credits,
        totalTokensUsed: tokens,
      },
    },
  );

  // not enough credits -> balance becomes 0, never negative
  if (result.modifiedCount === 0) {
    await User.updateOne(
      { _id: userId },
      {
        $set: { credits: 0 },
        $inc: { dailyUsed: credits, totalCreditsUsed: credits, totalTokensUsed: tokens },
      },
    );
  }

  return User.findById(userId);
};

const credit = {
  checkCredits,
  deductCredits,
  tokensToCredits,
  todayKey,
  dailyLimit,
  round2,
};

export default credit;
