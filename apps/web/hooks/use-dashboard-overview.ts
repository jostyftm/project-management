import { useQuery } from "@tanstack/react-query";
import { requestDashboardOverview } from "@/services/dashboard-service";
import { DashboardOverviewData } from "@/types/dashboard-types";

export interface UseDashboardOverviewOptions {
  refetchInterval?: number | false;
}

export const useDashboardOverview = (options?: UseDashboardOverviewOptions) => {
  const { data, error, refetch, isPending, isFetching } = useQuery<{ data: DashboardOverviewData }>({
    queryKey: ["dashboard-overview"],
    queryFn: () => requestDashboardOverview(),
    refetchInterval: options?.refetchInterval ?? false,
    staleTime: 15_000,
  });

  return {
    overview: data?.data,
    isLoading: isPending,
    isFetching,
    error,
    refetch,
  };
};
