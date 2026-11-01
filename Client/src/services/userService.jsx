import axios from "axios";
const completeOnboarding = async (token, payload) => {
  const response = await axios.post("/api/users/onboarding", payload, { headers: { authorization: `Bearer ${token}` } });
  return response.data;
};
const userService = { completeOnboarding };
export default userService;