import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { DatabaseConnection } from "@/types/connection-type";
import { requestAllConnections } from "../services/connection-service";

interface Props {
  params?: PaginateResourcesProps;
}

export const useListConnections = ({ params }: Props) => {
  const safeParams = params ?? { params: {} };
  const queryKey = ["connections", safeParams];
  const { data, error, refetch, isPending } = useQuery<
    PaginatedResponse<DatabaseConnection>
  >({
    queryKey,
    queryFn: async () => requestAllConnections(safeParams),
    placeholderData: keepPreviousData,
  });

  return {
    data: data?.data ?? [],
    meta: data?.meta,
    links: data?.links,
    isLoading: isPending,
    errors: (error as any)?.data ?? {},
    refetch,
  };
};
