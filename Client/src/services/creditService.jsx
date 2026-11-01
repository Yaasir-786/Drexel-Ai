import axios from "axios";
const getUsage = async (token) => {
  const response = await axios.get("/api/credits/usage", { headers: { authorization: `Bearer ${token}` } });
  return response.data;
};
const creditService = { getUsage };
export default creditService;
