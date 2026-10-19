import axios from "axios";

const getChats = async (token) => {
  const response = await axios.get("/api/chats", {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const createChat = async (token, data = {}) => {
  const response = await axios.post("/api/chats", data, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getChatById = async (token, id) => {
  const response = await axios.get(`/api/chats/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const deleteChat = async (token, id) => {
  const response = await axios.delete(`/api/chats/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const chatService = {
  getChats,
  createChat,
  getChatById,
  deleteChat,
};

export default chatService;
