// UploadService: file uploads to Cloudinary through the backend
import axios from "axios";

// upload up to 3 files as multipart/form-data, returns the stored file objects
const uploadFiles = async (token, files) => {
  const formData = new FormData();
  files.forEach((file) => formData.append("files", file));

  const response = await axios.post("/api/uploads", formData, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data.files;
};

// delete an uploaded file from Cloudinary by its public id
const deleteFile = async (token, publicId) => {
  const response = await axios.delete(`/api/uploads/${encodeURIComponent(publicId)}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const uploadService = { uploadFiles, deleteFile };

export default uploadService;
