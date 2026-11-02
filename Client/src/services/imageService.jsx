// ImageService: image edit endpoint of the agent API
import axios from "axios";

// edit a generated image with an instruction
const editImage = async (token, payload) => {
  const response = await axios.post("/api/agent/image-edit", payload, {
    headers: { authorization: `Bearer ${token}` },
  });
  return response.data;
};

const imageService = { editImage };

export default imageService;
