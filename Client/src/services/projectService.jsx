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
    .map((m) => ({
      type: m.role === "user" ? "user" : "assistant",
      mode: m.mode,
      text: m.content,
      attachments: m.attachments,
      files: m.files || [],
    }));
};

const projectService = {
  getProjects,
  getProject,
  createProject,
  renameProject,
  deleteProject,
  getChat,
};

export default projectService;
