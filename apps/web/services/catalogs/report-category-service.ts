import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import { ApiResponse, PaginatedResponse } from "@/types/paginate";
import { ReportCategory } from "@/types/report-category-type";

const url = API_URL('report', 'v1');
const path = "report-categories";

export interface ReportCategoryFormValues {
  name: string;
  parent_id?: number | null;
}

type ResourceList<T> = { data: T[] };

export const requestAllReportCategories = () =>
  reportRequestService<ResourceList<ReportCategory>>({
    url: `${url}/${path}`,
    method: "GET",
    params: { paginate: false },
  });

export const requestPaginatedReportCategories = ({
  params,
}: {
  params?: Record<string, unknown>;
}) =>
  reportRequestService<PaginatedResponse<ReportCategory>>({
    url: `${url}/${path}`,
    method: "GET",
    params,
  });

export const requestReportCategoryChildren = ({
  id,
  params,
}: {
  id: string | number;
  params?: Record<string, unknown>;
}) =>
  reportRequestService<PaginatedResponse<ReportCategory>>({
    url: `${url}/${path}/${id}/children`,
    method: "GET",
    params,
  });

export const saveReportCategoryService = (data: ReportCategoryFormValues) =>
  reportRequestService<ApiResponse<ReportCategory>>({
    url: `${url}/${path}`,
    method: "POST",
    data,
  });

export const updateReportCategoryService = (
  id: string | number,
  data: ReportCategoryFormValues
) =>
  reportRequestService<ApiResponse<ReportCategory>>({
    url: `${url}/${path}/${id}`,
    method: "PUT",
    data,
  });

export const deleteReportCategoryService = (id: string | number) =>
  reportRequestService({
    url: `${url}/${path}/${id}`,
    method: "DELETE",
  });