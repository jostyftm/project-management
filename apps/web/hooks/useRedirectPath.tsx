import { LOGIN_ROUTE } from "@/config/constants";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { useEffect, useMemo } from "react";
import { SidebarItemType } from "@/types/sidebar/sidebar-item";
import { ApiResponse } from "@/types/paginate";
import { requestModules } from "@/services/auth/authService";

const useRedirectPath = (applicationId: string) => {
  const router = useRouter();

  const { data, error, refetch, isPending } = useQuery<
    ApiResponse<SidebarItemType[]>
  >({
    queryKey: ["modules", applicationId],
    queryFn: async () => await requestModules(applicationId),
    enabled: !!applicationId,
  });

  useEffect(() => {
    if (!isPending && (!applicationId || data?.data.length === 0 || error)) {
      router.replace(LOGIN_ROUTE);
    }
  }, [applicationId, isPending, data, router, error]);
  const path = useMemo(() => {
    const dataArray = data?.data ?? [];
    if (dataArray.length === 0) return "";

    const first = dataArray[0];
    const hasChildren = (first.relationships?.childrens?.length ?? 0) > 0;

    return hasChildren
      ? (first.relationships?.childrens?.[0]?.attributes?.path ?? "")
      : (first.attributes?.path ?? "");
  }, [data]);

  return {
    path,
    isLoading: isPending,
    refetch,
  };
};

export default useRedirectPath;
