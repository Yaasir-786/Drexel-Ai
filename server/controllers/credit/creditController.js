import Chat from "../../models/chatModel.js";
import Project from "../../models/projectModel.js";
import credit from "../../middleware/creditMiddleware.js";

const getUsage = async (req, res) => {
  const user = req.user;

  const chats = await Chat.find({ user: user._id })
    .select("project creditsUsed tokensUsed messages.mode messages.agent messages.creditsUsed messages.tokensUsed messages.createdAt")
    .lean();

  // credits spent per project
  const byProject = chats
    .filter((chat) => chat.creditsUsed > 0)
    .sort((a, b) => b.creditsUsed - a.creditsUsed)
    .slice(0, 20);

  // latest 20 messages that cost credits
  const recent = chats
    .flatMap((chat) =>
      chat.messages
        .filter((message) => message.creditsUsed > 0)
        .map((message) => ({ ...message, project: chat.project })),
    )
    .sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt))
    .slice(0, 20);

  const ids = [
    ...new Set([...byProject.map((c) => String(c.project)), ...recent.map((m) => String(m.project))]),
  ];
  const projects = await Project.find({ _id: { $in: ids } }).select("name");
  const names = new Map(projects.map((p) => [String(p._id), p.name]));

  const usedToday = user.dailyDate === credit.todayKey() ? user.dailyUsed : 0;

  res.status(200).json({
    credits: credit.round2(user.credits),
    dailyUsed: credit.round2(usedToday),
    dailyLimit: credit.dailyLimit(),
    totalCreditsUsed: credit.round2(user.totalCreditsUsed),
    totalTokensUsed: user.totalTokensUsed,
    byProject: byProject.map((chat) => ({
      projectId: chat.project,
      name: names.get(String(chat.project)) || "Untitled Project",
      credits: credit.round2(chat.creditsUsed),
      tokens: chat.tokensUsed,
    })),
    recent: recent.map((message) => ({
      projectId: message.project,
      projectName: names.get(String(message.project)) || "Untitled Project",
      mode: message.mode,
      agent: message.agent,
      creditsUsed: credit.round2(message.creditsUsed),
      tokensUsed: message.tokensUsed,
      createdAt: message.createdAt,
    })),
  });
};

const creditController = { getUsage };

export default creditController;
