// AdminService: API calls for the admin dashboard (stats, users, credits, block, delete)
import axios from "axios";

const getStats = async (token) => {
  const response = await axios.get("/api/admin/stats", {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getUsers = async (token, { page = 1, search = "" } = {}) => {
  const response = await axios.get("/api/admin/users", {
    params: { page, limit: 20, search },
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const getSingleUser = async (token, id) => {
  const response = await axios.get(`/api/admin/users/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const updateCredits = async (token, id, { action, amount }) => {
  const response = await axios.patch(
    `/api/admin/users/${id}/credits`,
    { action, amount },
    { headers: { authorization: `Bearer ${token}` } },
  );
  return response.data;
};

const updateBlock = async (token, id, isActive) => {
  const response = await axios.patch(
    `/api/admin/users/${id}/block`,
    { isActive },
    { headers: { authorization: `Bearer ${token}` } },
  );
  return response.data;
};

const deleteUser = async (token, id) => {
  const response = await axios.delete(`/api/admin/users/${id}`, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const adminService = {
  getStats,
  getUsers,
  getSingleUser,
  updateCredits,
  updateBlock,
  deleteUser,
};
export default adminService;
