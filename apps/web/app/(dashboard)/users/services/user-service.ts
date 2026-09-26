import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import {
  ApiResponse,
  PaginatedResponse,
  PaginateResourcesProps,
} from "@/types/paginate";
import { Report } from "@/types/report-type";
import {
  UserItem,
  UserUpdateFormValues,
} from "../types/user-types";

const endpoint = API_URL("report", "v1");
const path = "users";

export const requestAllUsers = ({ params }: PaginateResourcesProps) =>
  reportRequestService<PaginatedResponse<UserItem>>({
    url: `${endpoint}/${path}`,
    method: "GET",
    params: params,
  });

export const getUserByIdService = (userId: string | number) =>
  reportRequestService<ApiResponse<UserItem>>({
    url: `${endpoint}/${path}/${userId}`,
    method: "GET",
  });

export const updateUserService = (
  id: string | number,
  data: UserUpdateFormValues
) =>
  reportRequestService<ApiResponse<UserItem>>({
    url: `${endpoint}/${path}/${id}`,
    method: "PUT",
    data,
  });

export const deleteUserService = (userId: string | number) =>
  reportRequestService({
    url: `${endpoint}/${path}/${userId}`,
    method: "DELETE",
  });

export const syncUsersService = (data?: {
  application_id?: number;
  url?: string;
  sync?: boolean;
}) =>
  reportRequestService<{ success: boolean; message: string }>({
    url: `${endpoint}/${path}/sync`,
    method: "POST",
    data: data ?? { sync: true },
  });

export const getUserReportsService = (userId: string | number) =>
  reportRequestService<{ data: Report[] }>({
    url: `${endpoint}/${path}/${userId}/reports`,
    method: "GET",
  });

export const assignReportsToUserService = (
  userId: string | number,
  reportIds: number[]
) =>
  reportRequestService<ApiResponse<UserItem>>({
    url: `${endpoint}/${path}/${userId}/reports`,
    method: "PUT",
    data: { report_ids: reportIds },
  });

export const requestAllAvailableReports = () =>
  reportRequestService<{ data: Report[] }>({
    url: `${endpoint}/reports`,
    method: "GET",
    params: { paginate: false },
  });
