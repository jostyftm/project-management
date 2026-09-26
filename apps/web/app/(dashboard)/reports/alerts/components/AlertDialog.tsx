"use client";

import React, { useState, useEffect, useMemo } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { CategoryTreeSelect } from "../../components/wizard/CategoryTreeSelect";
import SearchableSelect from "@/components/ui/searchable-select";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { JsonEditor } from "@/components/ui/json-editor";
import { compileConditionsToJsonLogic } from "@/lib/json-logic";
import { useListReports } from "../../hooks/use-list-reports";
import { useListReportCategories } from "@/hooks/use-list-report-categories";
import {
  AlertConditionItem,
  AlertFormPayload,
  AlertTestResult,
  OPERATORS_BY_DATA_TYPE,
  ReportAlert,
  ReportAlertConditionOperator,
  ReportAlertConditionType,
  ReportAlertLogicOperator,
  ReportAlertNotification,
  ReportAlertSeverity,
  ReportColumnOption,
  ROW_COUNT_OPERATORS,
} from "@/types/alert-types";
import {
  requestReportColumns,
  requestTestCondition,
} from "@/services/alert-service";
import { getReportByIdService } from "../../services/report-service";
import { toast } from "sonner";
import {
  Sparkles,
  AlertTriangle,
  Info,
  Flame,
  CheckCircle2,
  Play,
  Loader2,
  Mail,
  Webhook,
  Send,
  Plus,
  Trash2,
  RefreshCw,
  X,
  Code,
  Layers,
} from "lucide-react";

interface AlertDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  alert?: ReportAlert | null;
  onSubmit: (payload: AlertFormPayload) => Promise<any>;
  isSubmitting?: boolean;
}

const CRON_PRESETS = [
  { label: "Cada 5 minutos", value: "*/5 * * * *" },
  { label: "Cada 15 minutos", value: "*/15 * * * *" },
  { label: "Cada 30 minutos", value: "*/30 * * * *" },
  { label: "Cada hora", value: "0 * * * *" },
  { label: "Cada 6 horas", value: "0 */6 * * * *" },
  { label: "Diario a las 08:00 AM", value: "0 8 * * *" },
];

const COOLDOWN_PRESETS = [
  { label: "Sin espera (cada evaluación)", value: 0 },
  { label: "15 minutos", value: 15 },
  { label: "30 minutos", value: 30 },
  { label: "1 hora (Recomendado)", value: 60 },
  { label: "4 horas", value: 240 },
  { label: "24 horas", value: 1440 },
];

const WEBHOOK_MACROS = [
  { label: "{{alert_name}}", desc: "Nombre de la alerta" },
  { label: "{{severity}}", desc: "Severidad" },
  { label: "{{evaluated_value}}", desc: "Valor detectado" },
  { label: "{{condition}}", desc: "Resumen de condición" },
  { label: "{{total_rows}}", desc: "Total de filas devueltas" },
  { label: "{{timestamp}}", desc: "Fecha ISO-8601" },
  { label: "{{report_name}}", desc: "Nombre del reporte" },
];

