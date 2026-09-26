import { API_URL } from "@/config/enviroments";
import { httpRequestService } from "@/lib/request";
import { IApplication } from "@/types/application-type";
import { ApiResponse, PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";

const url = API_URL("auth", "v1");
const path = "applications";

export const requestAllApplications = ({ params }: PaginateResourcesProps) =>
  httpRequestService<PaginatedResponse<IApplication>>({
    url: `${url}/${path}`,
    method: "GET",
    params: params,
  });


export const requestApplicationModules = (
  { params }: PaginateResourcesProps,
  applicationId: number
) =>
  httpRequestService({
    url: `${url}/${path}/${applicationId}/modules`,
    method: "GET",
    params: params,
  });

export const requestApplicationById = (applicationId: string) =>
  httpRequestService<ApiResponse<IApplication>>({
    url: `${url}/${path}/${applicationId}`,
    method: "GET",
  });

  export const requestMyApplications = () =>
  httpRequestService<PaginatedResponse<IApplication>>({
    url: `${url}/myApplications`,
    method: "GET",
  });