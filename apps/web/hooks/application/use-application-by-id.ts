import { APPLICATION_STORAGE_KEY } from "@/config/constants";
import { storage } from "@/lib/storage";
import { requestApplicationById } from "@/services/auth/application-service";

import { IApplication } from "@/types/application-type";
import { ApiResponse } from "@/types/paginate";
import { useQuery } from "@tanstack/react-query";

const useGetApplicationById = () => {

  const appId = storage.get(APPLICATION_STORAGE_KEY) as string;

  const { data, error, refetch, isPending } = useQuery<
    ApiResponse<IApplication>
  >({
    queryKey: ["application", "by-id", appId],
    queryFn: async () => await requestApplicationById(appId),
    enabled: !!appId,
    throwOnError: false,
  });


  return {
    application: data?.data,
    isLoading: isPending,
    refetch,
    error,
  }


};

export default useGetApplicationById;
