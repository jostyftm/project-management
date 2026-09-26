import { AxiosError, type AxiosRequestConfig } from "axios";
import { storage } from "./storage";
import { axiosApi } from "./axios";
import { ACCESS_TOKEN, CURRENT_WORKSPACE } from "@/config/constants";

// Interface para el formato de error de la API
export interface ApiError {
  errors: Record<string, string[]> | [];
  message: string;
  status: number;
}

// Clase de error personalizada que extiende AxiosError
export class ApiErrorException extends AxiosError {
  public errors: Record<string, string[]> | [];
  public status: number;

  constructor(apiError: ApiError) {
    super(apiError.message);
    this.name = "ApiErrorException";
    this.errors = apiError.errors;
    this.status = apiError.status;
  }
}

export const httpRequestService = async <T>({
  url,
  method,
  data,
  params,
  responseType = "json",
  headers: customHeaders,
}: AxiosRequestConfig): Promise<T> => {
  const token = storage.get(ACCESS_TOKEN);
  const currentWorkspace = storage.get(CURRENT_WORKSPACE);
  const workspaceId = typeof currentWorkspace === "object" && currentWorkspace !== null
    ? (currentWorkspace as any).id
    : currentWorkspace;

  const headers: Record<string, string> = {
    ...(customHeaders as Record<string, string> || {}),
  };

  if (typeof token === "string" && token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  if (workspaceId) {
    headers["X-Workspace-Id"] = String(workspaceId);
  }

  const config: AxiosRequestConfig = {
    url,
    method,
    data,
    params,
    headers,
    responseType,
  };

  return new Promise<T>((resolve, reject) => {
    axiosApi(config)
      .then((resp) => resolve(resp.data))
      .catch((err) => {
        // Crear error tipado según la estructura de tu API
        const apiErrorData: ApiError = err.response?.data || {
          errors: [],
          message: err.message || "Error desconocido",
          status: err.response?.status || 500,
        };

        const apiError = new ApiErrorException(apiErrorData);
        reject(apiError);
      });
  });
};
