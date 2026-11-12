import Chat from "../../models/chatModel.js";
import Project from "../../models/projectModel.js";
import credit from "../../middleware/creditMiddleware.js";

const getUsage = async (req, res) => {
  const user = req.user;

  const chats = await Chat.find({ user: user._id })
    .select("title creditsUsed tokensUsed messages.mode messages.agent messages.creditsUsed messages.tokensUsed messages.createdAt")
    .lean();

  const projects = await Project.find({ user: user._id })
    .select("name creditsUsed tokensUsed messages.mode messages.agent messages.creditsUsed messages.tokensUsed messages.createdAt")
    .lean();

  const items = [
    ...chats.map((c) => ({ ...c, projectId: null, name: c.title || "Chat" })),
    ...projects.map((p) => ({ ...p, projectId: p._id, name: p.name })),
  ];

  const byProject = items
    .filter((i) => i.creditsUsed > 0)
    .sort((a, b) => b.creditsUsed - a.creditsUsed)
    .slice(0, 20);

  const recent = items
    .flatMap((i) => (i.messages || []).filter((m) => m.creditsUsed > 0).map((m) => ({ ...m, projectId: i.projectId, projectName: i.name })))
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);

  res.status(200).json({
    credits: credit.round2(user.credits),
    dailyUsed: credit.round2(user.dailyUsed),
    dailyLimit: credit.dailyLimitFor(user),
    totalCreditsUsed: credit.round2(user.totalCreditsUsed),
    totalTokensUsed: user.totalTokensUsed,
    byProject: byProject.map((i) => ({
      projectId: i.projectId,
      name: i.name,
      credits: credit.round2(i.creditsUsed),
      tokens: i.tokensUsed,
    })),
    recent: recent.map((m) => ({
      projectId: m.projectId,
      projectName: m.projectName,
      mode: m.mode,
      agent: m.agent,
      creditsUsed: credit.round2(m.creditsUsed),
      tokensUsed: m.tokensUsed,
      createdAt: m.createdAt,
    })),
  });
};

const creditController = { getUsage };

export default creditController;