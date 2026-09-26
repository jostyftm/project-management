import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { UserItem } from "../types/user-types";
import { requestAllUsers } from "../services/user-service";

interface Props {
  params?: PaginateResourcesProps;
}

export const useListUsers = ({ params }: Props) => {
  const safeParams = params ?? { params: {} };
  const queryKey = ["users", safeParams];
  const { data, error, refetch, isPending } = useQuery<
    PaginatedResponse<UserItem>
  >({
    queryKey,
    queryFn: async () => requestAllUsers(safeParams),
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
