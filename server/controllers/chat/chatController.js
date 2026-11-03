import Chat from "../../models/chatModel.js";
import Project from "../../models/projectModel.js";
import Document from "../../models/documentModel.js";
import DocChunk from "../../models/docChunkModel.js";
import AdmZip from "adm-zip";
import { cleanupChatAssets } from "../../utils/assetCleanup.js";

// images go out without the heavy generation source
const cleanMessages = (messages = []) =>
  messages.map((message) => ({
    ...message,
    images: (message.images || []).map(({ url, publicId }) => ({
      url,
      publicId,
    })),
  }));

const getChats = async (req, res) => {
  const chats = await Chat.find({
    user: req.user._id,
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
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 100, 1),
    200,
  );

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
    messages: cleanMessages(chat.messages ? chat.messages.slice(-limit) : []),
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

  // clean up cloudinary assets and indexed zips without blocking the response
  cleanupChatAssets({ messages: chat.messages || [] });

  res.status(200).json({ message: "Chat Deleted SuccessFully..." });
};

const getChat = async (req, res) => {
  const limit = Math.min(
    Math.max(parseInt(req.query.limit, 10) || 100, 1),
    200,
  );

  const project = await Project.findOne({
    _id: req.params.id,
    user: req.user._id,
  })
    .select("name files messages")
    .lean();
  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  res.status(200).json({
    _id: project._id,
    title: project.name,
    messages: cleanMessages((project.messages || []).slice(-limit)),
    files: project.files || [],
    preview: true,
  });
};

const clearChat = async (req, res) => {
  const project = await Project.findOne({
    _id: req.params.id,
    user: req.user._id,
  }).select("messages");

  if (!project) {
    res.status(404);
    throw new Error("Project Not Found...");
  }

  // clean up cloudinary assets and indexed zips without blocking the response
  cleanupChatAssets({ messages: project.messages || [] });

  await Project.updateOne({ _id: project._id }, { $set: { messages: [] } });

  res.status(200).json({ message: "Chat Cleared SuccessFully..." });
};

// GET /api/chats/:id/zip: the files of the chat as a downloadable zip
const downloadChatZip = async (req, res) => {
  const chat = await Chat.findOne({
    _id: req.params.id,
    user: req.user._id,
  })
    .select("title files messages")
    .lean();

  if (!chat) {
    res.status(404);
    throw new Error("Chat Not Found...");
  }

  // zip entries: path -> content (original zip first, chat files on top)
  const entries = new Map();

  // base: the original zip of the LAST uploaded zip in this chat
  let lastZipAttachment = null;
  for (const message of chat.messages || []) {
    const found = (message.attachments || []).find(
      (file) => file.type === "zip" && file.documentId,
    );
    if (found) lastZipAttachment = found;
  }

  if (lastZipAttachment) {
    const document = await Document.findOne({
      _id: lastZipAttachment.documentId,
      userId: req.user._id,
    })
      .select("zipUrl")
      .lean();

    // only the stored server-side url is fetched, never a client url
    if (document?.zipUrl) {
      try {
        const response = await fetch(document.zipUrl, {
          signal: AbortSignal.timeout(30000),
        });
        if (!response.ok) throw new Error(`status ${response.status}`);
        const buffer = Buffer.from(await response.arrayBuffer());
        const original = new AdmZip(buffer);
        for (const entry of original.getEntries()) {
          if (!entry.isDirectory) {
            entries.set(entry.entryName, entry.getData());
          }
        }
      } catch (error) {
        // the original zip is gone, fall back to the rebuilt text files
        console.log(`ZIP DOWNLOAD FAILED... ${error.message}`);
      }
    }

    // fallback: rebuild the text files from the indexed chunks
    if (entries.size === 0) {
      const chunks = await DocChunk.find({
        documentId: lastZipAttachment.documentId,
        userId: req.user._id,
      })
        .select("path order text")
        .sort({ order: 1 })
        .lean();

      const byPath = new Map();
      for (const chunk of chunks) {
        byPath.set(chunk.path, (byPath.get(chunk.path) || "") + chunk.text);
      }
      for (const [path, text] of byPath) {
        entries.set(path, Buffer.from(text, "utf8"));
      }
    }
  }

  // detect a single root folder of the original zip (for example "my-app/")
  let rootPrefix = "";
  if (entries.size > 0) {
    const paths = [...entries.keys()];
    const firstSegments = new Set(paths.map((path) => path.split("/")[0]));
    if (firstSegments.size === 1 && paths.some((path) => path.includes("/"))) {
      rootPrefix = `${[...firstSegments][0]}/`;
    }
  }

  // overlay the AI's new or changed files on top of the base
  for (const file of chat.files || []) {
    const path = file.path.replace(/^\/+/, "").replace(/\\/g, "/");
    if (!path || path.includes("..")) continue;
    const content = Buffer.from(file.content, "utf8");

    // replace the entry with the same path (also under the original root folder)
    if (entries.has(path)) {
      entries.set(path, content);
    } else if (rootPrefix && entries.has(rootPrefix + path)) {
      entries.set(rootPrefix + path, content);
    } else {
      // new files go under the original root folder when there is one
      entries.set(rootPrefix + path, content);
    }
  }

  if (entries.size === 0) {
    res.status(404);
    throw new Error("No Files To Zip...");
  }

  const output = new AdmZip();
  for (const [path, content] of entries) output.addFile(path, content);

  const filename = `${(chat.title || "chat").replace(/[^\w.-]/g, "-")}.zip`;

  res.status(200);
  res.set({
    "Content-Type": "application/zip",
    "Content-Disposition": `attachment; filename="${filename}"`,
  });
  res.send(output.toBuffer());
};

const chatController = {
  getChats,
  createChat,
  getChatById,
  downloadChatZip,
  deleteChat,
  getChat,
  clearChat,
};

export default chatController;
