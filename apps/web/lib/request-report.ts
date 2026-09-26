import { AxiosError, type AxiosRequestConfig } from "axios";
import { axiosReport } from "./axios-report";
import { ApiError, ApiErrorException } from "./request";

import { storage } from "./storage";
import { ACCESS_TOKEN } from "@/config/constants";

export const reportRequestService = async <T>({
  url,
  method,
  data,
  params,
  headers: customHeaders,
  responseType = "json",
}: AxiosRequestConfig): Promise<T> => {
  const token = storage.get(ACCESS_TOKEN);
  const authHeader = typeof token === "string" ? { Authorization: `Bearer ${token}` } : {};

  const config: AxiosRequestConfig = {
    url,
    method,
    data,
    params,
    headers: {
      ...authHeader,
      ...customHeaders,
    },
    responseType,
  };

  return new Promise<T>((resolve, reject) => {
    axiosReport(config)
      .then((resp) => resolve(resp.data))
      .catch((err: AxiosError) => {
        const apiErrorData: ApiError = (err.response?.data as
          | ApiError
          | undefined) || {
          errors: [],
          message: err.message || "Error desconocido",
          status: err.response?.status || 500,
        };

        const apiError = new ApiErrorException(apiErrorData);
        reject(apiError);
      });
  });
};
