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

// collects the zip document ids stored in messages
const collectDocumentIds = (messages = []) =>
  messages
    .flatMap((message) => message.attachments || [])
    .filter((file) => file.type === "zip" && file.documentId)
    .map((file) => file.documentId);

// deletes the cloudinary assets + indexed zips of one chat or project
// failures are only logged, they never block the deletion
export const cleanupChatAssets = async ({ messages = [], documentIds }) => {
  try {
    const publicIds = collectPublicIds(messages);
    for (const publicId of publicIds) {
      await cloudinaryService.deleteFromCloudinary(publicId).catch(() => {});
    }

    const docIds = documentIds || collectDocumentIds(messages);
    if (docIds.length > 0) {
      // the original zip files of the documents also live on Cloudinary
      const docs = await Document.find({ _id: { $in: docIds } })
        .select("zipPublicId")
        .lean();
      for (const doc of docs) {
        if (doc.zipPublicId) {
          await cloudinaryService
            .deleteFromCloudinary(doc.zipPublicId)
            .catch(() => {});
        }
      }

      await DocChunk.deleteMany({ documentId: { $in: docIds } });
      await Document.deleteMany({ _id: { $in: docIds } });
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
