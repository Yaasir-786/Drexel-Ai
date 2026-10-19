import axios from "axios";

const registerUser = async (formData) => {
  const response = await axios.post("/api/auth/signup", formData);
  return response.data;
};

const loginUser = async (formData) => {
  const response = await axios.post("/api/auth/login", formData);
  localStorage.setItem("user", JSON.stringify(response.data));
  return response.data;
};

const getMyProfile = async (token) => {
  const response = await axios.get("/api/auth/me", {
    headers: {
      authorization: `Bearer ${token}`,
    },
  });
  return response.data;
};

const authService = {
  registerUser,
  loginUser,
  getMyProfile,
};

export default authService;
