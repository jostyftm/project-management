export type ExecutionStatus = "processing" | "success" | "failed" | "skipped";
export type TriggerType = "manual" | "scheduled";

export interface ReportExecution {
  type: string;
  id: number;
  attributes: {
    report_schedule_id: number;
    status: ExecutionStatus;
    generated_file_path: string | null;
    params_used: Record<string, unknown> | null;
    row_count: number | null;
    file_size: number | null;
    trigger_type: TriggerType;
    error_log: string | null;
    started_at: string | null;
    finished_at: string | null;
    duration: number | null;
    download_url: string | null;
    file_name?: string | null;
  };
  relationships: {
    schedule: {
      id: number;
      report: string | null;
    } | null;
  };
}
