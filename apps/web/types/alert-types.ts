export type ReportAlertSeverity = "info" | "warning" | "critical";
export type ReportAlertStatus = "active" | "paused" | "triggered";
export type ReportAlertConditionType = "row_count" | "column_value";
export type ReportAlertLogicOperator = "AND" | "OR";

export type ReportAlertConditionOperator =
  | ">"
  | ">="
  | "<"
  | "<="
  | "="
  | "!="
  | "contains"
  | "not_contains"
  | "is_null"
  | "is_not_null"
  | "older_than_days"
  | "newer_than_days"
  | "days_until_less_than"
  | "is_today";

export interface AlertConditionItem {
  id?: string;
  type: ReportAlertConditionType;
  column?: string | null;
  operator: ReportAlertConditionOperator;
  value: string;
  logic_operator?: ReportAlertLogicOperator;
}

export interface AlertConditionResultItem {
  type: ReportAlertConditionType;
  column?: string;
  operator: string;
  target: string;
  evaluated_value: string;
  triggered: boolean;
  snapshot: string;
  logic_operator?: ReportAlertLogicOperator;
}

export interface AlertNotificationLogEntry {
  status: "sent" | "failed";
  status_code?: number;
  latency_ms?: number;
  payload_sent?: any;
  response_body?: string;
  error?: string | null;
  recipients?: string[];
  method?: string;
  url?: string;
  sent_at: string;
}

export interface AlertNotificationLogs {
  email?: AlertNotificationLogEntry;
  telegram?: AlertNotificationLogEntry;
  webhook?: AlertNotificationLogEntry;
}

export type ReportAlertChannel = "email" | "telegram" | "webhook";

export interface EmailChannelConfig {
  recipients: string[];
  subject?: string | null;
  message?: string | null;
  include_csv_attachment?: boolean;
}

export interface TelegramChannelConfig {
  bot_token?: string | null;
  chat_id?: string | null;
  message?: string | null;
}

export interface WebhookChannelConfig {
  url?: string | null;
  method?: "POST" | "PUT" | "PATCH" | "GET";
  headers?: Record<string, string> | null;
  payload_template?: string | null;
}

export interface ReportAlertNotification {
  id?: number;
  report_alert_id?: number;
  channel: ReportAlertChannel;
  is_active: boolean;
  config: EmailChannelConfig | TelegramChannelConfig | WebhookChannelConfig | Record<string, any>;
}

export interface ReportAlertIncident {
  id: number;
  report_alert_id: number;
  triggered: boolean;
  evaluated_value: string | null;
  threshold_snapshot: string | null;
  notification_status: "sent" | "throttled" | "failed" | "none";
  error_message: string | null;
  sample_data: Record<string, any>[] | null;
  notification_logs?: AlertNotificationLogs | null;
  created_at: string;
}

export interface ReportAlert {
  id: number;
  report_id: number;
  name: string;
  description: string | null;
  status: ReportAlertStatus;
  severity: ReportAlertSeverity;
  condition_type: ReportAlertConditionType;
  condition_column: string | null;
  condition_operator: ReportAlertConditionOperator;
  condition_value: string;
  conditions?: AlertConditionItem[] | null;
  cron_expression: string;
  parameters: Record<string, any> | null;
  notify_email: boolean;
  email_recipients: string[];
  email_subject: string | null;
  email_message: string | null;
  include_csv_attachment: boolean;
  notify_telegram: boolean;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
  notify_webhook: boolean;
  webhook_url: string | null;
  webhook_method?: "POST" | "PUT" | "PATCH";
  webhook_headers?: Record<string, string> | null;
  webhook_payload_template?: string | null;
  cooldown_minutes: number;
  last_checked_at: string | null;
  last_triggered_at: string | null;
  last_notification_sent_at: string | null;
  last_evaluated_value: string | null;
  created_at: string;
  updated_at: string;
  report?: {
    id: number;
    name: string;
    description?: string;
  };
  incidents?: ReportAlertIncident[];
  notifications?: ReportAlertNotification[];
  json_logic?: Record<string, any> | null;
}

export interface ReportColumnOption {
  name: string;
  label: string;
  data_type?: "date" | "number" | "string" | "boolean";
}

