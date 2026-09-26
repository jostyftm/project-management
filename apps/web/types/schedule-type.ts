import { Report } from "./report-type";
import { AlertConditionItem } from "./alert-types";

export interface ScheduleParameter {
  id: number;
  param_name: string;
  param_value: string;
}

export interface ReportDestination {
  id: number;
  destination_type_id: number;
  type: string | null;
  config: Record<string, unknown> | null;
}

export interface ReportSchedule {
  type: string;
  id: number;
  attributes: {
    report_id: number;
    file_format_id: number;
    cron_expression: string;
    status: "active" | "inactive";
    include_headers: boolean;
    delimiter: string | null;
    every_n_weeks: number | null;
    document_template_id: number | null;
    filename_pattern?: string | null;
    validation_enabled?: boolean;
    validation_source?: "report_data" | "custom_query";
    validation_query?: string | null;
    validation_rules?: AlertConditionItem[] | null;
    webhook_enabled?: boolean;
    webhook_url?: string | null;
    created_at: string;
    updated_at: string;
  };
  relationships: {
    report: Report | null;
    format: { id: number; name: string; code: string } | null;
    document_template?: { id: number; name: string } | null;
    parameters: ScheduleParameter[];
    destinations: ReportDestination[];
  };
}
