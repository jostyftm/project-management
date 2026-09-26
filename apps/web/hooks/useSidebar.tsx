import { useQuery } from "@tanstack/react-query";
import { useRouter } from "next/navigation";
import { APPLICATION_STORAGE_KEY, LOGIN_ROUTE } from "@/config/constants";
import { storage } from "@/lib/storage";
import { moduleType } from "@/types/sidebar";
import { useAuth } from "./use-auth";
import { ApiResponse } from "@/types/paginate";
import { SidebarItemType } from "@/types/sidebar/sidebar-item";
import { useEffect } from "react";
import { requestModules } from "@/services/auth/authService";
import { ApiErrorException } from "@/lib/request";

export type useSidebarType = {
  modules: moduleType[];
  isLoading: boolean;
  errors: Record<string, string>;
};

const useSidebar = () => {
  const router = useRouter();
  const { logout } = useAuth();
  const rawAppId = storage.get(APPLICATION_STORAGE_KEY);
  const applicationId =
    (typeof rawAppId === "string" || typeof rawAppId === "number"
      ? String(rawAppId)
      : null) ||
    process.env.NEXT_PUBLIC_APPLICATION_ID ||
    "9";

  useEffect(() => {
    if (!storage.get(APPLICATION_STORAGE_KEY) && applicationId) {
      storage.set(APPLICATION_STORAGE_KEY, applicationId);
    }
  }, [applicationId]);

  const { data, error, refetch, isPending } = useQuery<
    ApiResponse<SidebarItemType[]>
  >({
    queryKey: ["modules", applicationId],
    queryFn: async () => await requestModules(applicationId),
    enabled: !!applicationId,
    throwOnError: false,
  });

  useEffect(() => {
    if (!isPending) {
      if (!applicationId) {
        router.replace(LOGIN_ROUTE);
        return;
      }
      if (
        (error instanceof ApiErrorException && error.status === 401) ||
        (typeof error === "object" && error !== null && "status" in error && (error as { status: number }).status === 401)
      ) {
        logout();
        router.replace(LOGIN_ROUTE);
      }
    }
  }, [applicationId, isPending, error, logout, router]);

  const errors =
    error instanceof ApiErrorException && typeof error.errors === "object" && !Array.isArray(error.errors)
      ? (error.errors as unknown as Record<string, string>)
      : {};

  return {
    items: data?.data ?? [],
    isLoading: isPending,
    errors,
    refetch,
  };
};

export default useSidebar;