export interface AlertTestResult {
  success: boolean;
  triggered: boolean;
  evaluated_value: string;
  threshold_snapshot: string;
  total_rows: number;
  sample_data: Record<string, any>[];
  columns?: string[];
  condition_results?: AlertConditionResultItem[];
  error?: string;
}

export interface AlertFormPayload {
  report_id: number;
  name: string;
  description?: string | null;
  severity: ReportAlertSeverity;
  condition_type?: ReportAlertConditionType;
  condition_column?: string | null;
  condition_operator?: ReportAlertConditionOperator;
  condition_value?: string;
  conditions?: AlertConditionItem[];
  cron_expression: string;
  parameters?: Record<string, any> | null;
  notify_email: boolean;
  email_recipients: string[];
  email_subject?: string | null;
  email_message?: string | null;
  include_csv_attachment: boolean;
  notify_telegram: boolean;
  telegram_bot_token?: string | null;
  telegram_chat_id?: string | null;
  notify_webhook: boolean;
  webhook_url?: string | null;
  webhook_method?: "POST" | "PUT" | "PATCH";
  webhook_headers?: Record<string, string> | null;
  webhook_payload_template?: string | null;
  cooldown_minutes: number;
  notifications?: ReportAlertNotification[];
  json_logic?: Record<string, any> | null;
}

export const OPERATORS_BY_DATA_TYPE: Record<
  string,
  { value: ReportAlertConditionOperator; label: string; unary?: boolean; placeholder?: string }[]
> = {
  date: [
    { value: "older_than_days", label: "Más antiguo que X días", placeholder: "ej: 30 (días)" },
    { value: "newer_than_days", label: "En los últimos X días", placeholder: "ej: 7 (días)" },
    { value: "days_until_less_than", label: "Vence en menos de X días", placeholder: "ej: 5 (días)" },
    { value: "is_today", label: "Es hoy", unary: true },
    { value: "=", label: "Igual a fecha", placeholder: "YYYY-MM-DD" },
    { value: "!=", label: "Diferente a fecha", placeholder: "YYYY-MM-DD" },
    { value: "is_null", label: "Es nulo / vacío", unary: true },
    { value: "is_not_null", label: "No es nulo", unary: true },
  ],
  number: [
    { value: ">", label: "Mayor que (>)", placeholder: "ej: 100" },
    { value: ">=", label: "Mayor o igual (>=)", placeholder: "ej: 100" },
    { value: "<", label: "Menor que (<)", placeholder: "ej: 50" },
    { value: "<=", label: "Menor o igual (<=)", placeholder: "ej: 50" },
    { value: "=", label: "Igual a (=)", placeholder: "ej: 0" },
    { value: "!=", label: "Diferente de (!=)", placeholder: "ej: 0" },
    { value: "is_null", label: "Es nulo", unary: true },
    { value: "is_not_null", label: "No es nulo", unary: true },
  ],
  string: [
    { value: "=", label: "Igual a (=)", placeholder: "Texto exacto" },
    { value: "!=", label: "Diferente de (!=)", placeholder: "Texto exacto" },
    { value: "contains", label: "Contiene texto", placeholder: "Texto a buscar" },
    { value: "not_contains", label: "No contiene texto", placeholder: "Texto a excluir" },
    { value: "is_null", label: "Es nulo / vacío", unary: true },
    { value: "is_not_null", label: "No es nulo", unary: true },
  ],
  boolean: [
    { value: "=", label: "Igual a", placeholder: "true / false" },
    { value: "!=", label: "Diferente de", placeholder: "true / false" },
    { value: "is_null", label: "Es nulo", unary: true },
    { value: "is_not_null", label: "No es nulo", unary: true },
  ],
};

export const ROW_COUNT_OPERATORS: {
  value: ReportAlertConditionOperator;
  label: string;
  placeholder?: string;
}[] = [
  { value: ">", label: "Mayor que (>)", placeholder: "ej: 10" },
  { value: ">=", label: "Mayor o igual (>=)", placeholder: "ej: 10" },
  { value: "<", label: "Menor que (<)", placeholder: "ej: 5" },
  { value: "<=", label: "Menor o igual (<=)", placeholder: "ej: 5" },
  { value: "=", label: "Igual a (=)", placeholder: "ej: 0" },
  { value: "!=", label: "Diferente de (!=)", placeholder: "ej: 0" },
];
