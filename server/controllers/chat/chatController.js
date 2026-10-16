import Chat from "../../models/chatModel.js";
import Project from "../../models/projectModel.js";

const getChat = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, user: req.user._id }).select("_id");

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);

  const chat = await Chat.findOne({ project: project._id, user: req.user._id }).lean();

  res.status(200).json({ messages: chat ? chat.messages.slice(-limit) : [] });
};

const clearChat = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, user: req.user._id }).select("_id");

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  await Chat.updateOne({ project: project._id, user: req.user._id }, { $set: { messages: [] } });

  res.status(200).json({ message: "Chat Cleared SuccessFully..." });
};

const chatController = { getChat, clearChat };

export default chatController;
