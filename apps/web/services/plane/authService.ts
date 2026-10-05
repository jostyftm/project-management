import { API_BASE_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { User, Workspace } from "@/types/plane-types";

export interface AuthResponse {
  status: number;
  data: {
    token: string;
    user: User & { workspaces?: Workspace[] };
    current_workspace?: Workspace;
  };
}

export const authService = {
  register: (payload: { name: string; email: string; password: string; workspace_name?: string }) =>
    httpRequestService<AuthResponse>({
      url: `${API_BASE_URL}/auth/register`,
      method: "POST",
      data: payload,
    }),

  login: (payload: { email: string; password: string }) =>
    httpRequestService<AuthResponse>({
      url: `${API_BASE_URL}/auth/login`,
      method: "POST",
      data: payload,
    }),

  getMe: () =>
    httpRequestService<{ status: number; data: { user: User & { workspaces?: Workspace[] } } }>({
      url: `${API_BASE_URL}/auth/me`,
      method: "GET",
    }),

  logout: () =>
    httpRequestService<{ status: number; message: string }>({
      url: `${API_BASE_URL}/auth/logout`,
      method: "POST",
    }),

  forgotPassword: (email: string) =>
    httpRequestService<{ status: number; data: { message: string } }>({
      url: `${API_BASE_URL}/auth/forgot-password`,
      method: "POST",
      data: { email },
    }),

  resetPassword: (payload: { email: string; token: string; password: string; password_confirmation: string }) =>
    httpRequestService<{ status: number; data: { message: string } }>({
      url: `${API_BASE_URL}/auth/reset-password`,
      method: "POST",
      data: payload,
    }),
};

