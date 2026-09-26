import { useQuery } from "@tanstack/react-query";
import { getReportByIdService } from "../services/report-service";
import { Report } from "@/types/report-type";

export const useReportById = (id: string | number | null) => {
  return useQuery<Report>({
    queryKey: ["report", "by-id", id],
    enabled: !!id,
    queryFn: async () => {
      const res = await getReportByIdService(id as string | number);
      return res.data;
    },
  });
};