export const AlertDialogComponent: React.FC<AlertDialogProps> = ({
  open,
  onOpenChange,
  alert,
  onSubmit,
  isSubmitting = false,
}) => {
  const isEdit = Boolean(alert);

  // Catálogos
  const { data: categories = [] } = useListReportCategories();
  const reports = useListReports({
    params: { params: { paginate: false } },
  });

  // Estado del formulario
  const [selectedCategoryId, setSelectedCategoryId] = useState<string>("");
  const [reportId, setReportId] = useState<string>("");
  const [name, setName] = useState<string>("");
  const [description, setDescription] = useState<string>("");
  const [severity, setSeverity] = useState<ReportAlertSeverity>("warning");

  // Múltiples condiciones
  const [conditions, setConditions] = useState<AlertConditionItem[]>([
    {
      id: "1",
      type: "row_count",
      column: "",
      operator: ">",
      value: "0",
      logic_operator: "AND",
    },
  ]);

  const [cronExpression, setCronExpression] = useState<string>("*/15 * * * *");
  const [cooldownMinutes, setCooldownMinutes] = useState<number>(60);
  const [parameters, setParameters] = useState<Record<string, any>>({});
  const [reportParamConfigs, setReportParamConfigs] = useState<any[]>([]);

  // Columnas disponibles e inferencia de tipos
  const [availableColumns, setAvailableColumns] = useState<ReportColumnOption[]>([]);
  const [isLoadingColumns, setIsLoadingColumns] = useState<boolean>(false);

  // Canales de Notificación
  // 1. Correo
  const [notifyEmail, setNotifyEmail] = useState<boolean>(true);
  const [emailInput, setEmailInput] = useState<string>("");
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailMessage, setEmailMessage] = useState<string>("");
  const [includeCsvAttachment, setIncludeCsvAttachment] = useState<boolean>(false);

  // 2. Telegram
  const [notifyTelegram, setNotifyTelegram] = useState<boolean>(false);
  const [telegramBotToken, setTelegramBotToken] = useState<string>("");
  const [telegramChatId, setTelegramChatId] = useState<string>("");

  // 3. Webhook Avanzado
  const [notifyWebhook, setNotifyWebhook] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>("");
  const [webhookMethod, setWebhookMethod] = useState<"POST" | "PUT" | "PATCH">("POST");
  const [webhookHeadersStr, setWebhookHeadersStr] = useState<string>("");
  const [webhookPayloadTemplate, setWebhookPayloadTemplate] = useState<string>("");

  // Estado de prueba dry-run
  const [testingCondition, setTestingCondition] = useState<boolean>(false);
  const [testResult, setTestResult] = useState<AlertTestResult | null>(null);
  const [showJsonLogicPreview, setShowJsonLogicPreview] = useState<boolean>(false);

  // Regla JsonLogic compilada automáticamente a partir del árbol visual de condiciones
  const compiledJsonLogic = useMemo(() => {
    return compileConditionsToJsonLogic("column_value", conditions);
  }, [conditions]);

  // Cargar columnas del reporte
  const fetchColumns = async (id: string) => {
    if (!id) {
      setAvailableColumns([]);
      return;
    }
    setIsLoadingColumns(true);
    try {
      const res = await requestReportColumns(id);
      const cols = res?.data || [];
      setAvailableColumns(cols);
    } catch (err) {
      console.warn("No se pudieron cargar las columnas vía endpoint:", err);
    } finally {
      setIsLoadingColumns(false);
    }
  };

  // Inicializar estado al abrir diálogo o cambiar de alerta
  useEffect(() => {
    if (!open) return;

    if (alert) {
      setReportId(String(alert.report_id));
      setName(alert.name);
      setDescription(alert.description || "");
      setSeverity(alert.severity);

      // Cargar condiciones
      if (alert.conditions && alert.conditions.length > 0) {
        setConditions(
          alert.conditions.map((c, idx) => ({
            ...c,
            id: c.id || String(idx + 1),
            logic_operator: c.logic_operator || "AND",
          }))
        );
      } else if (alert.condition_type) {
        setConditions([
          {
            id: "1",
            type: alert.condition_type,
            column: alert.condition_column || "",
            operator: alert.condition_operator,
            value: alert.condition_value,
            logic_operator: "AND",
          },
        ]);
      } else {
        setConditions([
          {
            id: "1",
            type: "row_count",
            column: "",
            operator: ">",
            value: "0",
            logic_operator: "AND",
          },
        ]);
      }

      setCronExpression(alert.cron_expression);
      setCooldownMinutes(alert.cooldown_minutes ?? 60);
      setParameters(alert.parameters || {});

      // Canales (desde array normalizado o fallback legacy)
      const emailNotif = alert.notifications?.find((n) => n.channel === "email");
      const tgNotif = alert.notifications?.find((n) => n.channel === "telegram");
      const whNotif = alert.notifications?.find((n) => n.channel === "webhook");

      // Email
      if (emailNotif) {
        setNotifyEmail(emailNotif.is_active);
        setEmailRecipients((emailNotif.config as any).recipients || []);
        setEmailSubject((emailNotif.config as any).subject || "");
        setEmailMessage((emailNotif.config as any).message || "");
        setIncludeCsvAttachment(Boolean((emailNotif.config as any).include_csv_attachment));
      } else {
        setNotifyEmail(alert.notify_email);
        setEmailRecipients(alert.email_recipients || []);
        setEmailSubject(alert.email_subject || "");
        setEmailMessage(alert.email_message || "");
        setIncludeCsvAttachment(alert.include_csv_attachment);
      }

      // Telegram
      if (tgNotif) {
        setNotifyTelegram(tgNotif.is_active);
        setTelegramBotToken((tgNotif.config as any).bot_token || "");
        setTelegramChatId((tgNotif.config as any).chat_id || "");
      } else {
        setNotifyTelegram(Boolean(alert.notify_telegram));
        setTelegramBotToken(alert.telegram_bot_token || "");
        setTelegramChatId(alert.telegram_chat_id || "");
      }

      // Webhook
      if (whNotif) {
        setNotifyWebhook(whNotif.is_active);
        setWebhookUrl((whNotif.config as any).url || "");
        setWebhookMethod((whNotif.config as any).method || "POST");
        setWebhookHeadersStr(
          (whNotif.config as any).headers ? JSON.stringify((whNotif.config as any).headers, null, 2) : ""
        );
        setWebhookPayloadTemplate((whNotif.config as any).payload_template || "");
      } else {
        setNotifyWebhook(alert.notify_webhook);
        setWebhookUrl(alert.webhook_url || "");
        setWebhookMethod(alert.webhook_method || "POST");
        setWebhookHeadersStr(
          alert.webhook_headers ? JSON.stringify(alert.webhook_headers, null, 2) : ""
        );
        setWebhookPayloadTemplate(alert.webhook_payload_template || "");
      }

      fetchColumns(String(alert.report_id));
    } else {
      setSelectedCategoryId("");
      setReportId("");
      setName("");
      setDescription("");
      setSeverity("warning");
      setConditions([
        {
          id: "1",
          type: "row_count",
          column: "",
          operator: ">",
          value: "0",
          logic_operator: "AND",
        },
      ]);
      setCronExpression("*/15 * * * *");
      setCooldownMinutes(60);
      setParameters({});

      setNotifyEmail(true);
      setEmailInput("");
      setEmailRecipients([]);
      setEmailSubject("");
      setEmailMessage("");
      setIncludeCsvAttachment(false);

      setNotifyTelegram(false);
      setTelegramBotToken("");
      setTelegramChatId("");

      setNotifyWebhook(false);
      setWebhookUrl("");
      setWebhookMethod("POST");
      setWebhookHeadersStr("");
      setWebhookPayloadTemplate("");

      setAvailableColumns([]);
    }
    setTestResult(null);
  }, [open, alert]);

  // Cargar parámetros y columnas al seleccionar reportId
  useEffect(() => {
    if (!reportId) {
      setReportParamConfigs([]);
      setAvailableColumns([]);
      return;
    }

    getReportByIdService(reportId)
      .then((res: any) => {
        const repData = res?.data?.data || res?.data;
        const rawParams = repData?.relationships?.parameters || repData?.parameters || [];
        const normalizedParams = rawParams.map((p: any) => ({
          id: p.id,
          name: p.attributes?.param_name || p.param_name || p.name,
          label:
            p.attributes?.display_label ||
            p.display_label ||
            p.attributes?.param_name ||
            p.param_name ||
            p.name,
          defaultValue: p.attributes?.default_value || p.default_value || "",
          dataType: p.attributes?.data_type || p.data_type || "text",
        }));
        setReportParamConfigs(normalizedParams);
      })
      .catch(() => {
        setReportParamConfigs([]);
      });

    fetchColumns(reportId);
  }, [reportId]);

  // Filtrado de reportes por categoría y orden alfabético A-Z
  const filteredReports = useMemo(() => {
    const list = reports.data || [];
    let result = list;
    if (selectedCategoryId) {
      result = list.filter(
        (r) => String(r.attributes.report_category_id) === String(selectedCategoryId)
      );
    }
    return [...result].sort((a, b) =>
      a.attributes.name.localeCompare(b.attributes.name, "es", { sensitivity: "base" })
    );
  }, [reports.data, selectedCategoryId]);

  // Manipulación de condiciones
  const handleAddCondition = () => {
    setConditions((prev) => [
      ...prev,
      {
        id: String(Date.now()),
        type: "column_value",
        column: availableColumns[0]?.name || "",
        operator: "=",
        value: "",
        logic_operator: "AND",
      },
    ]);
  };

  const handleRemoveCondition = (index: number) => {
    if (conditions.length <= 1) return;
    setConditions((prev) => prev.filter((_, i) => i !== index));
  };

  const handleUpdateCondition = (index: number, patch: Partial<AlertConditionItem>) => {
    setConditions((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], ...patch };
      return updated;
    });
  };

  // Obtener operadores compatibles para una condición según el data_type de la columna
  const getOperatorsForCondition = (cond: AlertConditionItem) => {
    if (cond.type === "row_count") {
      return ROW_COUNT_OPERATORS;
    }
    const colDef = availableColumns.find((c) => c.name === cond.column);
    const dType = colDef?.data_type || "string";
    return OPERATORS_BY_DATA_TYPE[dType] || OPERATORS_BY_DATA_TYPE.string;
  };

  // Manejador de emails
  const handleAddEmail = () => {
    const trimmed = emailInput.trim();
    if (!trimmed) return;
    if (!trimmed.includes("@") || !trimmed.includes(".")) {
      toast.error("Ingresa un correo electrónico válido");
      return;
    }
    if (emailRecipients.includes(trimmed)) {
      setEmailInput("");
      return;
    }
    setEmailRecipients([...emailRecipients, trimmed]);
    setEmailInput("");
  };

  const handleRemoveEmail = (email: string) => {
    setEmailRecipients(emailRecipients.filter((e) => e !== email));
  };

  // Inserción de macros en el template de Webhook
  const handleInsertMacro = (macro: string) => {
    setWebhookPayloadTemplate((prev) => prev + macro);
  };

  // Prueba en caliente (Dry-Run)
  const handleTestCondition = async () => {
    if (!reportId) {
      toast.error("Selecciona un reporte primero");
      return;
    }
    setTestingCondition(true);
    setTestResult(null);

    try {
      const res = await requestTestCondition({
        report_id: Number(reportId),
        conditions,
        parameters,
      });

      setTestResult(res.data);

      if (res.data.triggered) {
        toast.success("¡Alerta disparada! Las condiciones se cumplieron con los datos actuales.");
      } else {
        toast.info("Condición evaluada: Estado Normal / OK (No se cumplió el umbral).");
      }
    } catch (err: any) {
      console.error(err);
      toast.error(err?.message || "Error al evaluar las condiciones.");
    } finally {
      setTestingCondition(false);
    }
  };

  // Envío del Formulario
  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!reportId) {
      toast.error("Debes seleccionar un reporte.");
      return;
    }
    if (!name.trim()) {
      toast.error("Ingresa un nombre para la regla de alerta.");
      return;
    }

    // Validar condiciones
    for (let i = 0; i < conditions.length; i++) {
      const c = conditions[i];
      if (c.type === "column_value" && !c.column?.trim()) {
        toast.error(`La condición #${i + 1} no tiene una columna seleccionada.`);
        return;
      }
      const isUnary = ["is_null", "is_not_null", "is_today"].includes(c.operator);
      if (!isUnary && c.value === "" && c.type !== "row_count") {
        toast.error(`Ingresa el valor umbral para la condición #${i + 1}.`);
        return;
      }
    }

    // Validar canales
    if (notifyEmail && emailRecipients.length === 0) {
      toast.error("Agrega al menos un correo destinatario.");
      return;
    }

    if (notifyTelegram && (!telegramBotToken.trim() || !telegramChatId.trim())) {
      toast.error("Para Telegram debes especificar tanto el Bot Token como el Chat ID.");
      return;
    }

    let parsedHeaders: Record<string, string> | null = null;
    if (notifyWebhook) {
      if (!webhookUrl.trim()) {
        toast.error("Ingresa la URL del webhook.");
        return;
      }
      if (webhookHeadersStr.trim()) {
        try {
          parsedHeaders = JSON.parse(webhookHeadersStr.trim());
        } catch {
          toast.error("Los encabezados del Webhook deben ser un objeto JSON válido.");
          return;
        }
      }
    }

    // Construir lista normalizada de notificaciones
    const notificationsList: ReportAlertNotification[] = [];

    if (notifyEmail) {
      notificationsList.push({
        channel: "email",
        is_active: true,
        config: {
          recipients: emailRecipients,
          subject: emailSubject.trim() || null,
          message: emailMessage.trim() || null,
          include_csv_attachment: includeCsvAttachment,
        },
      });
    }

    if (notifyTelegram) {
      notificationsList.push({
        channel: "telegram",
        is_active: true,
        config: {
          bot_token: telegramBotToken.trim(),
          chat_id: telegramChatId.trim(),
        },
      });
    }

    if (notifyWebhook) {
      notificationsList.push({
        channel: "webhook",
        is_active: true,
        config: {
          url: webhookUrl.trim(),
          method: webhookMethod,
          headers: parsedHeaders,
          payload_template: webhookPayloadTemplate.trim() || null,
        },
      });
    }

    const compiledJsonLogic = compileConditionsToJsonLogic("column_value", conditions);

    const payload: AlertFormPayload = {
      report_id: Number(reportId),
      name: name.trim(),
      description: description.trim() || null,
      severity,
      conditions,
      json_logic: compiledJsonLogic,
      notifications: notificationsList,
      cron_expression: cronExpression.trim(),
      parameters,
      notify_email: notifyEmail,
      email_recipients: emailRecipients,
      email_subject: emailSubject.trim() || null,
      email_message: emailMessage.trim() || null,
      include_csv_attachment: includeCsvAttachment,
      notify_telegram: notifyTelegram,
      telegram_bot_token: notifyTelegram ? telegramBotToken.trim() : null,
      telegram_chat_id: notifyTelegram ? telegramChatId.trim() : null,
      notify_webhook: notifyWebhook,
      webhook_url: notifyWebhook ? webhookUrl.trim() : null,
      webhook_method: notifyWebhook ? webhookMethod : "POST",
      webhook_headers: parsedHeaders,
      webhook_payload_template:
        notifyWebhook && webhookPayloadTemplate.trim() ? webhookPayloadTemplate.trim() : null,
      cooldown_minutes: cooldownMinutes,
    };

    await onSubmit(payload);
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-[96vw] sm:max-w-4xl max-h-[92vh] overflow-hidden p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Monitoreo Proactivo de Negocio</span>
          </div>
          <DialogTitle className="text-xl font-bold text-foreground">
            {isEdit ? "Editar Regla de Alerta" : "Nueva Alerta Condicional de Datos"}
          </DialogTitle>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="flex-1 overflow-y-auto pr-2 space-y-6 pt-2">
          {/* SECCIÓN 1: REPORTE FUENTE */}
          <div className="space-y-3.5 rounded-xl p-4 bg-muted/20 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px]">
                1
              </span>
              <span>Reporte y Filtros Base</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Categoría */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Filtrar por Categoría</Label>
                <CategoryTreeSelect
                  categories={categories}
                  value={selectedCategoryId}
                  onChange={(val) => {
                    setSelectedCategoryId(val || "");
                    setReportId("");
                  }}
                  placeholder="Todas las categorías..."
                />
              </div>

              {/* Reporte */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Reporte a Monitorear *</Label>
                <SearchableSelect
                  options={filteredReports.map((r) => ({
                    value: String(r.id),
                    label: r.attributes.name,
                    sublabel: r.attributes.description || undefined,
                  }))}
                  value={reportId}
                  onChange={(val) => setReportId(val)}
                  placeholder="Buscar reporte (ordenado A-Z)..."
                  emptyText="No se encontraron reportes"
                />
              </div>
            </div>

            {/* Parámetros del reporte si tiene */}
            {reportParamConfigs.length > 0 && (
              <div className="pt-2 border-t border-border/40 space-y-2">
                <Label className="text-[11px] font-semibold text-muted-foreground uppercase">
                  Parámetros del Reporte para la Alerta
                </Label>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {reportParamConfigs.map((param) => (
                    <div key={param.id} className="space-y-1">
                      <Label className="text-xs font-mono">:{param.name}</Label>
                      <Input
                        value={parameters[param.name] ?? ""}
                        onChange={(e) =>
                          setParameters({ ...parameters, [param.name]: e.target.value })
                        }
                        placeholder={param.default_value || "Valor..."}
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* SECCIÓN 2: IDENTIFICACIÓN Y SEVERIDAD */}
          <div className="space-y-3.5 rounded-xl p-4 bg-muted/20 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px]">
                2
              </span>
              <span>Identificación y Nivel de Severidad</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
              <div className="sm:col-span-2 space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Nombre de la Alerta *</Label>
                <Input
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="Ej: Facturas Vencidas con saldo pendiente"
                  className="h-9 text-xs"
                />
              </div>

              {/* Selector de Severidad */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Severidad *</Label>
                <Select
                  value={severity}
                  onValueChange={(val: ReportAlertSeverity) => setSeverity(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="critical">
                      <div className="flex items-center gap-1.5 text-rose-600 font-semibold">
                        <Flame className="h-3.5 w-3.5" /> Crítica
                      </div>
                    </SelectItem>
                    <SelectItem value="warning">
                      <div className="flex items-center gap-1.5 text-amber-600 font-semibold">
                        <AlertTriangle className="h-3.5 w-3.5" /> Advertencia
                      </div>
                    </SelectItem>
                    <SelectItem value="info">
                      <div className="flex items-center gap-1.5 text-blue-600 font-semibold">
                        <Info className="h-3.5 w-3.5" /> Informativa
                      </div>
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            <div className="space-y-1.5">
              <Label className="text-xs font-medium text-foreground">Descripción Opcional</Label>
              <Textarea
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Explicación del contexto de la alerta para el equipo..."
                rows={2}
                className="text-xs resize-none"
              />
            </div>
          </div>

          {/* SECCIÓN 3: REGLAS MULTI-CONDICIÓN CON AND/OR & DRY-RUN */}
          <div className="space-y-3.5 rounded-xl p-4 bg-muted/20 border border-border/60">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
                <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px]">
                  3
                </span>
                <span className="flex items-center gap-1.5">
                  <Layers className="h-3.5 w-3.5 text-primary" />
                  Reglas de Condición (AND / OR) y Verificación en Vivo
                </span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleTestCondition}
                  disabled={testingCondition || !reportId}
                  className="h-7 text-xs px-2.5 gap-1.5 border-primary/40 text-primary hover:bg-primary/10"
                >
                  {testingCondition ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Probar en Vivo
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddCondition}
                  className="h-7 text-xs px-2.5 gap-1"
                >
                  <Plus className="h-3.5 w-3.5" /> Agregar Condición
                </Button>
              </div>
            </div>

            {/* Lista de Filas de Condiciones */}
            <div className="space-y-2.5 pt-1">
              {conditions.map((cond, idx) => {
                const isUnary = ["is_null", "is_not_null", "is_today"].includes(cond.operator);
                const colDef = availableColumns.find((c) => c.name === cond.column);
                const colDataType = colDef?.data_type || "string";
                const operators = getOperatorsForCondition(cond);
                const selectedOpDef = operators.find((o) => o.value === cond.operator);

                // Resultado específico de esta condición en el dry-run
                const condResult = testResult?.condition_results?.[idx];

                return (
                  <div key={cond.id || idx} className="space-y-1.5">
                    {/* Operador Lógico entre condiciones */}
                    {idx > 0 && (
                      <div className="flex items-center gap-2 my-1">
                        <div className="h-px bg-border flex-1" />
                        <div className="flex items-center bg-muted rounded-full p-0.5 border border-border">
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCondition(idx, { logic_operator: "AND" })
                            }
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                              cond.logic_operator === "AND"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Y (AND)
                          </button>
                          <button
                            type="button"
                            onClick={() =>
                              handleUpdateCondition(idx, { logic_operator: "OR" })
                            }
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all ${
                              cond.logic_operator === "OR"
                                ? "bg-amber-600 text-white shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            O (OR)
                          </button>
                        </div>
                        <div className="h-px bg-border flex-1" />
                      </div>
                    )}

                    {/* Fila de Campos de la Condición */}
                    <div className="p-3 rounded-lg border border-border/70 bg-background flex flex-col sm:flex-row items-start sm:items-center gap-2.5 shadow-2xs">
                      {/* Tipo: Filas vs Columna */}
                      <div className="w-full sm:w-36 shrink-0">
                        <Select
                          value={cond.type}
                          onValueChange={(val: ReportAlertConditionType) => {
                            const newOp = val === "row_count" ? ">" : "=";
                            handleUpdateCondition(idx, {
                              type: val,
                              operator: newOp as ReportAlertConditionOperator,
                              column: val === "row_count" ? null : availableColumns[0]?.name || "",
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="row_count">Cantidad de Filas</SelectItem>
                            <SelectItem value="column_value">Valor de Columna</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Selector de Columna si es column_value */}
                      {cond.type === "column_value" && (
                        <div className="w-full sm:w-52 shrink-0">
                          <Select
                            value={cond.column || ""}
                            onValueChange={(colName) => {
                              const found = availableColumns.find((c) => c.name === colName);
                              const nextType = found?.data_type || "string";
                              const nextOps = OPERATORS_BY_DATA_TYPE[nextType] || OPERATORS_BY_DATA_TYPE.string;
                              handleUpdateCondition(idx, {
                                column: colName,
                                operator: nextOps[0]?.value || "=",
                              });
                            }}
                          >
                            <SelectTrigger className="h-8 text-xs font-mono">
                              <SelectValue placeholder="Seleccionar columna..." />
                            </SelectTrigger>
                            <SelectContent className="max-h-56">
                              {availableColumns.map((col) => (
                                <SelectItem key={col.name} value={col.name} className="text-xs">
                                  <div className="flex items-center justify-between gap-2 w-full">
                                    <span className="font-mono">{col.name}</span>
                                    {col.data_type && (
                                      <span className="text-[9px] px-1 rounded bg-muted text-muted-foreground uppercase font-sans">
                                        {col.data_type}
                                      </span>
                                    )}
                                  </div>
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}

                      {/* Selector de Operador */}
                      <div className="w-full sm:w-48 shrink-0">
                        <Select
                          value={cond.operator}
                          onValueChange={(val: ReportAlertConditionOperator) =>
                            handleUpdateCondition(idx, { operator: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {operators.map((op) => (
                              <SelectItem key={op.value} value={op.value} className="text-xs">
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Input de Valor (o badge si es unario) */}
                      <div className="flex-1 w-full min-w-[120px]">
                        {isUnary ? (
                          <div className="h-8 px-2.5 flex items-center rounded-md bg-muted/40 border border-dashed border-border text-[11px] text-muted-foreground italic">
                            (No requiere valor)
                          </div>
                        ) : (
                          <Input
                            value={cond.value}
                            onChange={(e) =>
                              handleUpdateCondition(idx, { value: e.target.value })
                            }
                            placeholder={selectedOpDef?.placeholder || "Valor..."}
                            className="h-8 text-xs font-mono"
                          />
                        )}
                      </div>

                      {/* Badge con el resultado individual de la prueba */}
                      {condResult && (
                        <div className="shrink-0">
                          <Badge
                            variant="outline"
                            className={`text-[10px] px-1.5 py-0.5 gap-1 ${
                              condResult.triggered
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {condResult.triggered ? (
                              <AlertTriangle className="h-2.5 w-2.5" />
                            ) : (
                              <CheckCircle2 className="h-2.5 w-2.5" />
                            )}
                            <span>{condResult.evaluated_value}</span>
                          </Badge>
                        </div>
                      )}

                      {/* Botón eliminar condición */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCondition(idx)}
                        disabled={conditions.length <= 1}
                        title="Eliminar esta condición"
                        className="h-8 w-8 text-muted-foreground hover:text-rose-600 hover:bg-rose-500/10 shrink-0"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Banner con el resultado general del Dry-Run Test */}
            {testResult && (
              <div
                className={`p-3 rounded-lg border text-xs transition-all ${
                  testResult.triggered
                    ? "bg-rose-500/10 border-rose-500/30 text-rose-700 dark:text-rose-300"
                    : "bg-emerald-500/10 border-emerald-500/30 text-emerald-700 dark:text-emerald-300"
                }`}
              >
                <div className="flex items-center justify-between font-semibold flex-wrap gap-2">
                  <div className="flex items-center gap-2">
                    {testResult.triggered ? (
                      <AlertTriangle className="h-4 w-4 text-rose-600 shrink-0" />
                    ) : (
                      <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0" />
                    )}
                    <span>
                      {testResult.triggered
                        ? "¡Alerta Disparada! Las condiciones se cumplieron con los datos actuales."
                        : "Condición No Cumplida (Estado Normal / OK)."}
                    </span>
                  </div>
                  <Badge variant="outline" className="font-mono text-[11px] bg-background">
                    {testResult.threshold_snapshot}
                  </Badge>
                </div>
              </div>
            )}

            {/* Toggle y Visor de Regla Estándar JsonLogic (AST) */}
            <div className="pt-2 border-t border-border/40">
              <button
                type="button"
                onClick={() => setShowJsonLogicPreview(!showJsonLogicPreview)}
                className="flex items-center gap-1.5 text-[11px] font-medium text-muted-foreground hover:text-foreground transition-colors cursor-pointer"
              >
                <Code className="h-3.5 w-3.5 text-primary" />
                <span>
                  {showJsonLogicPreview
                    ? "Ocultar Regla JsonLogic Compilada"
                    : "Ver Estructura AST JsonLogic Compilada"}
                </span>
                <Badge
                  variant="outline"
                  className="text-[10px] px-1.5 py-0 h-4 border-primary/30 text-primary font-mono"
                >
                  jsonlogic.com
                </Badge>
              </button>

              {showJsonLogicPreview && (
                <div className="mt-2 space-y-1">
                  <p className="text-[10px] text-muted-foreground">
                    Árbol de sintaxis abstracta (AST) compilado para evaluación estándar tanto en cliente como en servidor:
                  </p>
                  <JsonEditor
                    value={JSON.stringify(compiledJsonLogic, null, 2)}
                    onChange={() => {}}
                    readOnly={true}
                    height="130px"
                    showMacroToolbar={false}
                  />
                </div>
              )}
            </div>
          </div>

          {/* SECCIÓN 4: FRECUENCIA Y COOLDOWN */}
          <div className="space-y-3.5 rounded-xl p-4 bg-muted/20 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px]">
                4
              </span>
              <span>Frecuencia y Anti-Spam (Cooldown)</span>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
              {/* Frecuencia */}
              <div className="space-y-1.5">
                <Label className="text-xs font-medium text-foreground">Frecuencia de Monitoreo</Label>
                <Select
                  value={cronExpression}
                  onValueChange={(val) => setCronExpression(val)}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {CRON_PRESETS.map((p) => (
                      <SelectItem key={p.value} value={p.value}>
                        {p.label} <span className="font-mono text-[10px] text-muted-foreground">({p.value})</span>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              {/* Cooldown */}
              <div className="space-y-1.5">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-medium text-foreground">Cooldown Anti-Spam</Label>
                  <span className="text-[10px] text-muted-foreground">Evita alertas duplicadas continuas</span>
                </div>
                <Select
                  value={String(cooldownMinutes)}
                  onValueChange={(val) => setCooldownMinutes(parseInt(val, 10))}
                >
                  <SelectTrigger className="h-9 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {COOLDOWN_PRESETS.map((c) => (
                      <SelectItem key={c.value} value={String(c.value)}>
                        {c.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
          </div>

          {/* SECCIÓN 5: CANALES DE NOTIFICACIÓN */}
          <div className="space-y-4 rounded-xl p-4 bg-muted/20 border border-border/60">
            <div className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-muted-foreground">
              <span className="flex h-5 w-5 items-center justify-center rounded-full bg-primary/10 text-primary text-[11px]">
                5
              </span>
              <span>Canales de Notificación</span>
            </div>

            {/* 1. Canal Correo Electrónico con Rich Text */}
            <div className="space-y-3 pt-1">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Mail className="h-4 w-4 text-blue-500" />
                  <span>Notificación por Correo Electrónico</span>
                </div>
                <Switch checked={notifyEmail} onCheckedChange={setNotifyEmail} />
              </div>

              {notifyEmail && (
                <div className="space-y-3 pl-6 border-l-2 border-blue-500/30">
                  {/* Destinatarios */}
                  <div className="space-y-1.5">
                    <Label className="text-xs font-medium text-foreground">Destinatarios *</Label>
                    <div className="flex gap-2">
                      <Input
                        value={emailInput}
                        onChange={(e) => setEmailInput(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter") {
                            e.preventDefault();
                            handleAddEmail();
                          }
                        }}
                        placeholder="correo@empresa.com"
                        className="h-8 text-xs flex-1"
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={handleAddEmail}
                        className="h-8 text-xs px-2.5 gap-1"
                      >
                        <Plus className="h-3.5 w-3.5" /> Agregar
                      </Button>
                    </div>

                    <div className="flex flex-wrap gap-1.5 pt-1">
                      {emailRecipients.map((em) => (
                        <Badge
                          key={em}
                          variant="secondary"
                          className="text-xs gap-1 pl-2.5 pr-1 py-0.5 bg-muted border border-border/70"
                        >
                          <span>{em}</span>
                          <button
                            type="button"
                            onClick={() => handleRemoveEmail(em)}
                            className="h-3.5 w-3.5 rounded-full hover:bg-muted-foreground/20 inline-flex items-center justify-center"
                          >
                            <X className="h-2.5 w-2.5" />
                          </button>
                        </Badge>
                      ))}
                    </div>
                  </div>

                  {/* Asunto */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground">
                      Asunto Personalizado (Opcional)
                    </Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder="[ALERTA] Umbral superado en reporte..."
                      className="h-8 text-xs"
                    />
                  </div>

                  {/* Editor de Texto Enriquecido para el Cuerpo del Mensaje */}
                  <div className="space-y-1.5">
                    <Label className="text-[11px] font-medium text-muted-foreground">
                      Cuerpo del Mensaje / Instrucciones de Acción (Texto Enriquecido)
                    </Label>
                    <RichTextEditor
                      value={emailMessage}
                      onChange={setEmailMessage}
                      placeholder="Redacta las indicaciones operativas, listas de verificación o notas para el equipo..."
                      minHeight="120px"
                    />
                  </div>

                  {/* Checkbox Adjunto CSV */}
                  <div className="flex items-center gap-2 pt-1">
                    <input
                      type="checkbox"
                      id="includeCsv"
                      checked={includeCsvAttachment}
                      onChange={(e) => setIncludeCsvAttachment(e.target.checked)}
                      className="rounded border-gray-300 text-primary focus:ring-primary h-4 w-4"
                    />
                    <Label htmlFor="includeCsv" className="text-xs cursor-pointer">
                      Adjuntar archivo CSV con los registros detectados en el incidente
                    </Label>
                  </div>
                </div>
              )}
            </div>

            {/* 2. Canal Telegram Bot */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Send className="h-4 w-4 text-sky-500" />
                  <span>Notificación vía Telegram Bot</span>
                </div>
                <Switch checked={notifyTelegram} onCheckedChange={setNotifyTelegram} />
              </div>

              {notifyTelegram && (
                <div className="pl-6 border-l-2 border-sky-500/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Bot Token *</Label>
                      <Input
                        value={telegramBotToken}
                        onChange={(e) => setTelegramBotToken(e.target.value)}
                        placeholder="123456:ABC-DEF1234ghIkl-zyx57W2v1u123ew11"
                        className="h-8 text-xs font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        Obtenido a través de @BotFather
                      </span>
                    </div>

                    <div className="space-y-1">
                      <Label className="text-xs font-medium text-foreground">Chat ID o Canal *</Label>
                      <Input
                        value={telegramChatId}
                        onChange={(e) => setTelegramChatId(e.target.value)}
                        placeholder="ej: -100987654321 o @canal_alertas"
                        className="h-8 text-xs font-mono"
                      />
                      <span className="text-[10px] text-muted-foreground">
                        ID del chat, grupo o supergrupo destino
                      </span>
                    </div>
                  </div>
                </div>
              )}
            </div>

            {/* 3. Canal Webhook Avanzado (Método, Headers y Payload Template) */}
            <div className="space-y-3 pt-2 border-t border-border/40">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 text-xs font-semibold text-foreground">
                  <Webhook className="h-4 w-4 text-purple-500" />
                  <span>Notificación vía Webhook (API Externa Avanzada)</span>
                </div>
                <Switch checked={notifyWebhook} onCheckedChange={setNotifyWebhook} />
              </div>

              {notifyWebhook && (
                <div className="pl-6 border-l-2 border-purple-500/30 space-y-3">
                  <div className="grid grid-cols-1 sm:grid-cols-4 gap-3">
                    <div className="sm:col-span-1 space-y-1">
                      <Label className="text-xs font-medium text-foreground">Método HTTP</Label>
                      <Select
                        value={webhookMethod}
                        onValueChange={(val: "POST" | "PUT" | "PATCH") => setWebhookMethod(val)}
                      >
                        <SelectTrigger className="h-8 text-xs font-bold font-mono">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="POST">POST</SelectItem>
                          <SelectItem value="PUT">PUT</SelectItem>
                          <SelectItem value="PATCH">PATCH</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="sm:col-span-3 space-y-1">
                      <Label className="text-xs font-medium text-foreground">Endpoint Webhook URL *</Label>
                      <Input
                        value={webhookUrl}
                        onChange={(e) => setWebhookUrl(e.target.value)}
                        placeholder="https://api.empresa.com/webhooks/incidents"
                        className="h-8 text-xs font-mono"
                      />
                    </div>
                  </div>

                  {/* Encabezados JSON */}
                  <div className="space-y-1">
                    <Label className="text-[11px] font-medium text-muted-foreground flex items-center justify-between">
                      <span>Encabezados HTTP Personalizados (JSON)</span>
                      <span className="text-[10px]">ej: {"{\"Authorization\": \"Bearer token\"}"}</span>
                    </Label>
                    <JsonEditor
                      value={webhookHeadersStr}
                      onChange={setWebhookHeadersStr}
                      height="80px"
                      placeholder='{\n  "Authorization": "Bearer ..."\n}'
                      showMacroToolbar={false}
                    />
                  </div>

                  {/* Plantilla de Payload con Macros */}
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between">
                      <Label className="text-[11px] font-medium text-muted-foreground flex items-center gap-1.5">
                        <Code className="h-3 w-3" />
                        Plantilla de Payload Personalizada (JSON con Macros)
                      </Label>
                      <span className="text-[10px] text-muted-foreground">
                        (Opcional: si se deja vacío se enviará el esquema por defecto)
                      </span>
                    </div>

                    <JsonEditor
                      value={webhookPayloadTemplate}
                      onChange={setWebhookPayloadTemplate}
                      height="160px"
                      placeholder='{\n  "event": "alerta",\n  "titulo": "{{alert_name}}",\n  "valor": "{{evaluated_value}}"\n}'
                      availableMacros={WEBHOOK_MACROS.map((m) => ({
                        key: m.label,
                        label: m.label,
                        description: m.desc,
                      }))}
                      showMacroToolbar={true}
                    />
                  </div>
                </div>
              )}
            </div>
          </div>

          <DialogFooter className="pt-2 border-t border-border/60">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => onOpenChange(false)}
              disabled={isSubmitting}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              size="sm"
              disabled={isSubmitting}
              className="text-xs gap-1.5"
            >
              {isSubmitting && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
              {isEdit ? "Guardar Cambios" : "Crear Regla de Alerta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default AlertDialogComponent;
