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

const cloudinaryService = { uploadToCloudinary, deleteFromCloudinary };

export default cloudinaryService;
