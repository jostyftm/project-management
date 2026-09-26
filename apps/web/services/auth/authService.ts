import { API_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { ParamsPermissionsByModule, UserLoggedType } from "@/types/auth-type";
import { SidebarItemType } from "@/types/sidebar/sidebar-item";

const url = API_URL("auth", "v1");

export const getCsrf = () =>
  httpRequestService({
    url: "/sanctum/csrf-cookie",
    method: "GET",
  });

export const requestMe = () =>
  httpRequestService<{ data: UserLoggedType }>({
    url: `${url}/me`,
    method: "GET",
  });

export const requestModules = (idApplication: string) =>
  httpRequestService<{ data: SidebarItemType[] }>({
    url: `${url}/applications/${idApplication}/myModules`,
    method: "GET",
  });

export const requestLogOut = () =>
  httpRequestService({
    url: `${url}/logout`,
    method: "POST",
  });

export const checkSession = (data: { app: string; app_url: string }) =>
  httpRequestService({
    url: `${url}/check_session`,
    method: "POST",
    data,
  });

export const getPermissionByModule = (params: ParamsPermissionsByModule) =>
  httpRequestService<string[]>({
    url: `${url}/permissions`,
    method: "get",
    params,
  });
