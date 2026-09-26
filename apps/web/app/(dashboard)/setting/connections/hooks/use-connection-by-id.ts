import { useQuery } from "@tanstack/react-query";
import { getConnectionByIdService } from "../services/connection-service";
import { DatabaseConnection } from "@/types/connection-type";

export const useConnectionById = (id: string | number | null) => {
  return useQuery<DatabaseConnection>({
    queryKey: ["connection", "by-id", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await getConnectionByIdService(id as string | number);
      return res.data;
    },
  });
};
