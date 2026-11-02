import cloudinaryService from "../middleware/cloudinaryMiddleware.js";
import Document from "../models/documentModel.js";
import DocChunk from "../models/docChunkModel.js";

// collects every publicId stored in chat/project messages (attachments + images)
const collectPublicIds = (messages = []) => {
  const ids = new Set();
  for (const message of messages) {
    (message.attachments || []).forEach((file) => {
      if (file.publicId) ids.add(file.publicId);
    });
    (message.images || []).forEach((image) => {
      if (image.publicId) ids.add(image.publicId);
    });
  }
  return [...ids];
};

// deletes the cloudinary assets + indexed zips of one chat or project
// failures are only logged, they never block the deletion
export const cleanupChatAssets = async ({ messages = [], documentIds = [] }) => {
  try {
    const publicIds = collectPublicIds(messages);
    for (const publicId of publicIds) {
      await cloudinaryService.deleteFromCloudinary(publicId).catch(() => {});
    }

    if (documentIds.length > 0) {
      await DocChunk.deleteMany({ documentId: { $in: documentIds } });
      await Document.deleteMany({ _id: { $in: documentIds } });
    }
  } catch (error) {
    console.log(`ASSET CLEANUP FAILED: ${error.message}`);
  }
};

// deletes everything a user owns on cloudinary + all indexed zips
export const cleanupUserAssets = async (userId) => {
  try {
    await cloudinaryService.deleteAssetsByPrefix(`delux_${userId}_`);
    await DocChunk.deleteMany({ userId });
    await Document.deleteMany({ userId });
  } catch (error) {
    console.log(`ASSET CLEANUP FAILED: ${error.message}`);
  }
};
