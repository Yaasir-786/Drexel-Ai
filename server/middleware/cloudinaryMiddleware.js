import getCloudinary from "../config/cloudinaryConfig.js";

// uploads a file buffer (no temp file on our server)
const uploadToCloudinary = (buffer, options = {}) =>
  new Promise((resolve, reject) => {
    const stream = getCloudinary().uploader.upload_stream(
      { resource_type: "auto", overwrite: false, ...options },
      (error, result) => {
        if (error || !result) {
          return reject(new Error(error?.message || "Cloudinary Upload Failed..."));
        }
        resolve(result);
      },
    );

    stream.end(buffer);
  });

// PDFs are stored as "image" type by Cloudinary, so both types are tried
const deleteFromCloudinary = async (publicId) => {
  for (const resourceType of ["image", "raw"]) {
    const result = await getCloudinary().uploader.destroy(publicId, {
      resource_type: resourceType,
    });
    if (result.result === "ok") return true;
  }
  return false;
};

// deletes every asset whose public id starts with the prefix (both types)
const deleteAssetsByPrefix = async (prefix) => {
  for (const resourceType of ["image", "raw"]) {
    await getCloudinary().uploader.delete_resources_by_prefix(prefix, {
      resource_type: resourceType,
    });
  }
  return true;
};

const cloudinaryService = { uploadToCloudinary, deleteFromCloudinary, deleteAssetsByPrefix };

export default cloudinaryService;
