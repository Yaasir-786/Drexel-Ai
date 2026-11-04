import axios from "axios";

const getProjects = async (token, type) => {
  const url = type ? `/api/projects?type=${type}` : "/api/projects";
  const response = await axios.get(url, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getProject = async (token, id) => {
  const response = await axios.get(`/api/projects/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const createProject = async (token, payload = {}) => {
  const response = await axios.post("/api/projects", payload, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const renameProject = async (token, id, name) => {
  const response = await axios.patch(
    `/api/projects/${id}`,
    { name },
    {
      headers: { authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

const deleteProject = async (token, id) => {
  const response = await axios.delete(`/api/projects/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

// saves the files edited by the user in the code editor (replaces the file list)
const saveFiles = async (token, id, files) => {
  const response = await axios.put(
    `/api/projects/${id}/files`,
    { files },
    {
      headers: { authorization: `Bearer ${token}` },
    }
  );
  return response.data;
};

const getChat = async (token, id) => {
  const response = await axios.get(`/api/projects/${id}/chat`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

export const mapMessages = (messages = []) => {
  if (!Array.isArray(messages)) return [];
  return messages
    .filter(
      (m) => !(m.role === "assistant" && m.agent === "planner" && m.mode === "build")
    )
    // never show an empty assistant bubble
    .filter(
      (m) =>
        m.role === "user" ||
        String(m.content || "").trim() ||
        (m.images || []).length > 0 ||
        (m.files || []).length > 0 ||
        m.zip,
    )
    .map((m) => ({
      type: m.role === "user" ? "user" : "assistant",
      mode: m.mode,
      // saved message id + time, so Edit/Copy actions can work on it
      id: m._id ? String(m._id) : undefined,
      createdAt: m.createdAt,
      text: m.content,
      attachments: m.attachments,
      images: m.images || [],
      files: m.files || [],
      zip: m.zip || null,
    }));
};

const projectService = {
  getProjects,
  getProject,
  createProject,
  renameProject,
  deleteProject,
  saveFiles,
  getChat,
};

export default projectService;
