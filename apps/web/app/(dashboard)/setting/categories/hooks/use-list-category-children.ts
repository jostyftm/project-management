import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse } from "@/types/paginate";
import { ReportCategory } from "@/types/report-category-type";
import { requestReportCategoryChildren } from "@/services/catalogs/report-category-service";

export const useListCategoryChildren = (
  id: number,
  enabled: boolean,
  params?: Record<string, unknown>
) => {
  const safeParams = params ?? {};
  const queryKey = ["report-categories", "children", id, safeParams];

  const { data, error, refetch, isPending } = useQuery<
    PaginatedResponse<ReportCategory>
  >({
    queryKey,
    queryFn: async () =>
      requestReportCategoryChildren({
        id,
        params: { paginate: true, ...safeParams },
      }),
    enabled,
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