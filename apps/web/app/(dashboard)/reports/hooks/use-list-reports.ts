import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { Report } from "@/types/report-type";
import { requestAllReports } from "../services/report-service";

interface Props {
  params?: PaginateResourcesProps;
}

export const useListReports = ({ params }: Props) => {
  const safeParams = params ?? { params: {} };
  const queryKey = ["reports", safeParams];
  const { data, error, refetch, isPending } = useQuery<
    PaginatedResponse<Report>
  >({
    queryKey,
    queryFn: async () => requestAllReports(safeParams),
    placeholderData: keepPreviousData,
  });

  return {
    data: data?.data ?? [],
    meta: data?.meta,
    links: data?.links,
    isLoading: isPending,
    errors:
      (error as unknown as { data?: unknown } | null)?.data ?? {},
    refetch,
  };
};
