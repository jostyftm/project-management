export type QueryParamType =
  | "text"
  | "number"
  | "date"
  | "datetime-local"
  | "boolean";

export interface QueryExecutionResult {
  columns: string[];
  rows: Record<string, unknown>[];
  row_count: number;
  execution_time_ms: number;
}

export interface DetectedParam {
  name: string;
  type: QueryParamType;
  value: string;
}
