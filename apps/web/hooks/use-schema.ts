import { useQuery } from "@tanstack/react-query";
import { ConnectionSchema } from "@/types/schema-type";
import { requestConnectionSchema } from "@/services/catalogs/schema-service";

export const useSchema = (connectionId: number | null) => {
  const { data, error, refetch, isPending } = useQuery<ConnectionSchema>({
    queryKey: ["connection-schema", connectionId],
    queryFn: async () => (await requestConnectionSchema(connectionId as number)).data,
    enabled: Boolean(connectionId && connectionId > 0),
    staleTime: 5 * 60 * 1000,
  });

  return {
    schema: data?.attributes ?? null,
    isLoading: isPending,
    errors: (error as unknown as { data?: unknown } | null)?.data ?? {},
    refetch,
  };
};