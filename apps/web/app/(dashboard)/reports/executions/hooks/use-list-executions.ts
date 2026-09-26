import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { ReportExecution } from "@/types/execution-type";
import { requestAllExecutions } from "../services/execution-service";

interface Props {
  params?: PaginateResourcesProps;
}

export const useListExecutions = ({ params }: Props) => {
  const safeParams = params ?? { params: {} };
  const queryKey = ["executions", safeParams];
  const { data, error, refetch, isPending } = useQuery<
    PaginatedResponse<ReportExecution>
  >({
    queryKey,
    queryFn: async () => requestAllExecutions(safeParams),
    placeholderData: keepPreviousData,
  });

  return {
    data: data?.data ?? [],
    meta: data?.meta,
    links: data?.links,
    isLoading: isPending,
    errors: (error as { data?: unknown })?.data ?? {},
    refetch,
  };
};
