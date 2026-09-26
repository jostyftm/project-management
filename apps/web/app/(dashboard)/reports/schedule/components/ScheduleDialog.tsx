"use client";

import React, { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BaseIcon from "@/components/ui/base-icon";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { useListReportCategories } from "@/hooks/use-list-report-categories";
import { useListReports } from "../../hooks/use-list-reports";
import { useScheduleActions } from "../hooks/use-schedule-actions";
import {
  ReportSchedule,
  ScheduleParameter,
} from "@/types/schedule-type";
import { ReportCategory } from "@/types/report-category-type";
import { QueryExecutionResult } from "../../types/query-execute-type";
import { executeReportQueryService } from "../../services/report-service";
import { requestAllDocuments } from "@/services/document-service";
import { DocumentItem } from "@/types/document-type";
import { CategoryTreeSelect } from "../../components/wizard/CategoryTreeSelect";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import SearchableSelect from "@/components/ui/searchable-select";
import CronBuilder from "./CronBuilder";
import ScheduleParameters from "./ScheduleParameters";
import {
  Download,
  Mail,
  Server,
  FileSpreadsheet,
  FileText,
  FileCode,
  RefreshCw,
  Layout,
  CheckCheck,
  XSquare,
  Table as TableIcon,
  ChevronLeft,
  ChevronRight,
  AlertTriangle,
  Loader2,
  X,
  Sliders,
  Sparkles,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilenamePatternInput } from "@/components/common/filename-pattern/FilenamePatternInput";
import { AlertConditionItem } from "@/types/alert-types";
import { ScheduleValidationCard } from "./ScheduleValidationCard";
import { testScheduleValidationService } from "../services/schedule-service";
import { useSchema } from "@/hooks/use-schema";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  schedule?: ReportSchedule | null;
  defaultDocumentTemplateId?: number | null;
  onRefetch?: () => void;
}

