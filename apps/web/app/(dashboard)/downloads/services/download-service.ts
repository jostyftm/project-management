import { API_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { PaginateResourcesProps, PaginatedResponse } from "@/types/paginate";
import { DownloadType, PrepareDownloadPayload } from "../types/download-types";

const endpoint = API_URL("auth", "v1");

export const requestAllDownloads = ({ params }: PaginateResourcesProps) =>
  httpRequestService<PaginatedResponse<DownloadType>>({
    url: `${endpoint}/downloads`,
    method: "GET",
    params: params,
  });

export const requestDownloadById = (id: string | number) =>
  httpRequestService<Blob>({
    url: `${endpoint}/downloads/${id}`,
    method: "GET",
    responseType: "blob",
  });

export const deleteDownloadById = (id: string | number) =>
  httpRequestService({
    url: `${endpoint}/downloads/${id}`,
    method: "DELETE",
  });

export const prepareDownloadService = (data: PrepareDownloadPayload) =>
  httpRequestService<{ data: DownloadType }>({
    url: `${endpoint}/downloads`,
    method: "POST",
    data,
  });
