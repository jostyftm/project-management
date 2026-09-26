import { DatabaseConnection } from "./connection-type";

export interface ReportParameterOption {
  value: string | number;
  label: string;
}

export type ParameterInputType =
  | "text"
  | "number"
  | "date"
  | "datetime"
  | "boolean"
  | "select";

export type ParameterOptionsSource = "query" | "static" | null;

export interface ReportParameterSyncItem {
  id?: number;
  param_name: string;
  data_type?: string;
  display_label?: string;
  input_type?: ParameterInputType;
  options_source?: ParameterOptionsSource;
  source_query?: string | null;
  static_options?: ReportParameterOption[] | null;
  default_value?: string | null;
}

export interface ReportParameter {
  type: string;
  id: number;
  attributes: {
    report_id: number;
    param_name: string;
    data_type: string;
    display_label?: string;
    input_type?: ParameterInputType;
    options_source?: ParameterOptionsSource;
    source_query?: string | null;
    static_options?: ReportParameterOption[] | null;
    default_value?: string | null;
  };
}

export interface ReportHeader {
  type: string;
  id: number;
  attributes: {
    report_id: number;
    original_column: string;
    display_name: string;
    is_selected: boolean;
  };
}

export interface Report {
  type: string;
  id: number;
  attributes: {
    name: string;
    description: string | null;
    report_category_id: number | null;
    sql_query: string;
    discarded_parameters?: string[];
    filename_pattern?: string | null;
    created_at: string;
    updated_at: string;
  };
  relationships: {
    connection_id: number;
    connection: DatabaseConnection | null;
    category: {
      id: number;
      name: string;
      parent_id: number | null;
    } | null;
    parameters: ReportParameter[];
    headers: ReportHeader[];
  };
}

export interface ReportColumn {
  type: string;
  attributes: {
    key: string;
    label: string;
  };
}
