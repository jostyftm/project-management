export interface ReportParameterOption {
  value: string | number;
  label: string;
}

export interface MyReportParameter {
  type?: string;
  id: number;
  attributes?: {
    report_id?: number;
    param_name: string;
    data_type?: string;
    display_label?: string;
    input_type?: "text" | "number" | "date" | "datetime" | "boolean" | "select";
    options_source?: "query" | "static" | null;
    source_query?: string | null;
    static_options?: ReportParameterOption[] | null;
    default_value?: string | null;
    label?: string;
    is_required?: boolean;
  };
  param_name?: string;
  data_type?: string;
  display_label?: string;
  input_type?: "text" | "number" | "date" | "datetime" | "boolean" | "select";
  options_source?: "query" | "static" | null;
  source_query?: string | null;
  static_options?: ReportParameterOption[] | null;
  default_value?: string | null;
  label?: string;
  is_required?: boolean;
}

export interface MyReportHeader {
  type?: string;
  id: number;
  attributes?: {
    report_id?: number;
    original_column: string;
    display_name: string;
    is_selected: boolean;
  };
  original_column?: string;
  display_name?: string;
  is_selected?: boolean;
}

export interface MyReportItem {
  id: number;
  type: string;
  attributes: {
    name: string;
    description: string | null;
    report_category_id: number | null;
    sql_query?: string;
    filename_pattern?: string | null;
    created_at?: string;
    updated_at?: string;
  };
  relationships?: {
    category?: {
      id: number;
      name: string;
      parent_id?: number | null;
    } | null;
    connection?: {
      id: number;
      name: string;
      driver?: string;
    } | null;
    parameters?: MyReportParameter[];
    headers?: MyReportHeader[];
  };
}

export type ReportFormat = "xlsx" | "csv" | "pdf" | "docx" | "txt";
export type DeliveryType = "download" | "email";

export interface PreviewColumn {
  key: string;
  label: string;
  is_selected: boolean;
}

export interface PreviewData {
  columns: PreviewColumn[];
  rows: Record<string, any>[];
  total_preview: number;
  execution_time_ms: number;
}

export interface GenerateReportPayload {
  params?: Record<string, any>;
  format: ReportFormat;
  delivery_type: DeliveryType;
  destination_email?: string;
  download_id?: number;
  file_path?: string;
  user_auth_id?: number;
  selected_columns?: string[];
  filename_pattern?: string;
}

export interface GenerateReportResponse {
  message: string;
  execution_id: number;
  download_id?: number;
  delivery_type: DeliveryType;
  destination_email?: string;
  status: string;
}
