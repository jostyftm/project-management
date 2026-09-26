import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse } from "@/types/paginate";
import { ReportCategory } from "@/types/report-category-type";
import { requestPaginatedReportCategories } from "@/services/catalogs/report-category-service";

export const useListCategories = (params?: Record<string, unknown>) => {
  const safeParams = params ?? {};
  const queryKey = ["report-categories", "roots", safeParams];

  const { data, error, refetch, isPending } = useQuery<
    PaginatedResponse<ReportCategory>
  >({
    queryKey,
    queryFn: async () =>
      requestPaginatedReportCategories({
        params: { paginate: true, ...safeParams },
      }),
    placeholderData: keepPreviousData,
  });

  return {
    data: data?.data ?? [],
    meta: data?.meta,
    links: data?.links,
    isLoading: isPending,
    errors: (error as unknown as { data?: unknown } | null)?.data ?? {},
    refetch,
  };
};