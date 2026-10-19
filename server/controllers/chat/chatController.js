import Chat from "../../models/chatModel.js";
import Project from "../../models/projectModel.js";

const getChats = async (req, res) => {
  const chats = await Chat.find({
    user: req.user._id,
    $or: [{ project: null }, { project: { $exists: false } }],
  })
    .select("_id title createdAt updatedAt preview")
    .sort({ updatedAt: -1 });

  res.status(200).json(chats);
};

const createChat = async (req, res) => {
  const title = (req.body.title || "New chat").slice(0, 60);

  const chat = await Chat.create({
    user: req.user._id,
    title,
    files: [],
    preview: true,
  });

  res.status(201).json(chat);
};

const getChatById = async (req, res) => {
  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);

  const chat = await Chat.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).lean();

  if (!chat) {
    res.status(404);
    throw new Error("Chat Not Found...");
  }

  res.status(200).json({
    _id: chat._id,
    title: chat.title || "New chat",
    messages: chat.messages ? chat.messages.slice(-limit) : [],
    files: chat.files || [],
    preview: chat.preview !== false,
  });
};

const deleteChat = async (req, res) => {
  const chat = await Chat.findOneAndDelete({
    _id: req.params.id,
    user: req.user._id,
  });

  if (!chat) {
    res.status(404);
    throw new Error("Chat Not Found...");
  }

  res.status(200).json({ message: "Chat Deleted SuccessFully..." });
};

const getChat = async (req, res) => {
  const project = await Project.findOne({ _id: req.params.id, user: req.user._id }).select("_id name");

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  const limit = Math.min(Math.max(parseInt(req.query.limit, 10) || 100, 1), 200);

  const chat = await Chat.findOne({ project: project._id, user: req.user._id }).lean();

  res.status(200).json({
    _id: project._id,
    title: project.name,
    messages: chat ? chat.messages.slice(-limit) : [],
    files: (chat && chat.files) || [],
    preview: chat ? chat.preview !== false : true,
  });
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

const chatController = {
  getChats,
  createChat,
  getChatById,
  deleteChat,
  getChat,
  clearChat,
};

export default chatController;
