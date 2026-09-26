import { ExecutionStatus } from "./execution-type";

export interface SlowestReportItem {
  report_name: string;
  exec_ms: number;
}

export interface ConnectionHealthItem {
  id: number;
  name: string;
  last_status: string;
  last_used_at: string | null;
}

export interface DashboardKpis {
  total_reports: number;
  active_schedules: number;
  total_executions: number;
  executions_today: number;
  success_rate: number;
  total_connections: number;
  total_users: number;
  avg_exec_ms?: number;
  max_exec_ms?: number;
  slowest_report?: SlowestReportItem | null;
}

export interface ExecutionTrendItem {
  date: string;
  label: string;
  total: number;
  success: number;
  failed: number;
}

export interface CategoryDistributionItem {
  id: number;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface FormatDistributionItem {
  id: number;
  code: string;
  name: string;
  count: number;
  percentage: number;
  color: string;
}

export interface UpcomingScheduleItem {
  id: number;
  report_id: number;
  report_name: string;
  cron_expression: string;
  format: string;
  status: string;
}

export interface RecentExecutionItem {
  id: number;
  report_id: number | null;
  report_name: string;
  status: ExecutionStatus;
  trigger_type: string;
  delivery_type: string;
  file_format: string | null;
  row_count: number | null;
  created_at: string | null;
  has_file: boolean;
}

export interface DashboardOverviewData {
  kpis: DashboardKpis;
  executions_trend: ExecutionTrendItem[];
  reports_by_category: CategoryDistributionItem[];
  formats_distribution: FormatDistributionItem[];
  upcoming_schedules: UpcomingScheduleItem[];
  recent_executions: RecentExecutionItem[];
  connections_health?: ConnectionHealthItem[];
}

