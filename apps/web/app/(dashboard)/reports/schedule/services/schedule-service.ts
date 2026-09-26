import { API_URL } from "@/config/enviroments";
import { reportRequestService } from "@/lib/request-report";
import { PaginatedResponse, PaginateResourcesProps } from "@/types/paginate";
import { ReportSchedule } from "@/types/schedule-type";

const endpoint = API_URL('report', 'v1');
const path = "report-schedules";

import { AlertConditionItem } from "@/types/alert-types";

export interface ScheduleParameterInput {
  param_name: string;
  param_value: string;
}

export interface ScheduleDestinationInput {
  destination_type_id: number;
  config?: Record<string, unknown>;
}

export interface ScheduleFormValues {
  id?: string;
  report_id: number;
  file_format_id: number;
  cron_expression: string;
  status?: "active" | "inactive";
  include_headers?: boolean;
  delimiter?: string;
  every_n_weeks?: number | null;
  document_template_id?: number | null;
  filename_pattern?: string | null;
  validation_enabled?: boolean;
  validation_source?: "report_data" | "custom_query";
  validation_query?: string | null;
  validation_rules?: AlertConditionItem[] | null;
  webhook_enabled?: boolean;
  webhook_url?: string | null;
  parameters?: ScheduleParameterInput[];
  destinations?: ScheduleDestinationInput[];
}

export interface TestScheduleValidationPayload {
  report_id: number;
  parameters?: Record<string, unknown>;
  validation_source?: "report_data" | "custom_query";
  validation_query?: string | null;
  validation_rules: AlertConditionItem[];
}

export const requestAllSchedules = ({ params }: PaginateResourcesProps) =>
  reportRequestService<PaginatedResponse<ReportSchedule>>({
    url: `${endpoint}/${path}`,
    method: "GET",
    params: params,
  });

export const getScheduleByIdService = (scheduleId: string | number) =>
  reportRequestService<ReportSchedule>({
    url: `${endpoint}/${path}/${scheduleId}`,
    method: "GET",
  });

export const saveScheduleService = (data: ScheduleFormValues) =>
  reportRequestService<ReportSchedule>({
    url: `${endpoint}/${path}`,
    method: "POST",
    data,
  });

export const updateScheduleService = (
  id: string | number,
  data: ScheduleFormValues
) =>
  reportRequestService<ReportSchedule>({
    url: `${endpoint}/${path}/${id}`,
    method: "PUT",
    data,
  });

export const deleteScheduleService = (scheduleId: string | number) =>
  reportRequestService({
    url: `${endpoint}/${path}/${scheduleId}`,
    method: "DELETE",
  });

export const runScheduleService = (scheduleId: string | number) =>
  reportRequestService<{ message: string }>({
    url: `${endpoint}/${path}/${scheduleId}/run`,
    method: "POST",
  });

export const testScheduleValidationService = (data: TestScheduleValidationPayload) =>
  reportRequestService<{ data: any }>({
    url: `${endpoint}/${path}/test-validation`,
    method: "POST",
    data,
  });

export const cloneScheduleService = (scheduleId: string | number) =>
  reportRequestService<ReportSchedule>({
    url: `${endpoint}/${path}/${scheduleId}/clone`,
    method: "POST",
  });

export const bulkToggleScheduleService = (ids: (string | number)[], status: "active" | "inactive") =>
  reportRequestService<{ message: string; updated: number }>({
    url: `${endpoint}/${path}/bulk-toggle`,
    method: "POST",
    data: { ids, status },
  });