const FORMAT_CARDS = [
  {
    code: "xlsx",
    label: "Excel",
    ext: ".xlsx",
    icon: FileSpreadsheet,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    code: "csv",
    label: "CSV",
    ext: ".csv",
    icon: FileSpreadsheet,
    color: "text-teal-600 bg-teal-50 border-teal-200",
  },
  {
    code: "pdf",
    label: "PDF",
    ext: ".pdf",
    icon: FileText,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  {
    code: "docx",
    label: "Word",
    ext: ".docx",
    icon: FileText,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    code: "txt",
    label: "Texto",
    ext: ".txt",
    icon: FileCode,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
];

// Helper para obtener una categoría y todos sus descendientes recursivamente
const getCategoryAndDescendantIds = (
  rootId: number,
  allCategories: ReportCategory[]
): number[] => {
  const result: number[] = [rootId];
  const queue: number[] = [rootId];
  while (queue.length > 0) {
    const currentId = queue.shift()!;
    const children = allCategories.filter(
      (c) => c.relationships?.parent_id === currentId
    );
    for (const child of children) {
      result.push(child.id);
      queue.push(child.id);
    }
  }
  return result;
};

// Resolver dinámico de macros de fecha para la consulta de vista previa
const resolveDateMacro = (val: string): string => {
  if (!val || typeof val !== "string") return val;
  const today = new Date();
  const yyyy = today.getFullYear();
  const mm = String(today.getMonth() + 1).padStart(2, "0");
  const dd = String(today.getDate()).padStart(2, "0");
  const todayStr = `${yyyy}-${mm}-${dd}`;

  if (val === "{{TODAY}}" || val === "{{NOW}}") return todayStr;
  if (val === "{{YESTERDAY}}") {
    const yest = new Date(today);
    yest.setDate(today.getDate() - 1);
    return yest.toISOString().slice(0, 10);
  }
  if (val === "{{START_OF_MONTH}}") {
    return `${yyyy}-${mm}-01`;
  }
  if (val === "{{END_OF_MONTH}}") {
    const lastDay = new Date(yyyy, today.getMonth() + 1, 0).getDate();
    return `${yyyy}-${mm}-${String(lastDay).padStart(2, "0")}`;
  }
  const match = val.match(/^\{\{DATE:([+-]?\d+)([dmy])\}\}$/i);
  if (match) {
    const amount = parseInt(match[1], 10);
    const unit = match[2].toLowerCase();
    const d = new Date(today);
    if (unit === "d") d.setDate(d.getDate() + amount);
    else if (unit === "m") d.setMonth(d.getMonth() + amount);
    else if (unit === "y") d.setFullYear(d.getFullYear() + amount);
    return d.toISOString().slice(0, 10);
  }
  return val;
};

export const ScheduleDialog = ({
  open,
  onOpenChange,
  schedule,
  defaultDocumentTemplateId,
  onRefetch,
}: Props) => {
  const formats = useCatalogStore((s) => s.formats) ?? [];
  const destinations = useCatalogStore((s) => s.destinations) ?? [];
  const fetchCatalogs = useCatalogStore((s) => s.fetchCatalogs);

  useEffect(() => {
    if (open && (!formats.length || !destinations.length)) {
      fetchCatalogs();
    }
  }, [open, formats.length, destinations.length, fetchCatalogs]);

  const { data: categories = [] } = useListReportCategories();
  const reports = useListReports({
    params: { params: { paginate: false } },
  });

  // Fila 1: Categoría seleccionada
  const [selectedCategoryId, setSelectedCategoryId] = useState<string | null>(null);

  // Fila 2: Reporte seleccionado
  const [reportId, setReportId] = useState<string>("");

  // Fila 3: Formato de salida y opciones
  const [formatId, setFormatId] = useState<string>("");
  const [documentTemplateId, setDocumentTemplateId] = useState<string>("");
  const [documentTemplates, setDocumentTemplates] = useState<DocumentItem[]>([]);
  const [includeHeaders, setIncludeHeaders] = useState<boolean>(true);
  const [delimiter, setDelimiter] = useState<string>("\t");
  const [filenamePattern, setFilenamePattern] = useState<string>("");

  // Fila 4: Frecuencia (Cron)
  const [cron, setCron] = useState<string>("");
  const [everyNWeeks, setEveryNWeeks] = useState<number | null>(null);
  const [status, setStatus] = useState<"active" | "inactive">("active");

  // Fila 5: Parámetros del reporte y Vista previa
  const [parameters, setParameters] = useState<ScheduleParameter[]>([]);
  const [previewData, setPreviewData] = useState<QueryExecutionResult | null>(null);
  const [previewColumns, setPreviewColumns] = useState<
    { key: string; label: string }[]
  >([]);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const previewPageSize = 5;

  // Fila 6: Pestañas de método de entrega / destinatarios
  const [deliveryMethod, setDeliveryMethod] = useState<
    "download" | "email" | "ftp"
  >("download");
  const [emailRecipients, setEmailRecipients] = useState<string[]>([]);
  const [emailInputDraft, setEmailInputDraft] = useState<string>("");
  const [emailSubject, setEmailSubject] = useState<string>("");
  const [emailBody, setEmailBody] = useState<string>("");
  const [ftpConfig, setFtpConfig] = useState<Record<string, unknown>>({
    host: "",
    port: 21,
    username: "",
    password: "",
    path: "/",
  });

interface ScheduleValidationTestResult {
  success: boolean;
  passed?: boolean;
  evaluated_value?: string;
  threshold_snapshot?: string;
  total_rows?: number;
  columns?: string[];
  execution_time_ms?: number;
  sample_data?: Record<string, unknown>[];
  reason?: string;
  condition_results?: Array<{
    type: string;
    column?: string;
    operator: string;
    target: string;
    evaluated_value: string;
    passed: boolean;
    snapshot: string;
  }>;
  error?: string;
}

  // Fila 7: Validación previa al envío
  const [validationEnabled, setValidationEnabled] = useState<boolean>(false);
  const [validationSource, setValidationSource] = useState<"report_data" | "custom_query">("report_data");
  const [validationQuery, setValidationQuery] = useState<string>("");
  const [validationRules, setValidationRules] = useState<AlertConditionItem[]>([
    {
      id: "1",
      type: "row_count",
      column: "",
      operator: ">",
      value: "0",
      logic_operator: "AND",
    },
  ]);
  const [isTestingValidation, setIsTestingValidation] = useState<boolean>(false);
  const [validationTestResult, setValidationTestResult] = useState<ScheduleValidationTestResult | null>(null);

  // Fila 8: Notificación Webhook (mejora 5.1)
  const [webhookEnabled, setWebhookEnabled] = useState<boolean>(false);
  const [webhookUrl, setWebhookUrl] = useState<string>("");

  const isEdit = Boolean(schedule?.id);
  const scheduleId = schedule?.id;

  const { createSchedule, editSchedule, isLoading } = useScheduleActions({
    scheduleId,
    refetch: onRefetch,
  });

  // Reportes filtrados por la categoría seleccionada (y subcategorías) y ORDENADOS ALFABÉTICAMENTE
  const filteredReports = useMemo(() => {
    const allReports = reports.data ?? [];
    let list = allReports;

    if (selectedCategoryId) {
      const targetId = Number(selectedCategoryId);
      const allowedIds = getCategoryAndDescendantIds(targetId, categories);
      list = allReports.filter((r) => {
        const catId = r.attributes.report_category_id;
        return catId !== null && catId !== undefined && allowedIds.includes(catId);
      });
    }

    // Orden alfabético por nombre
    return [...list].sort((a, b) =>
      a.attributes.name.localeCompare(b.attributes.name, "es", {
        sensitivity: "base",
      })
    );
  }, [selectedCategoryId, reports.data, categories]);

  const selectedReport = useMemo(() => {
    return (reports.data ?? []).find((r) => String(r.id) === reportId);
  }, [reports.data, reportId]);

  const selectedConnectionId =
    selectedReport?.relationships.connection_id ??
    selectedReport?.relationships.connection?.id ??
    null;

  const connectionDriver =
    selectedReport?.relationships.connection?.relationships.driver?.laravel_driver ??
    "pgsql";

  const connectionName =
    selectedReport?.relationships.connection?.attributes.name ?? undefined;

  const { schema: connectionSchema } = useSchema(selectedConnectionId);

  const testResultColumns = validationTestResult?.columns;
  const validationColumns = useMemo(() => {
    if (
      validationSource === "custom_query" &&
      testResultColumns &&
      testResultColumns.length > 0
    ) {
      return testResultColumns.map((col) => ({
        key: col,
        label: col,
        data_type: "string",
      }));
    }
    return previewColumns;
  }, [validationSource, testResultColumns, previewColumns]);

  const selectedFormat = useMemo(() => {
    return (formats || []).find((f) => String(f.id) === formatId);
  }, [formats, formatId]);

  const reportParameters = useMemo(() => {
    return (selectedReport?.relationships.parameters ?? [])
      .map((p) => {
        const pAttr = p?.attributes;
        const pLegacy = p as unknown as {
          param_name?: string;
          data_type?: string;
          display_label?: string;
          input_type?: string;
          options_source?: "query" | "static" | null;
          static_options?: Array<{ value: string | number; label: string }> | null;
          source_query?: string | null;
          default_value?: string | null;
        };
        return {
          id: p.id,
          param_name: String(pAttr?.param_name ?? pLegacy?.param_name ?? ""),
          data_type: String(pAttr?.data_type ?? pLegacy?.data_type ?? "string"),
          display_label: pAttr?.display_label ?? pLegacy?.display_label ?? pAttr?.param_name,
          input_type: pAttr?.input_type ?? pLegacy?.input_type,
          options_source: pAttr?.options_source ?? pLegacy?.options_source,
          static_options: pAttr?.static_options ?? pLegacy?.static_options,
          source_query: pAttr?.source_query ?? pLegacy?.source_query,
          default_value: pAttr?.default_value ?? pLegacy?.default_value,
        };
      })
      .filter((p) => Boolean(p.param_name));
  }, [selectedReport]);

  // Cargar plantillas de documentos al abrir el diálogo
  useEffect(() => {
    if (!open) return;
    requestAllDocuments({ params: { paginate: false } })
      .then((res) => setDocumentTemplates(res.data || []))
      .catch(() => {});
  }, [open]);

  /* eslint-disable react-hooks/set-state-in-effect */
  // Inicializar o resetear valores al abrir o cambiar de programación seleccionada
  useEffect(() => {
    if (!open) return;

    if (schedule) {
      const repId = String(schedule.attributes.report_id);
      setReportId(repId);
      setFormatId(String(schedule.attributes.file_format_id));
      setDocumentTemplateId(
        schedule.attributes.document_template_id
          ? String(schedule.attributes.document_template_id)
          : "none"
      );
      setCron(schedule.attributes.cron_expression);
      setEveryNWeeks(schedule.attributes.every_n_weeks ?? null);
      setStatus(schedule.attributes.status);
      setIncludeHeaders(schedule.attributes.include_headers ?? true);
      setDelimiter(schedule.attributes.delimiter ?? "\t");
      setFilenamePattern(schedule.attributes.filename_pattern || "");

      setParameters(
        (schedule.relationships.parameters ?? []).map((p, idx) => ({
          id: p.id ?? idx,
          param_name: p.param_name,
          param_value: p.param_value,
        }))
      );

      // Detectar categoría del reporte asignado
      const matchedReport = (reports.data ?? []).find(
        (r) => String(r.id) === repId
      );
      const catId =
        matchedReport?.attributes?.report_category_id ??
        schedule.relationships?.report?.attributes?.report_category_id;
      if (catId) {
        setSelectedCategoryId(String(catId));
      }

      // Configurar validación previa
      setValidationEnabled(schedule.attributes.validation_enabled ?? false);
      setValidationSource(schedule.attributes.validation_source ?? "report_data");
      setValidationQuery(schedule.attributes.validation_query ?? "");
      if (schedule.attributes.validation_rules && schedule.attributes.validation_rules.length > 0) {
        setValidationRules(schedule.attributes.validation_rules);
      } else {
        setValidationRules([
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
      setValidationTestResult(null);

      // Configurar webhook
      setWebhookEnabled(schedule.attributes.webhook_enabled ?? false);
      setWebhookUrl(schedule.attributes.webhook_url ?? "");

      // Configurar destinos
      const dests = schedule.relationships.destinations ?? [];
      const emailDest = dests.find(
        (d) => d.type === "email" || d.destination_type_id === 2
      );
      const ftpDest = dests.find(
        (d) => d.type === "ftp" || d.destination_type_id === 1
      );

      if (emailDest) {
        setDeliveryMethod("email");
        const to = emailDest.config?.to;
        setEmailRecipients(Array.isArray(to) ? (to as string[]) : []);
        setEmailSubject((emailDest.config?.subject as string) || "");
        setEmailBody((emailDest.config?.body as string) || "");
      } else if (ftpDest) {
        setDeliveryMethod("ftp");
        setFtpConfig(ftpDest.config || {});
      } else {
        setDeliveryMethod("download");
      }
    } else {
      setSelectedCategoryId(null);
      setReportId("");
      setFormatId("");
      setDocumentTemplateId(
        defaultDocumentTemplateId ? String(defaultDocumentTemplateId) : "none"
      );
      setCron("");
      setEveryNWeeks(null);
      setStatus("active");
      setIncludeHeaders(true);
      setDelimiter("\t");
      setFilenamePattern("");
      setParameters([]);
      setPreviewData(null);
      setPreviewColumns([]);
      setSelectedColumns([]);
      setDeliveryMethod("download");
      setEmailRecipients([]);
      setEmailInputDraft("");
      setEmailSubject("");
      setEmailBody("");
      setFtpConfig({
        host: "",
        port: 21,
        username: "",
        password: "",
        path: "/",
      });
      setValidationEnabled(false);
      setValidationSource("report_data");
      setValidationQuery("");
      setValidationRules([
        {
          id: "1",
          type: "row_count",
          column: "",
          operator: ">",
          value: "0",
          logic_operator: "AND",
        },
      ]);
      setValidationTestResult(null);
      setWebhookEnabled(false);
      setWebhookUrl("");
    }
  }, [open, schedule, defaultDocumentTemplateId, reports.data]);

  // Si se abre en edición y aún no se había detectado la categoría porque cargaron después los reportes
  useEffect(() => {
    if (schedule && reportId && !selectedCategoryId && (reports.data ?? []).length > 0) {
      const rep = (reports.data ?? []).find((r) => String(r.id) === reportId);
      if (rep?.attributes?.report_category_id) {
        setSelectedCategoryId(String(rep.attributes.report_category_id));
      }
    }
  }, [schedule, reportId, selectedCategoryId, reports.data]);
  /* eslint-enable react-hooks/set-state-in-effect */

  // Manejo de cambio de categoría
  const handleCategoryChange = (newCatId: string | null) => {
    setSelectedCategoryId(newCatId);
    if (newCatId) {
      const targetId = Number(newCatId);
      const allowedIds = getCategoryAndDescendantIds(targetId, categories);
      const currentReport = (reports.data ?? []).find(
        (r) => String(r.id) === reportId
      );
      if (
        currentReport &&
        (!currentReport.attributes.report_category_id ||
          !allowedIds.includes(currentReport.attributes.report_category_id))
      ) {
        setReportId("");
        setParameters([]);
        setPreviewData(null);
        setPreviewColumns([]);
        setSelectedColumns([]);
      }
    }
  };

  // Manejo de cambio de reporte
  const handleReportChange = (newReportId: string) => {
    setReportId(newReportId);
    setPreviewData(null);
    setPreviewColumns([]);
    setSelectedColumns([]);

    const rep = (reports.data ?? []).find((r) => String(r.id) === newReportId);
    if (rep) {
      if (!selectedCategoryId && rep.attributes.report_category_id) {
        setSelectedCategoryId(String(rep.attributes.report_category_id));
      }
      if (!schedule && rep.attributes.filename_pattern && !filenamePattern) {
        setFilenamePattern(rep.attributes.filename_pattern);
      }

      // Inicializar parámetros con valores por defecto o macros
      const repParams = rep.relationships.parameters ?? [];
      const initialParams: ScheduleParameter[] = repParams.map((p, idx) => {
        const name = String(p?.attributes?.param_name ?? "");
        const defVal = p?.attributes?.default_value;
        const dataType = String(p?.attributes?.data_type ?? "").toLowerCase();
        const inputType = String(p?.attributes?.input_type ?? "").toLowerCase();
        const isBool = inputType === "boolean" || dataType.includes("bool");

        let val = "";
        if (defVal !== undefined && defVal !== null && String(defVal).trim() !== "") {
          val = String(defVal);
        } else if (isBool) {
          val = "true";
        }

        return {
          id: idx,
          param_name: name,
          param_value: val,
        };
      });
      setParameters(initialParams);
    } else {
      setParameters([]);
    }
  };

  // Ejecución de la consulta para vista previa de datos
  const handleFetchPreview = async () => {
    if (!selectedReport) {
      toast.warning("Selecciona un reporte primero para ver la vista previa.");
      return;
    }
    setIsLoadingPreview(true);
    setPreviewError(null);

    try {
      const resolvedValues: Record<string, unknown> = {};
      parameters.forEach((p) => {
        resolvedValues[p.param_name] = resolveDateMacro(p.param_value);
      });

      const res = await executeReportQueryService({
        database_connection_id: selectedReport.relationships.connection_id,
        sql_query: selectedReport.attributes.sql_query,
        values: resolvedValues,
        limit: 50,
      });

      const data = res?.data;
      if (data) {
        setPreviewData(data);
        const headersKeyed = new Map(
          (selectedReport.relationships.headers ?? []).map((h) => [
            h.attributes.original_column,
            h.attributes.display_name,
          ])
        );
        const cols = (data.columns ?? []).map((key) => ({
          key,
          label: headersKeyed.get(key) || key,
        }));
        setPreviewColumns(cols);

        // Seleccionar todas las columnas si aún no hay seleccionadas
        if (selectedColumns.length === 0) {
          setSelectedColumns(cols.map((c) => c.key));
        }
        setPreviewPage(1);
      }
    } catch (err: unknown) {
      const errorObj = err as {
        response?: { data?: { message?: string } };
        message?: string;
      };
      setPreviewError(
        errorObj?.response?.data?.message ||
          errorObj?.message ||
          "No fue posible cargar la vista previa de datos."
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  const handleToggleColumn = (colKey: string) => {
    setSelectedColumns((prev) =>
      prev.includes(colKey) ? prev.filter((k) => k !== colKey) : [...prev, colKey]
    );
  };

  const handleSelectAllColumns = () => {
    setSelectedColumns(previewColumns.map((c) => c.key));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  // Manejo de emails múltiples
  const handleAddEmail = (raw: string) => {
    const parsed = raw
      .split(/[\n,;]+/)
      .map((e) => e.trim())
      .filter((e) => e.length > 0 && e.includes("@"));
    if (parsed.length === 0) return;
    setEmailRecipients((prev) => [...new Set([...prev, ...parsed])]);
    setEmailInputDraft("");
  };

  const handleRemoveEmail = (email: string) => {
    setEmailRecipients((prev) => prev.filter((e) => e !== email));
  };

  const handleTestValidation = async () => {
    if (!reportId) {
      toast.warning("Selecciona un reporte primero.");
      return;
    }
    if (validationSource === "custom_query" && !validationQuery.trim()) {
      toast.warning("Por favor ingresa la consulta SQL de validación.");
      return;
    }

    setIsTestingValidation(true);
    setValidationTestResult(null);

    try {
      const resolvedValues: Record<string, unknown> = {};
      parameters.forEach((p) => {
        resolvedValues[p.param_name] = resolveDateMacro(p.param_value);
      });

      const res = await testScheduleValidationService({
        report_id: Number(reportId),
        parameters: resolvedValues,
        validation_source: validationSource,
        validation_query: validationQuery,
        validation_rules: validationRules,
      });

      const data = res?.data;
      setValidationTestResult(data);
      if (data?.passed) {
        toast.success("Validación previa superada: El reporte se generaría y enviaría.");
      } else {
        toast.warning("Validación previa no cumplida: El envío se omitiría.");
      }
    } catch (err: unknown) {
      const errorObj = err as { response?: { data?: { message?: string } }; message?: string };
      const msg = errorObj?.response?.data?.message || errorObj?.message || "Error al probar validación";
      setValidationTestResult({
        success: false,
        passed: false,
        error: msg,
      });
      toast.error(msg);
    } finally {
      setIsTestingValidation(false);
    }
  };

  // Envío del formulario
  const handleSubmit = () => {
    if (!reportId) {
      toast.warning("Por favor selecciona un reporte.");
      return;
    }
    if (!formatId) {
      toast.warning("Por favor selecciona el formato de salida.");
      return;
    }
    if (!cron) {
      toast.warning("Por favor configura la frecuencia de la programación (expresión cron).");
      return;
    }

    const localType = (destinations || []).find((d) => d?.attributes?.code === "local") || { id: 3 };
    const emailType = (destinations || []).find((d) => d?.attributes?.code === "email") || { id: 2 };
    const ftpType = (destinations || []).find((d) => d?.attributes?.code === "ftp") || { id: 1 };

    let destinationsPayload: { destination_type_id: number; config: Record<string, unknown> }[] = [];

    if (deliveryMethod === "download") {
      destinationsPayload = [
        {
          destination_type_id: Number(localType.id),
          config: {},
        },
      ];
    } else if (deliveryMethod === "email") {
      if (emailRecipients.length === 0) {
        toast.warning("Debes agregar al menos un correo destinatario en la pestaña de Envío por correo.");
        return;
      }
      destinationsPayload = [
        {
          destination_type_id: Number(emailType.id),
          config: {
            to: emailRecipients,
            subject:
              emailSubject.trim() ||
              `Reporte programado: ${selectedReport?.attributes.name || "Descarga"}`,
            body: emailBody || "",
          },
        },
      ];
    } else if (deliveryMethod === "ftp") {
      if (!ftpConfig.host || !ftpConfig.username) {
        toast.warning("Por favor completa el Host y Usuario del servidor FTP.");
        return;
      }
      destinationsPayload = [
        {
          destination_type_id: Number(ftpType.id),
          config: ftpConfig,
        },
      ];
    }

    const payload = {
      report_id: Number(reportId),
      file_format_id: Number(formatId),
      document_template_id:
        documentTemplateId && documentTemplateId !== "none"
          ? Number(documentTemplateId)
          : null,
      cron_expression: cron,
      status,
      include_headers: includeHeaders,
      delimiter: selectedFormat?.attributes.code === "txt" ? delimiter : undefined,
      every_n_weeks: everyNWeeks,
      filename_pattern: filenamePattern || null,
      validation_enabled: validationEnabled,
      validation_source: validationEnabled ? validationSource : "report_data",
      validation_query: validationEnabled && validationSource === "custom_query" ? validationQuery : null,
      validation_rules: validationEnabled ? validationRules : null,
      webhook_enabled: webhookEnabled,
      webhook_url: webhookEnabled ? (webhookUrl || null) : null,
      parameters: parameters.map((p) => ({
        param_name: p.param_name,
        param_value: p.param_value,
      })),
      destinations: destinationsPayload,
    };

    if (isEdit) {
      editSchedule.mutate(payload);
    } else {
      createSchedule.mutate(payload);
    }
    onOpenChange(false);
  };

  // Columnas visibles y filas paginadas de la vista previa
  const visibleColumns = previewColumns.filter((c) =>
    selectedColumns.includes(c.key)
  );
  const totalRows = previewData?.rows?.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / previewPageSize));
  const displayedRows = (previewData?.rows ?? []).slice(
    (previewPage - 1) * previewPageSize,
    previewPage * previewPageSize
  );

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="flex flex-col w-[95vw] sm:max-w-4xl max-h-[90vh] overflow-hidden">
        <DialogHeader className="pb-3 border-b">
          <div className="flex items-center gap-2 text-primary text-xs font-semibold uppercase tracking-wider">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Automatización de Reportes</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {isEdit ? "Editar programación" : "Nueva programación"}
          </DialogTitle>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto overflow-x-hidden pr-2 space-y-6 pt-2">
          {/* FILA 1: CATEGORÍA DE REPORTE (Fila completa con Tree Component) */}
          <div className="grid gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Categoría del Reporte *
              </Label>
              <span className="text-[11px] text-muted-foreground">
                Selecciona para filtrar los reportes asociados
              </span>
            </div>
            <CategoryTreeSelect
              categories={categories}
              value={selectedCategoryId}
              onChange={handleCategoryChange}
              placeholder="Buscar y seleccionar categoría en el árbol..."
            />
          </div>

          {/* FILA 2: REPORTE FILTRADO (Fila completa, ordenado alfabéticamente) */}
          <div className="grid gap-1.5 w-full">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Reporte *
              </Label>
              <Badge variant="outline" className="text-[11px] text-slate-500 font-normal">
                {filteredReports.length === 1
                  ? "1 reporte disponible"
                  : `${filteredReports.length} reportes disponibles (ordenados A-Z)`}
              </Badge>
            </div>
            <SearchableSelect
              options={filteredReports.map((r) => ({
                value: String(r.id),
                label: r.attributes.name,
                sublabel: r.attributes.description || undefined,
              }))}
              value={reportId}
              onChange={handleReportChange}
              placeholder="Buscar y seleccionar un reporte..."
              searchPlaceholder="Escribe el nombre del reporte para buscar..."
              emptyText="No se encontraron reportes en esta categoría."
              className="w-full"
            />
            {selectedReport?.attributes.description && (
              <p className="text-[11px] text-muted-foreground italic">
                {selectedReport.attributes.description}
              </p>
            )}
          </div>

          {/* FILA 3: FORMATO DE SALIDA (Tarjetas clickeables) */}
          <div className="space-y-3">
            <div className="flex items-center justify-between">
              <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                Formato de Salida *
              </Label>
              {selectedFormat && (
                <span className="text-[11px] text-primary font-medium">
                  Seleccionado: {selectedFormat.attributes.name}
                </span>
              )}
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-5 gap-2.5">
              {FORMAT_CARDS.map((card) => {
                const IconComp = card.icon;
                const isSelected = selectedFormat?.attributes.code === card.code;
                const matchingCatFormat = (formats || []).find(
                  (f) => f?.attributes?.code === card.code
                );

                return (
                  <button
                    type="button"
                    key={card.code}
                    onClick={() => {
                      if (matchingCatFormat) {
                        setFormatId(String(matchingCatFormat.id));
                      }
                    }}
                    className={cn(
                      "flex flex-col items-center justify-center p-3 rounded-xl border-2 transition-all cursor-pointer select-none",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-xs ring-2 ring-primary/30"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div className={cn("p-2 rounded-lg mb-1.5 border", card.color)}>
                      <IconComp className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {card.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {card.ext}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Opciones condicionales para Formato */}
            <div className="flex flex-wrap items-center justify-between gap-4 pt-1">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="sched-headers"
                  checked={includeHeaders}
                  onCheckedChange={(checked) => setIncludeHeaders(!!checked)}
                />
                <Label
                  htmlFor="sched-headers"
                  className="text-xs font-medium text-slate-700 cursor-pointer"
                >
                  Incluir encabezados en el archivo generado
                </Label>
              </div>

              {selectedFormat?.attributes.code === "txt" && (
                <div className="flex items-center gap-2">
                  <Label className="text-xs text-slate-600">Separador de columnas:</Label>
                  <Select value={delimiter} onValueChange={setDelimiter}>
                    <SelectTrigger className="w-36 h-8 text-xs bg-white">
                      <SelectValue placeholder="Separador" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value={"\t"}>Tabulador (\t)</SelectItem>
                      <SelectItem value="|">Pipe (|)</SelectItem>
                      <SelectItem value=",">Coma (,)</SelectItem>
                      <SelectItem value=";">Punto y coma (;)</SelectItem>
                      <SelectItem value=" ">Espacio</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>

            {/* Plantilla corporativa Doc Studio para PDF o Word */}
            {(selectedFormat?.attributes.code === "pdf" ||
              selectedFormat?.attributes.code === "docx") && (
              <div className="grid gap-1.5 border p-3 rounded-lg bg-slate-50/80">
                <div className="flex items-center justify-between">
                  <Label className="font-semibold text-xs text-slate-800 flex items-center gap-1.5">
                    <Layout className="w-3.5 h-3.5 text-primary" />
                    <span>Plantilla de diseño corporativo (Doc Studio)</span>
                  </Label>
                  <span className="text-[11px] text-muted-foreground">Opcional</span>
                </div>
                <Select
                  value={documentTemplateId}
                  onValueChange={setDocumentTemplateId}
                >
                  <SelectTrigger className="w-full bg-white h-8 text-xs">
                    <SelectValue placeholder="Selecciona una plantilla o déjalo en blanco para formato estándar" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none" className="text-xs">
                      Ninguna (Exportación tabular estándar)
                    </SelectItem>
                    {documentTemplates.map((d) => (
                      <SelectItem key={d.id} value={String(d.id)} className="text-xs">
                        {d.attributes.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Nombre personalizado del archivo de salida */}
            <div className="border p-3.5 rounded-lg bg-slate-50/70">
              <FilenamePatternInput
                value={filenamePattern}
                onChange={setFilenamePattern}
                reportName={selectedReport?.attributes.name || "reporte"}
                format={selectedFormat?.attributes.code || "xlsx"}
                label="Nombre del archivo generado"
                placeholder="{report_name}_{YYYY}{MM}{DD}_{HH}{mm}{ss}"
                helperText="Define el nombre que tendrá el archivo generado en cada ejecución programada."
              />
            </div>
          </div>

          {/* FILA 4: FRECUENCIA CRON (Intacto) */}
          <div className="grid gap-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Frecuencia (Cron) *
            </Label>
            <CronBuilder
              value={cron}
              onChange={setCron}
              everyNWeeks={everyNWeeks}
              onEveryNWeeksChange={setEveryNWeeks}
            />
          </div>

          {/* FILA 5: PARÁMETROS Y VISTA PREVIA INTERACTIVA */}
          <div className="space-y-4">
            <div className="flex items-center justify-between border-b pb-2">
              <div className="flex items-center gap-2">
                <Sliders className="w-4 h-4 text-primary" />
                <Label className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Parámetros del Reporte
                </Label>
                {reportParameters.length > 0 && (
                  <Badge variant="secondary" className="text-[10px]">
                    {reportParameters.length} detectados
                  </Badge>
                )}
              </div>

              {selectedReport && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={handleFetchPreview}
                  disabled={isLoadingPreview}
                  className="h-7 text-xs gap-1.5 cursor-pointer bg-white"
                >
                  <RefreshCw
                    className={cn(
                      "w-3.5 h-3.5 text-slate-600",
                      isLoadingPreview && "animate-spin"
                    )}
                  />
                  <span>Actualizar vista previa</span>
                </Button>
              )}
            </div>

            {/* Formulario de parámetros */}
            {selectedReport ? (
              <ScheduleParameters
                reportId={reportId}
                parameters={reportParameters}
                value={parameters}
                onChange={setParameters}
              />
            ) : (
              <p className="text-xs text-muted-foreground italic py-2">
                Selecciona un reporte para configurar sus parámetros.
              </p>
            )}

            {/* Visor de datos y columnas de muestra */}
            {selectedReport && (
              <div className="space-y-3 p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs w-full max-w-full min-w-0 overflow-hidden">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
                  <div className="flex items-center gap-2">
                    <TableIcon className="w-4 h-4 text-primary" />
                    <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                      Selección de Columnas y Muestra
                    </h4>
                    {previewData && (
                      <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                        {selectedColumns.length} de {previewColumns.length} columnas
                      </span>
                    )}
                  </div>

                  <div className="flex items-center gap-2">
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleSelectAllColumns}
                      disabled={isLoadingPreview || !previewData}
                      className="h-7 text-xs gap-1 cursor-pointer text-primary hover:text-primary hover:bg-primary/5"
                    >
                      <CheckCheck className="w-3.5 h-3.5" />
                      <span>Todas</span>
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={handleDeselectAllColumns}
                      disabled={isLoadingPreview || !previewData}
                      className="h-7 text-xs gap-1 cursor-pointer text-slate-600 hover:text-slate-800 hover:bg-slate-100"
                    >
                      <XSquare className="w-3.5 h-3.5" />
                      <span>Ninguna</span>
                    </Button>
                  </div>
                </div>

                {/* Error de vista previa */}
                {previewError && (
                  <div className="p-3 text-xs rounded-lg bg-rose-50 border border-rose-200 text-rose-700 flex items-start gap-2">
                    <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Error en vista previa: </span>
                      {previewError}
                    </div>
                  </div>
                )}

                {/* Badges de columnas */}
                {isLoadingPreview ? (
                  <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                    <Loader2 className="w-5 h-5 animate-spin text-primary" />
                    <span className="text-xs">Cargando columnas y muestra de datos...</span>
                  </div>
                ) : previewData ? (
                  <div className="space-y-3">
                    <div className="flex flex-wrap gap-2 max-h-32 overflow-y-auto p-1">
                      {previewColumns.map((col) => {
                        const isChecked = selectedColumns.includes(col.key);
                        return (
                          <label
                            key={col.key}
                            className={cn(
                              "inline-flex items-center gap-2 px-2.5 py-1 rounded-lg border text-xs cursor-pointer transition-all select-none",
                              isChecked
                                ? "bg-primary/10 border-primary/40 text-primary font-medium shadow-xs"
                                : "bg-slate-50 border-slate-200 text-slate-600 hover:bg-slate-100 opacity-70"
                            )}
                          >
                            <Checkbox
                              checked={isChecked}
                              onCheckedChange={() => handleToggleColumn(col.key)}
                              className="size-3.5"
                            />
                            <span className="truncate max-w-[150px]">{col.label}</span>
                          </label>
                        );
                      })}
                    </div>

                    {/* Tabla de muestra con scroll X exclusivo */}
                    <div className="rounded-lg border border-slate-200 bg-white w-full max-w-full min-w-0 overflow-hidden">
                      <div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-auto max-h-56">
                        <table className="w-full min-w-max text-xs text-left border-collapse table-auto">
                          <thead className="bg-slate-100 text-slate-700 font-semibold border-b border-slate-200 sticky top-0 z-10">
                            <tr>
                              {visibleColumns.map((col) => (
                                <th
                                  key={col.key}
                                  className="px-3.5 py-2.5 whitespace-nowrap min-w-[130px] max-w-[280px] text-slate-800 border-r border-slate-200 last:border-r-0"
                                >
                                  {col.label}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody>
                            {visibleColumns.length === 0 ? (
                              <tr>
                                <td className="px-4 py-6 text-center text-slate-500 italic">
                                  No has seleccionado ninguna columna para mostrar.
                                </td>
                              </tr>
                            ) : displayedRows.length === 0 ? (
                              <tr>
                                <td
                                  colSpan={visibleColumns.length}
                                  className="px-4 py-6 text-center text-slate-500 italic"
                                >
                                  La consulta no devolvió registros de muestra.
                                </td>
                              </tr>
                            ) : (
                              displayedRows.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className={cn(
                                    "border-b border-slate-100 hover:bg-slate-50/80 transition-colors",
                                    rIdx % 2 === 1 ? "bg-slate-50/40" : "bg-white"
                                  )}
                                >
                                  {visibleColumns.map((col) => (
                                    <td
                                      key={col.key}
                                      className="px-3.5 py-2 whitespace-nowrap min-w-[130px] max-w-[280px] truncate text-slate-600 border-r border-slate-100 last:border-r-0"
                                    >
                                      {row[col.key] !== null && row[col.key] !== undefined
                                        ? String(row[col.key])
                                        : "-"}
                                    </td>
                                  ))}
                                </tr>
                              ))
                            )}
                          </tbody>
                        </table>
                      </div>

                      {/* Paginador de la muestra */}
                      {totalRows > 0 && (
                        <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                          <span>
                            Mostrando {(previewPage - 1) * previewPageSize + 1} -{" "}
                            {Math.min(previewPage * previewPageSize, totalRows)} de{" "}
                            {totalRows} registros ({previewData.execution_time_ms} ms)
                          </span>
                          <div className="flex items-center gap-1.5">
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() => setPreviewPage((p) => Math.max(1, p - 1))}
                              disabled={previewPage <= 1}
                              className="h-7 w-7 cursor-pointer"
                            >
                              <ChevronLeft className="w-3.5 h-3.5" />
                            </Button>
                            <span className="px-2 font-medium">
                              {previewPage} / {totalPages}
                            </span>
                            <Button
                              type="button"
                              variant="outline"
                              size="icon"
                              onClick={() =>
                                setPreviewPage((p) => Math.min(totalPages, p + 1))
                              }
                              disabled={previewPage >= totalPages}
                              className="h-7 w-7 cursor-pointer"
                            >
                              <ChevronRight className="w-3.5 h-3.5" />
                            </Button>
                          </div>
                        </div>
                      )}
                    </div>
                  </div>
                ) : (
                  <div className="py-5 text-center text-xs text-slate-500">
                    Presiona &quot;Actualizar vista previa&quot; para previsualizar los datos con los parámetros configurados.
                  </div>
                )}

                {/* Advertencia para Word (.docx) */}
                {selectedFormat?.attributes.code === "docx" && selectedColumns.length > 8 && (
                  <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                    <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                    <div>
                      <span className="font-semibold">Recomendación para Word (.docx): </span>
                      Has seleccionado {selectedColumns.length} columnas. Tablas con más de 8 columnas pueden verse muy ajustadas en documentos Word. Te recomendamos seleccionar solo las columnas indispensables o exportar en <strong>Excel (.xlsx)</strong>.
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>

          {/* FILA 6: VALIDACIÓN PREVIA AL ENVÍO */}
          <ScheduleValidationCard
            validationEnabled={validationEnabled}
            setValidationEnabled={setValidationEnabled}
            validationSource={validationSource}
            setValidationSource={setValidationSource}
            validationQuery={validationQuery}
            setValidationQuery={setValidationQuery}
            validationRules={validationRules}
            setValidationRules={setValidationRules}
            availableColumns={validationColumns}
            onTestValidation={handleTestValidation}
            isTesting={isTestingValidation}
            testResult={validationTestResult}
            disabled={!reportId}
            dialect={connectionDriver}
            tables={connectionSchema?.tables ?? []}
            connectionName={connectionName}
          />

          {/* FILA 7: DESTINATARIO / MÉTODO DE ENTREGA (Tabs) */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Método de Entrega / Destinatario *
            </Label>

            <Tabs
              value={deliveryMethod}
              onValueChange={(val) =>
                setDeliveryMethod(val as "download" | "email" | "ftp")
              }
              className="w-full"
            >
              <TabsList className="grid grid-cols-3 w-full sm:w-[480px]">
                <TabsTrigger value="download" className="gap-1.5 text-xs">
                  <Download className="w-3.5 h-3.5 text-emerald-600" />
                  <span>Descarga directa</span>
                </TabsTrigger>
                <TabsTrigger value="email" className="gap-1.5 text-xs">
                  <Mail className="w-3.5 h-3.5 text-purple-600" />
                  <span>Envío por correo</span>
                </TabsTrigger>
                <TabsTrigger value="ftp" className="gap-1.5 text-xs">
                  <Server className="w-3.5 h-3.5 text-blue-600" />
                  <span>Servidor FTP</span>
                </TabsTrigger>
              </TabsList>

              {/* Contenido: Descarga directa */}
              <TabsContent value="download" className="pt-2">
                <div className="rounded-xl border border-emerald-200 bg-emerald-50/50 p-4 space-y-2">
                  <div className="flex items-center gap-2">
                    <div className="p-2 rounded-lg bg-emerald-100 text-emerald-700">
                      <Download className="w-5 h-5" />
                    </div>
                    <div>
                      <h4 className="text-xs font-bold text-emerald-900">
                        Almacenamiento automático y descarga directa
                      </h4>
                      <p className="text-[11px] text-emerald-800/80">
                        El archivo se generará periódicamente y quedará disponible para descarga en el sistema.
                      </p>
                    </div>
                  </div>
                  <p className="text-xs text-slate-600 pl-11">
                    Cada vez que se ejecute la programación según la frecuencia establecida, el reporte será procesado y depositado en el almacenamiento central. Podrás consultar y descargar el archivo directamente desde el módulo de <strong>Descargas</strong> o el historial de ejecuciones.
                  </p>
                </div>
              </TabsContent>

              {/* Contenido: Envío por correo */}
              <TabsContent value="email" className="space-y-4 pt-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-4">
                  {/* Destinatarios */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Destinatarios *
                    </Label>
                    <div className="flex gap-2">
                      <Input
                        value={emailInputDraft}
                        onChange={(e) => setEmailInputDraft(e.target.value)}
                        onKeyDown={(e) => {
                          if (e.key === "Enter" || e.key === ",") {
                            e.preventDefault();
                            handleAddEmail(emailInputDraft);
                          }
                        }}
                        onBlur={() => emailInputDraft && handleAddEmail(emailInputDraft)}
                        placeholder="Escribe un correo y presiona Enter o coma..."
                        className="text-xs h-9 font-mono"
                      />
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddEmail(emailInputDraft)}
                        className="h-9 text-xs cursor-pointer"
                      >
                        Agregar
                      </Button>
                    </div>
                    <p className="text-[11px] text-muted-foreground">
                      Puedes agregar múltiples destinatarios separándolos por Enter o coma.
                    </p>

                    {emailRecipients.length > 0 && (
                      <div className="flex flex-wrap gap-1.5 pt-1">
                        {emailRecipients.map((em) => (
                          <Badge
                            key={em}
                            variant="secondary"
                            className="gap-1.5 px-2.5 py-1 text-xs font-mono font-normal bg-purple-50 text-purple-800 border-purple-200"
                          >
                            <Mail className="w-3 h-3 text-purple-600" />
                            <span>{em}</span>
                            <button
                              type="button"
                              onClick={() => handleRemoveEmail(em)}
                              className="rounded-full hover:bg-purple-200/80 p-0.5 transition-colors cursor-pointer text-purple-600 hover:text-purple-900"
                            >
                              <X className="w-3 h-3" />
                            </button>
                          </Badge>
                        ))}
                      </div>
                    )}
                  </div>

                  {/* Asunto */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Asunto del correo
                    </Label>
                    <Input
                      value={emailSubject}
                      onChange={(e) => setEmailSubject(e.target.value)}
                      placeholder={`Ej: Reporte automático: ${selectedReport?.attributes.name || "Ejecución periódica"}`}
                      className="text-xs h-9"
                    />
                  </div>

                  {/* Cuerpo del mensaje (Texto enriquecido) */}
                  <div className="grid gap-1.5">
                    <Label className="text-xs font-semibold text-slate-700">
                      Cuerpo del mensaje (Texto enriquecido)
                    </Label>
                    <RichTextEditor
                      value={emailBody}
                      onChange={setEmailBody}
                      placeholder="Escribe aquí el cuerpo del correo que acompañará al archivo adjunto generado..."
                      minHeight="140px"
                    />
                  </div>
                </div>
              </TabsContent>

              {/* Contenido: FTP */}
              <TabsContent value="ftp" className="pt-2">
                <div className="rounded-xl border border-slate-200 bg-white p-4 space-y-3">
                  <h4 className="text-xs font-bold text-slate-800">
                    Configuración del Servidor FTP
                  </h4>
                  <div className="grid gap-3 sm:grid-cols-2">
                    <div className="grid gap-1">
                      <Label className="text-xs">Host / Servidor *</Label>
                      <Input
                        value={(ftpConfig.host as string) ?? ""}
                        onChange={(e) =>
                          setFtpConfig((prev) => ({ ...prev, host: e.target.value }))
                        }
                        placeholder="ftp.example.com"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Puerto</Label>
                      <Input
                        type="number"
                        value={(ftpConfig.port as number) ?? 21}
                        onChange={(e) =>
                          setFtpConfig((prev) => ({
                            ...prev,
                            port: Number(e.target.value),
                          }))
                        }
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Usuario *</Label>
                      <Input
                        value={(ftpConfig.username as string) ?? ""}
                        onChange={(e) =>
                          setFtpConfig((prev) => ({
                            ...prev,
                            username: e.target.value,
                          }))
                        }
                        placeholder="ftp_user"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="grid gap-1">
                      <Label className="text-xs">Contraseña *</Label>
                      <Input
                        type="password"
                        value={(ftpConfig.password as string) ?? ""}
                        onChange={(e) =>
                          setFtpConfig((prev) => ({
                            ...prev,
                            password: e.target.value,
                          }))
                        }
                        placeholder="••••••••"
                        className="text-xs h-8"
                      />
                    </div>
                    <div className="grid gap-1 sm:col-span-2">
                      <Label className="text-xs">Ruta de destino *</Label>
                      <Input
                        value={(ftpConfig.path as string) ?? "/"}
                        onChange={(e) =>
                          setFtpConfig((prev) => ({ ...prev, path: e.target.value }))
                        }
                        placeholder="/reports/programados"
                        className="text-xs h-8"
                      />
                    </div>
                  </div>
                </div>
              </TabsContent>
            </Tabs>
          </div>

          {/* Fila 9: Notificación Webhook (mejora 5.1) */}
          <div className="space-y-3 rounded-xl border border-slate-200 bg-slate-50/50 p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Checkbox
                  id="webhook_enabled"
                  checked={webhookEnabled}
                  onCheckedChange={(checked) => setWebhookEnabled(!!checked)}
                />
                <Label
                  htmlFor="webhook_enabled"
                  className="text-xs font-semibold text-slate-800 cursor-pointer"
                >
                  Notificación HTTP Webhook
                </Label>
              </div>
              <Badge variant="outline" className="text-[10px] text-muted-foreground">
                POST al finalizar
              </Badge>
            </div>

            {webhookEnabled && (
              <div className="space-y-1.5 pt-1 pl-6 animate-in fade-in duration-150">
                <Label className="text-xs text-slate-700">
                  URL del Webhook *
                </Label>
                <Input
                  type="url"
                  value={webhookUrl}
                  onChange={(e) => setWebhookUrl(e.target.value)}
                  placeholder="https://api.tuempresa.com/webhooks/report-completed"
                  className="text-xs h-9 bg-white"
                />
                <p className="text-[11px] text-muted-foreground">
                  Se enviará un payload JSON con el estado de la ejecución, conteo de filas, duración y detalles del archivo generado.
                </p>
              </div>
            )}
          </div>
        </div>

        <DialogFooter className="pt-4 border-t mt-3 flex items-center justify-between">
          <Button
            type="button"
            variant="outline"
            onClick={() => onOpenChange(false)}
            className="cursor-pointer text-xs"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={handleSubmit}
            disabled={isLoading}
            className="cursor-pointer text-xs gap-1.5"
          >
            {isLoading && <BaseIcon name="Loader" size={14} className="animate-spin" />}
            <span>{isEdit ? "Guardar cambios" : "Crear programación"}</span>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default ScheduleDialog;