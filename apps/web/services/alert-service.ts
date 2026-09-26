import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import {
  AlertFormPayload,
  AlertTestResult,
  ReportAlert,
  ReportAlertIncident,
  ReportColumnOption,
} from "@/types/alert-types";
import { PaginatedResponse } from "@/types/paginate";

const endpoint = API_URL("report", "v1");

export const requestAlerts = (params?: Record<string, any>) =>
  reportRequestService<PaginatedResponse<ReportAlert>>({
    url: `${endpoint}/report-alerts`,
    method: "GET",
    params,
  });

export const requestAlertById = (id: number | string) =>
  reportRequestService<{ data: ReportAlert }>({
    url: `${endpoint}/report-alerts/${id}`,
    method: "GET",
  });

export const requestCreateAlert = (data: AlertFormPayload) =>
  reportRequestService<{ data: ReportAlert; message: string }>({
    url: `${endpoint}/report-alerts`,
    method: "POST",
    data,
  });

export const requestUpdateAlert = (id: number | string, data: Partial<AlertFormPayload>) =>
  reportRequestService<{ data: ReportAlert; message: string }>({
    url: `${endpoint}/report-alerts/${id}`,
    method: "PUT",
    data,
  });

export const requestDeleteAlert = (id: number | string) =>
  reportRequestService<void>({
    url: `${endpoint}/report-alerts/${id}`,
    method: "DELETE",
  });

export const requestToggleAlert = (id: number | string) =>
  reportRequestService<{ data: ReportAlert; message: string }>({
    url: `${endpoint}/report-alerts/${id}/toggle`,
    method: "POST",
  });

export const requestTestAlert = (id: number | string) =>
  reportRequestService<{ data: AlertTestResult }>({
    url: `${endpoint}/report-alerts/${id}/test`,
    method: "POST",
  });

export const requestTestCondition = (data: {
  report_id: number;
  conditions?: import("@/types/alert-types").AlertConditionItem[];
  condition_type?: string;
  condition_column?: string | null;
  condition_operator?: string;
  condition_value?: string;
  parameters?: Record<string, any> | null;
}) =>
  reportRequestService<{ data: AlertTestResult }>({
    url: `${endpoint}/report-alerts/test-condition`,
    method: "POST",
    data,
  });

export const requestAlertIncidents = (id: number | string, page: number = 1) =>
  reportRequestService<PaginatedResponse<ReportAlertIncident>>({
    url: `${endpoint}/report-alerts/${id}/incidents`,
    method: "GET",
    params: { page },
  });

export const requestReportColumns = (reportId: number | string) =>
  reportRequestService<{ data: ReportColumnOption[] }>({
    url: `${endpoint}/report-alerts/reports/${reportId}/columns`,
    method: "GET",
  });
