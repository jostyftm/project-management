import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import {
  ApiResponse,
  PaginatedResponse,
  PaginateResourcesProps,
} from "@/types/paginate";
import {
  Report,
  ReportColumn,
  ReportHeader,
  ReportParameter,
  ReportParameterOption,
  ReportParameterSyncItem,
} from "@/types/report-type";
import { QueryExecutionResult } from "../types/query-execute-type";

const endpoint = API_URL('report', 'v1');
const path = "reports";

export interface ReportFormValues {
  id?: string;
  database_connection_id: string | number;
  name: string;
  description?: string;
  report_category_id?: string | number | null;
  sql_query: string;
  discarded_parameters?: string[];
  filename_pattern?: string | null;
}

export interface HeaderSyncItem {
  original_column: string;
  display_name: string;
  is_selected: boolean;
}

export const requestAllReports = ({ params }: PaginateResourcesProps) =>
  reportRequestService<PaginatedResponse<Report>>({
    url: `${endpoint}/${path}`,
    method: "GET",
    params: params,
  });

export const saveReportService = (data: ReportFormValues) =>
  reportRequestService<ApiResponse<Report>>({
    url: `${endpoint}/${path}`,
    method: "POST",
    data,
  });

export const updateReportService = (
  id: string | number,
  data: ReportFormValues
) =>
  reportRequestService<ApiResponse<Report>>({
    url: `${endpoint}/${path}/${id}`,
    method: "PUT",
    data,
  });

export const getReportByIdService = (reportId: string | number) =>
  reportRequestService<ApiResponse<Report>>({
    url: `${endpoint}/${path}/${reportId}`,
    method: "GET",
  });

export const deleteReportService = (reportId: string | number) =>
  reportRequestService({
    url: `${endpoint}/${path}/${reportId}`,
    method: "DELETE",
  });

export const dryRunReportService = (
  reportId: string | number,
  values?: Record<string, unknown>
) =>
  reportRequestService<ApiResponse<ReportColumn[]>>({
    url: `${endpoint}/${path}/${reportId}/dry-run`,
    method: "POST",
    data: values ? { values } : {},
  });

export const previewReportService = (data: {
  database_connection_id: number;
  sql_query: string;
  values?: Record<string, unknown>;
  discarded_parameters?: string[];
}) =>
  reportRequestService<ApiResponse<ReportColumn[]>>({
    url: `${endpoint}/${path}/dry-run`,
    method: "POST",
    data,
  });

export const getReportHeadersService = (reportId: string | number) =>
  reportRequestService<ApiResponse<ReportHeader[]>>({
    url: `${endpoint}/${path}/${reportId}/headers`,
    method: "GET",
  });

export const syncReportHeadersService = (
  reportId: string | number,
  headers: HeaderSyncItem[]
) =>
  reportRequestService<ApiResponse<ReportHeader[]>>({
    url: `${endpoint}/${path}/${reportId}/headers`,
    method: "PUT",
    data: { headers },
  });

export const executeReportQueryService = (data: {
  database_connection_id: number | string;
  sql_query: string;
  values?: Record<string, unknown>;
  limit?: number;
  discarded_parameters?: string[];
}) =>
  reportRequestService<ApiResponse<QueryExecutionResult>>({
    url: `${endpoint}/${path}/execute`,
    method: "POST",
    data,
  });

export interface ReportImpactSchedule {
  id: number;
  cron_expression: string;
  status: string | number;
  file_format: string;
  parameters: Record<string, string>;
}

export interface ReportImpactData {
  report_id: number;
  report_name: string;
  schedules_count: number;
  schedules: ReportImpactSchedule[];
  current_parameters: { name: string; data_type: string }[];
  executions_count: number;
}

export const getReportImpactService = (reportId: string | number) =>
  reportRequestService<ApiResponse<ReportImpactData>>({
    url: `${endpoint}/${path}/${reportId}/impact`,
    method: "GET",
  });

export const getReportParametersService = (reportId: string | number) =>
  reportRequestService<ApiResponse<ReportParameter[]>>({
    url: `${endpoint}/${path}/${reportId}/parameters`,
    method: "GET",
  });

export const syncReportParametersService = (
  reportId: string | number,
  parameters: ReportParameterSyncItem[]
) =>
  reportRequestService<ApiResponse<ReportParameter[]>>({
    url: `${endpoint}/${path}/${reportId}/parameters`,
    method: "PUT",
    data: { parameters },
  });

export const getParameterOptionsService = (
  reportId: string | number,
  parameterId: string | number
) =>
  reportRequestService<{ data: ReportParameterOption[] }>({
    url: `${endpoint}/${path}/${reportId}/parameters/${parameterId}/options`,
    method: "GET",
  });

export const testParameterQueryService = (
  database_connection_id: number,
  query: string
) =>
  reportRequestService<{ data: ReportParameterOption[] }>({
    url: `${endpoint}/${path}/parameters/test-query`,
    method: "POST",
    data: { database_connection_id, query },
  });


