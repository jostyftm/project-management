import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import { PaginateResourcesProps, PaginatedResponse } from "@/types/paginate";
import {
  GenerateReportPayload,
  GenerateReportResponse,
  MyReportItem,
  PreviewData,
} from "../types/my-report-types";

const endpoint = API_URL("report", "v1");

export const requestMyReports = ({ params }: PaginateResourcesProps) =>
  reportRequestService<PaginatedResponse<MyReportItem>>({
    url: `${endpoint}/my-reports`,
    method: "GET",
    params: params,
  });

export const requestMyReportById = (id: number | string) =>
  reportRequestService<{ data: MyReportItem }>({
    url: `${endpoint}/my-reports/${id}`,
    method: "GET",
  });

export const requestReportPreview = (
  id: number | string,
  params?: Record<string, any>,
  limit: number = 50,
  _userAuthId?: number
) => {
  return reportRequestService<{ data: PreviewData }>({
    url: `${endpoint}/my-reports/${id}/preview`,
    method: "POST",
    data: { params, limit },
  });
};

export const requestGenerateReport = (
  id: number | string,
  data: GenerateReportPayload,
  _userAuthId?: number
) => {
  return reportRequestService<GenerateReportResponse>({
    url: `${endpoint}/my-reports/${id}/generate`,
    method: "POST",
    data,
  });
};

export const requestMyReportParameterOptions = (
  reportId: number | string,
  paramId: number | string,
  _userAuthId?: number
) => {
  return reportRequestService<{ data: Array<{ value: string | number; label: string }> }>({
    url: `${endpoint}/my-reports/${reportId}/parameters/${paramId}/options`,
    method: "GET",
  });
};

