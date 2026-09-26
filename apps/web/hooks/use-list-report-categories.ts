import { useQuery } from "@tanstack/react-query";
import { ReportCategory } from "@/types/report-category-type";
import { requestAllReportCategories } from "@/services/catalogs/report-category-service";

export const useListReportCategories = () => {
  const { data, error, refetch, isPending } = useQuery<ReportCategory[]>({
    queryKey: ["report-categories"],
    queryFn: async () => (await requestAllReportCategories()).data,
  });

  return {
    data: data ?? [],
    isLoading: isPending,
    errors: (error as unknown as { data?: unknown } | null)?.data ?? {},
    refetch,
  };
};