import { useQuery, keepPreviousData } from "@tanstack/react-query";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { ExampleType } from "@/types/example-type";
import { requestAllExamples } from "../services/example-service";

interface Props {
  params?: PaginateResourcesProps;
}

export const useListExamples = ({ params }: Props) => {
  const safeParams = params ?? { params: {} };
  const queryKey = ["examples", safeParams];
  const { data, error, refetch, isPending } = useQuery<
    PaginatedResponse<ExampleType>
  >({
    queryKey,
    queryFn: async () => requestAllExamples(safeParams),
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
