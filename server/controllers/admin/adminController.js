import User from "../../models/userModel.js";
import Project from "../../models/projectModel.js";
import Chat from "../../models/chatModel.js";
import credit from "../../middleware/creditMiddleware.js";

const escapeRegex = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");

const getStats = async (req, res) => {
  const today = credit.todayKey();

  const sumOf = async (field, match = {}) => {
    const result = await User.aggregate([
      { $match: match },
      { $group: { _id: null, total: { $sum: `$${field}` } } },
    ]);
    return result[0]?.total || 0;
  };

  const [users, blockedUsers, admins, projects, chats, tokens, credits, creditsToday] =
    await Promise.all([
      User.countDocuments(),
      User.countDocuments({ isActive: false }),
      User.countDocuments({ userType: "ADMIN" }),
      Project.countDocuments(),
      Chat.countDocuments(),
      sumOf("totalTokensUsed"),
      sumOf("totalCreditsUsed"),
      sumOf("dailyUsed", { dailyDate: today }),
    ]);

  res.status(200).json({
    users,
    blockedUsers,
    admins,
    projects,
    chats,
    totalTokensUsed: tokens,
    totalCreditsUsed: credit.round2(credits),
    creditsUsedToday: credit.round2(creditsToday),
  });
};

const getAllUsers = async (req, res) => {
  const page = Math.max(parseInt(req.query.page, 10) || 1, 1);
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 20, 1), 50);
  const search = typeof req.query.search === "string" ? req.query.search.trim().slice(0, 50) : "";

  const filter = {};
  if (search) {
    const regex = new RegExp(escapeRegex(search), "i");
    filter.$or = [{ name: regex }, { email: regex }];
  }

  const [users, total] = await Promise.all([
    User.find(filter)
      .sort({ createdAt: -1 })
      .skip((page - 1) * limit)
      .limit(limit),
    User.countDocuments(filter),
  ]);

  res.status(200).json({
    users,
    total,
    page,
    pages: Math.max(Math.ceil(total / limit), 1),
  });
};

const getSingleUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User Not Found...");
  }

  const projectCount = await Project.countDocuments({ user: user._id });

  res.status(200).json({
    user,
    projectCount,
    totalTokensUsed: user.totalTokensUsed,
    totalCreditsUsed: credit.round2(user.totalCreditsUsed),
  });
};

const updateUserCredits = async (req, res) => {
  const { action, amount } = req.body;

  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User Not Found...");
  }

  let credits = user.credits;
  if (action === "add") credits += amount;
  if (action === "remove") credits = Math.max(0, credits - amount);
  if (action === "set") credits = amount;

  await User.updateOne({ _id: user._id }, { $set: { credits: credit.round2(credits) } });

  const updated = await User.findById(user._id);

  res.status(200).json(updated);
};

const updateUserBlock = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User Not Found...");
  }

  if (String(user._id) === String(req.user._id) || user.userType === "ADMIN") {
    res.status(403);
    throw new Error("Admin Accounts Cannot Be Blocked...");
  }

  await User.updateOne({ _id: user._id }, { $set: { isActive: req.body.isActive } });

  const updated = await User.findById(user._id);

  res.status(200).json(updated);
};

const deleteUser = async (req, res) => {
  const user = await User.findById(req.params.id);

  if (!user) {
    res.status(404);
    throw new Error("User Not Found...");
  }

  if (String(user._id) === String(req.user._id) || user.userType === "ADMIN") {
    res.status(403);
    throw new Error("Admin Accounts Cannot Be Deleted...");
  }

  await Promise.all([
    Project.deleteMany({ user: user._id }),
    Chat.deleteMany({ user: user._id }),
  ]);
  await User.deleteOne({ _id: user._id });

  res.status(200).json({ message: "User Deleted SuccessFully..." });
};

const adminController = {
  getStats,
  getAllUsers,
  getSingleUser,
  updateUserCredits,
  updateUserBlock,
  deleteUser,
};

export default adminController;
