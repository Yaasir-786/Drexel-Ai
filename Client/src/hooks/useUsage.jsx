import { useSelector } from "react-redux";
import { useQuery } from "@tanstack/react-query";
import creditService from "../services/creditService";

const useUsage = () => {
  const { user } = useSelector((state) => state.auth);

  return useQuery({
    queryKey: ["usage"],
    queryFn: () => creditService.getUsage(user.token),
    enabled: !!user?.token,
  });
};

export default useUsage;
