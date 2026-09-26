"use client";
import React, { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { useGenerateReport } from "../hooks/use-generate-report";
import {
  requestReportPreview,
  requestMyReportParameterOptions,
} from "../services/my-report-service";
import {
  DeliveryType,
  MyReportItem,
  PreviewData,
  ReportFormat,
  ReportParameterOption,
} from "../types/my-report-types";
import {
  Download,
  FileSpreadsheet,
  FileText,
  FileCode,
  Loader2,
  Mail,
  Send,
  Calendar,
  RefreshCw,
  AlertTriangle,
  AlertCircle,
  ChevronLeft,
  ChevronRight,
  CheckCheck,
  XSquare,
  Table as TableIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { FilenamePatternInput } from "@/components/common/filename-pattern/FilenamePatternInput";

interface GenerateReportModalProps {
  report: MyReportItem | null;
  isOpen: boolean;
  onClose: () => void;
}

const formatOptions: {
  value: ReportFormat;
  label: string;
  desc: string;
  icon: React.ComponentType<{ className?: string }>;
  color: string;
}[] = [
  {
    value: "xlsx",
    label: "Excel",
    desc: ".xlsx",
    icon: FileSpreadsheet,
    color: "text-emerald-600 bg-emerald-50 border-emerald-200",
  },
  {
    value: "csv",
    label: "CSV",
    desc: ".csv",
    icon: FileSpreadsheet,
    color: "text-teal-600 bg-teal-50 border-teal-200",
  },
  {
    value: "pdf",
    label: "PDF",
    desc: ".pdf",
    icon: FileText,
    color: "text-rose-600 bg-rose-50 border-rose-200",
  },
  {
    value: "docx",
    label: "Word",
    desc: ".docx",
    icon: FileText,
    color: "text-blue-600 bg-blue-50 border-blue-200",
  },
  {
    value: "txt",
    label: "Texto",
    desc: ".txt",
    icon: FileCode,
    color: "text-amber-600 bg-amber-50 border-amber-200",
  },
];

interface ParamOptionState {
  loading: boolean;
  options: ReportParameterOption[];
  error?: string | null;
}

export const GenerateReportModal: React.FC<GenerateReportModalProps> = ({
  report,
  isOpen,
  onClose,
}) => {
  const { user } = useAuth();
  const { generateReport, isGenerating } = useGenerateReport();

  const [format, setFormat] = useState<ReportFormat>("xlsx");
  const [deliveryType, setDeliveryType] = useState<DeliveryType>("download");
  const [destinationEmail, setDestinationEmail] = useState<string>("");
  const [filenamePattern, setFilenamePattern] = useState<string>("");
  const [paramValues, setParamValues] = useState<Record<string, string>>({});
  const [paramOptions, setParamOptions] = useState<Record<string, ParamOptionState>>({});

  // Estados de vista previa y selección de columnas
  const [previewData, setPreviewData] = useState<PreviewData | null>(null);
  const [isLoadingPreview, setIsLoadingPreview] = useState<boolean>(false);
  const [previewError, setPreviewError] = useState<string | null>(null);
  const [selectedColumns, setSelectedColumns] = useState<string[]>([]);
  const [previewPage, setPreviewPage] = useState<number>(1);
  const pageSize = 5;

  const fetchPreview = async (paramsToUse: Record<string, string>) => {
    if (!report) return;
    setIsLoadingPreview(true);
    setPreviewError(null);
    try {
      const res = await requestReportPreview(
        report.id,
        paramsToUse,
        50,
        user?.id
      );
      const data = res?.data;
      if (data) {
        setPreviewData(data);
        const validKeys = data.columns.map((c) => c.key);
        const defaultSelected = data.columns
          .filter((c) => c.is_selected !== false)
          .map((c) => c.key);
        setSelectedColumns(
          defaultSelected.length > 0 ? defaultSelected : validKeys
        );
        setPreviewPage(1);
      }
    } catch (err: unknown) {
      setPreviewError(
        (err as Error)?.message || "No fue posible cargar la vista previa de datos."
      );
    } finally {
      setIsLoadingPreview(false);
    }
  };

  useEffect(() => {
    if (report && isOpen) {
      const initialParams: Record<string, string> = {};
      const initialOptions: Record<string, ParamOptionState> = {};
      const paramsList = report.relationships?.parameters ?? [];

      paramsList.forEach((p) => {
        const name = String(p?.attributes?.param_name ?? p?.param_name ?? "");
        if (!name) return;

        const rawDefault = p?.attributes?.default_value ?? p?.default_value;
        const inputType = String(p?.attributes?.input_type ?? p?.input_type ?? "").toLowerCase();
        const dataType = String(p?.attributes?.data_type ?? p?.data_type ?? "").toLowerCase();
        const optionsSource = p?.attributes?.options_source ?? p?.options_source;
        const staticOpts = p?.attributes?.static_options ?? p?.static_options;

        const isSelect =
          inputType === "select" ||
          (p?.attributes?.options_source !== undefined &&
            p?.attributes?.options_source !== null);
        const isBoolean = !isSelect && (inputType === "boolean" || dataType.includes("bool"));

        if (rawDefault !== undefined && rawDefault !== null && String(rawDefault).trim() !== "") {
          initialParams[name] = String(rawDefault);
        } else if (isBoolean) {
          initialParams[name] = "true";
        } else {
          initialParams[name] = "";
        }

        if (inputType === "select" || optionsSource) {
          if (optionsSource === "static" && Array.isArray(staticOpts)) {
            initialOptions[name] = {
              loading: false,
              options: staticOpts,
            };
          } else if (optionsSource === "query") {
            initialOptions[name] = {
              loading: true,
              options: [],
            };
          }
        }
      });

      setParamValues(initialParams);
      setParamOptions(initialOptions);
      setFormat("xlsx");
      setDeliveryType("download");
      setDestinationEmail(user?.attributes?.email ?? "");
      setFilenamePattern(report.attributes.filename_pattern || "");
      setSelectedColumns([]);
      setPreviewData(null);
      setPreviewPage(1);

      fetchPreview(initialParams);

      // Cargar opciones para parámetros con catálogo SQL
      paramsList.forEach(async (p) => {
        const name = String(p?.attributes?.param_name ?? p?.param_name ?? "");
        const inputType = p?.attributes?.input_type ?? p?.input_type;
        const optionsSource = p?.attributes?.options_source ?? p?.options_source;
        const paramId = p.id;

        if (
          (inputType === "select" || optionsSource === "query") &&
          optionsSource === "query" &&
          paramId
        ) {
          try {
            const res = await requestMyReportParameterOptions(
              report.id,
              paramId,
              user?.id
            );
            const opts = res?.data ?? [];
            setParamOptions((prev) => ({
              ...prev,
              [name]: {
                loading: false,
                options: opts,
              },
            }));
          } catch (err: unknown) {
            setParamOptions((prev) => ({
              ...prev,
              [name]: {
                loading: false,
                options: [],
                error: (err as Error)?.message || "Error al cargar opciones",
              },
            }));
          }
        }
      });
    }
  }, [report, isOpen]);

  if (!report) return null;

  const parameters = report.relationships?.parameters ?? [];

  const handleParamChange = (name: string, value: string) => {
    setParamValues((prev) => ({
      ...prev,
      [name]: value,
    }));
  };

  const handleSelectAllColumns = () => {
    if (!previewData) return;
    setSelectedColumns(previewData.columns.map((c) => c.key));
  };

  const handleDeselectAllColumns = () => {
    setSelectedColumns([]);
  };

  const handleToggleColumn = (key: string) => {
    setSelectedColumns((prev) =>
      prev.includes(key) ? prev.filter((k) => k !== key) : [...prev, key]
    );
  };

  const handleGenerate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!report) return;

    if (
      previewData &&
      previewData.columns.length > 0 &&
      selectedColumns.length === 0
    ) {
      toast.error("Debes seleccionar al menos una columna para generar el reporte.");
      return;
    }

    if (format === "pdf" && previewData && previewData.rows.length > 2500) {
      toast.error(
        `Este reporte contiene ${previewData.rows.length.toLocaleString()} registros. El límite máximo recomendado para generación visual en PDF es de 2,500 registros. Por favor selecciona formato Excel (.xlsx) o CSV.`
      );
      return;
    }

    const success = await generateReport({
      report,
      params: paramValues,
      format,
      deliveryType,
      destinationEmail: deliveryType === "email" ? destinationEmail : undefined,
      selectedColumns: selectedColumns.length > 0 ? selectedColumns : undefined,
      filenamePattern: filenamePattern || undefined,
    });

    if (success) {
      onClose();
    }
  };

  // Cálculo de filas y columnas para la vista previa paginada
  const visibleColumns = (previewData?.columns ?? []).filter((c) =>
    selectedColumns.includes(c.key)
  );
  const totalRows = previewData?.rows.length ?? 0;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const displayedRows = (previewData?.rows ?? []).slice(
    (previewPage - 1) * pageSize,
    previewPage * pageSize
  );

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="w-[95vw] sm:w-[55vw] sm:max-w-[55vw] max-h-[90vh] overflow-y-auto overflow-x-hidden min-w-0">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary text-sm font-semibold mb-1">
            <span className="inline-block w-2 h-2 rounded-full bg-primary" />
            <span>Generador bajo demanda</span>
          </div>
          <DialogTitle className="text-xl font-bold text-slate-900">
            {report.attributes.name}
          </DialogTitle>
          {report.attributes.description && (
            <DialogDescription className="text-xs text-slate-500 mt-1">
              {report.attributes.description}
            </DialogDescription>
          )}
        </DialogHeader>

        <form onSubmit={handleGenerate} className="space-y-6 mt-3 w-full max-w-full min-w-0 overflow-x-hidden">
          {/* Parámetros de la consulta (si existen) */}
          {parameters.length > 0 && (
            <div className="space-y-3 p-4 rounded-xl bg-slate-50/80 border border-slate-200/80">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Calendar className="w-4 h-4 text-slate-600" />
                  <h4 className="text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Parámetros del Reporte
                  </h4>
                </div>
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => fetchPreview(paramValues)}
                  disabled={isLoadingPreview}
                  className="h-7 text-xs gap-1.5 cursor-pointer bg-white"
                >
                  <RefreshCw
                    className={cn(
                      "w-3 h-3 text-slate-600",
                      isLoadingPreview && "animate-spin"
                    )}
                  />
                  <span>Actualizar vista previa</span>
                </Button>
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3 pt-1">
                {parameters.map((param) => {
                  const paramName = String(
                    param?.attributes?.param_name ?? param?.param_name ?? ""
                  );
                  if (!paramName) return null;

                  const dataType = String(
                    param?.attributes?.data_type ?? param?.data_type ?? "string"
                  ).toLowerCase();
                  const inputType = String(
                    param?.attributes?.input_type ?? param?.input_type ?? ""
                  ).toLowerCase();
                  const label =
                    param?.attributes?.display_label ??
                    param?.display_label ??
                    param?.attributes?.label ??
                    param?.label ??
                    paramName;
                  const defaultValue =
                    param?.attributes?.default_value ??
                    param?.default_value ??
                    "";
                  const isRequired = Boolean(
                    param?.attributes?.is_required ?? param?.is_required
                  );

                  const optState = paramOptions[paramName];
                  const isSelect =
                    inputType === "select" ||
                    (optState && optState.options && optState.options.length > 0) ||
                    (param?.attributes?.options_source !== undefined &&
                      param?.attributes?.options_source !== null);

                  const isDate =
                    !isSelect &&
                    (inputType === "date" ||
                      dataType.includes("date") ||
                      paramName.toLowerCase().includes("fecha") ||
                      paramName.toLowerCase().includes("date"));
                  const isDateTime =
                    !isSelect &&
                    (inputType === "datetime" ||
                      dataType.includes("datetime") ||
                      dataType.includes("timestamp"));
                  const isBoolean =
                    !isSelect &&
                    (inputType === "boolean" || dataType.includes("bool"));
                  const isNumber =
                    !isSelect &&
                    (inputType === "number" ||
                      dataType.includes("int") ||
                      dataType.includes("numeric") ||
                      dataType.includes("decimal") ||
                      dataType.includes("float"));

                  const currentVal = paramValues[paramName] ?? "";

                  return (
                    <div key={param.id} className="space-y-1.5">
                      <div className="flex items-center justify-between gap-1">
                        <Label
                          htmlFor={`param-${paramName}`}
                          className="text-xs font-medium text-slate-700 truncate"
                          title={label}
                        >
                          {label}
                          {isRequired && (
                            <span className="text-rose-500 ml-1">*</span>
                          )}
                        </Label>
                        {isDate && (
                          <div className="flex items-center gap-1 shrink-0">
                            <button
                              type="button"
                              onClick={() =>
                                handleParamChange(
                                  paramName,
                                  new Date().toISOString().slice(0, 10)
                                )
                              }
                              className="text-[10px] text-primary hover:underline font-medium cursor-pointer"
                            >
                              Hoy
                            </button>
                            <span className="text-slate-300 text-[10px]">|</span>
                            <button
                              type="button"
                              onClick={() => {
                                const now = new Date();
                                const firstDay = new Date(
                                  now.getFullYear(),
                                  now.getMonth(),
                                  1
                                )
                                  .toISOString()
                                  .slice(0, 10);
                                handleParamChange(paramName, firstDay);
                              }}
                              className="text-[10px] text-slate-500 hover:text-slate-800 cursor-pointer"
                            >
                              1° mes
                            </button>
                          </div>
                        )}
                        {isSelect && optState?.loading && (
                          <span className="text-[10px] text-slate-400 flex items-center gap-1 shrink-0">
                            <Loader2 className="w-2.5 h-2.5 animate-spin text-primary" />
                            Cargando...
                          </span>
                        )}
                      </div>

                      {/* Renderizado de Select / Dropdown */}
                      {isSelect ? (
                        <Select
                          value={currentVal}
                          onValueChange={(val) =>
                            handleParamChange(paramName, val)
                          }
                          disabled={optState?.loading}
                        >
                          <SelectTrigger
                            id={`param-${paramName}`}
                            className="h-9 w-full text-xs bg-white border-slate-200"
                          >
                            <SelectValue
                              placeholder={
                                optState?.loading
                                  ? "Cargando opciones..."
                                  : "Selecciona una opción..."
                              }
                            />
                          </SelectTrigger>
                          <SelectContent className="max-h-60">
                            {optState?.options && optState.options.length > 0 ? (
                              optState.options.map((opt) => (
                                <SelectItem
                                  key={String(opt.value)}
                                  value={String(opt.value)}
                                  className="text-xs"
                                >
                                  {opt.label}
                                </SelectItem>
                              ))
                            ) : (
                              <div className="p-2 text-center text-xs text-slate-400 italic">
                                {optState?.loading
                                  ? "Cargando..."
                                  : "Sin opciones disponibles"}
                              </div>
                            )}
                          </SelectContent>
                        </Select>
                      ) : isDate ? (
                        <Input
                          id={`param-${paramName}`}
                          type="date"
                          value={currentVal}
                          onChange={(e) =>
                            handleParamChange(paramName, e.target.value)
                          }
                          required={isRequired}
                          className="h-9 text-xs bg-white font-mono"
                        />
                      ) : isDateTime ? (
                        <Input
                          id={`param-${paramName}`}
                          type="datetime-local"
                          value={currentVal}
                          onChange={(e) =>
                            handleParamChange(paramName, e.target.value)
                          }
                          required={isRequired}
                          className="h-9 text-xs bg-white font-mono"
                        />
                      ) : isBoolean ? (
                        <Select
                          value={currentVal || "true"}
                          onValueChange={(val) =>
                            handleParamChange(paramName, val)
                          }
                        >
                          <SelectTrigger
                            id={`param-${paramName}`}
                            className="h-9 w-full text-xs bg-white border-slate-200"
                          >
                            <SelectValue placeholder="Selecciona una opción..." />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="true" className="text-xs">
                              Verdadero / Activo (true)
                            </SelectItem>
                            <SelectItem value="false" className="text-xs">
                              Falso / Inactivo (false)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      ) : isNumber ? (
                        <Input
                          id={`param-${paramName}`}
                          type="number"
                          step="any"
                          value={currentVal}
                          onChange={(e) =>
                            handleParamChange(paramName, e.target.value)
                          }
                          placeholder={defaultValue || "Ingresar número..."}
                          required={isRequired}
                          className="h-9 text-xs bg-white font-mono"
                        />
                      ) : (
                        <Input
                          id={`param-${paramName}`}
                          type="text"
                          value={currentVal}
                          onChange={(e) =>
                            handleParamChange(paramName, e.target.value)
                          }
                          placeholder={defaultValue || "Ingresar valor..."}
                          required={isRequired}
                          className="h-9 text-xs bg-white"
                        />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          )}

          {/* Sección de Selección de Columnas y Vista Previa */}
          <div className="space-y-3 p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs w-full max-w-full min-w-0 overflow-hidden">
            <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <TableIcon className="w-4 h-4 text-primary" />
                <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wider">
                  Selección de Columnas y Vista Previa
                </h4>
                {previewData && (
                  <span className="text-[11px] px-2 py-0.5 rounded-full font-medium bg-slate-100 text-slate-700 border border-slate-200">
                    {selectedColumns.length} de {previewData.columns.length}{" "}
                    seleccionadas
                  </span>
                )}
              </div>

              <div className="flex items-center gap-2">
                {parameters.length === 0 && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => fetchPreview(paramValues)}
                    disabled={isLoadingPreview}
                    className="h-7 text-xs gap-1.5 cursor-pointer"
                  >
                    <RefreshCw
                      className={cn(
                        "w-3 h-3",
                        isLoadingPreview && "animate-spin"
                      )}
                    />
                    <span>Recargar</span>
                  </Button>
                )}
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

            {/* Selector interactivo de columnas (Checkboxes) */}
            {isLoadingPreview ? (
              <div className="py-8 flex flex-col items-center justify-center gap-2 text-slate-500">
                <Loader2 className="w-5 h-5 animate-spin text-primary" />
                <span className="text-xs">Cargando columnas y muestra de datos...</span>
              </div>
            ) : previewData ? (
              <div className="space-y-3">
                <div className="flex flex-wrap gap-2 max-h-36 overflow-y-auto p-1">
                  {previewData.columns.map((col) => {
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

                {/* Tabla de muestra de datos con columnas seleccionadas (scroll X exclusivo para la tabla) */}
                <div className="rounded-lg border border-slate-200 bg-white w-full max-w-full min-w-0 overflow-hidden">
                  <div className="w-full max-w-full min-w-0 overflow-x-auto overflow-y-auto max-h-64">
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

                  {/* Paginador de la vista previa */}
                  {totalRows > 0 && (
                    <div className="flex items-center justify-between px-3 py-2 bg-slate-50 border-t border-slate-200 text-xs text-slate-600">
                      <span>
                        Mostrando {(previewPage - 1) * pageSize + 1} -{" "}
                        {Math.min(previewPage * pageSize, totalRows)} de{" "}
                        {totalRows} registros de muestra ({previewData.execution_time_ms} ms)
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
              <div className="py-6 text-center text-xs text-slate-500">
                Presiona &quot;Actualizar vista previa&quot; para previsualizar los datos con los parámetros seleccionados.
              </div>
            )}

            {/* Advertencia para Word (.docx) */}
            {format === "docx" && selectedColumns.length > 8 && (
              <div className="flex items-start gap-2 p-3 rounded-lg bg-amber-50 border border-amber-200 text-amber-900 text-xs">
                <AlertTriangle className="w-4 h-4 text-amber-600 shrink-0 mt-0.5" />
                <div>
                  <span className="font-semibold">Recomendación para Word (.docx): </span>
                  Has seleccionado {selectedColumns.length} columnas. En documentos Word, tablas con más de 8 columnas pueden verse muy ajustadas o requerir orientación horizontal. Te sugerimos seleccionar únicamente las columnas esenciales o exportar en <strong>Excel (.xlsx)</strong>.
                </div>
              </div>
            )}
          </div>

          {/* Selector de formato de archivo */}
          <div className="space-y-2">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Formato del Archivo
            </Label>
            <div className="grid grid-cols-5 gap-2">
              {formatOptions.map((opt) => {
                const IconComponent = opt.icon;
                const isSelected = format === opt.value;
                return (
                  <button
                    type="button"
                    key={opt.value}
                    onClick={() => setFormat(opt.value)}
                    className={cn(
                      "flex flex-col items-center justify-center p-2.5 rounded-xl border-2 transition-all cursor-pointer",
                      isSelected
                        ? "border-primary bg-primary/5 shadow-sm ring-1 ring-primary/30"
                        : "border-slate-200 hover:border-slate-300 bg-white"
                    )}
                  >
                    <div
                      className={cn(
                        "p-1.5 rounded-lg mb-1 border",
                        opt.color
                      )}
                    >
                      <IconComponent className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold text-slate-800">
                      {opt.label}
                    </span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {opt.desc}
                    </span>
                  </button>
                );
              })}
            </div>

            {/* Advertencia / recomendación para formato PDF */}
            {format === "pdf" && (
              <div
                className={cn(
                  "flex items-start gap-2.5 p-3 rounded-xl text-xs transition-colors",
                  totalRows > 2500
                    ? "bg-rose-50 border border-rose-200 text-rose-800"
                    : "bg-blue-50 border border-blue-200/80 text-blue-800"
                )}
              >
                <AlertCircle
                  className={cn(
                    "w-4 h-4 shrink-0 mt-0.5",
                    totalRows > 2500 ? "text-rose-600" : "text-blue-600"
                  )}
                />
                <div>
                  {totalRows > 2500 ? (
                    <>
                      <span className="font-semibold">
                        Volumen de datos alto para PDF ({totalRows.toLocaleString()} registros detectados):{" "}
                      </span>
                      El formato PDF está diseñado para documentos imprimibles de hasta 2,500 filas. Para exportar este volumen completo de forma rápida y sin límites de memoria, te sugerimos seleccionar <strong>Excel (.xlsx)</strong> o <strong>CSV</strong>.
                    </>
                  ) : (
                    <>
                      <span className="font-semibold">Nota sobre formato PDF: </span>
                      Ideal para informes ejecutivos y hojas de impresión (hasta 2,500 registros). Si requieres procesar grandes volúmenes tabulares, te recomendamos exportar en <strong>Excel (.xlsx)</strong> o <strong>CSV</strong>.
                    </>
                  )}
                </div>
              </div>
            )}
          </div>

          {/* Nombre personalizado del archivo */}
          <div className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs">
            <FilenamePatternInput
              value={filenamePattern}
              onChange={setFilenamePattern}
              reportName={report.attributes.name}
              format={format}
              label="Nombre del archivo a generar"
              placeholder="{report_name}_{YYYY}{MM}{DD}_{HH}{mm}{ss}"
            />
          </div>

          {/* Método de entrega */}
          <div className="space-y-3">
            <Label className="text-xs font-bold text-slate-700 uppercase tracking-wider">
              Método de Entrega
            </Label>
            <Tabs
              value={deliveryType}
              onValueChange={(v) => setDeliveryType(v as DeliveryType)}
              className="w-full"
            >
              <TabsList className="grid grid-cols-2 w-full h-11">
                <TabsTrigger
                  value="download"
                  className="gap-2 cursor-pointer data-[state=active]:shadow-sm"
                >
                  <Download className="w-4 h-4" />
                  <span>Descarga directa</span>
                </TabsTrigger>
                <TabsTrigger
                  value="email"
                  className="gap-2 cursor-pointer data-[state=active]:shadow-sm"
                >
                  <Mail className="w-4 h-4" />
                  <span>Enviar por correo</span>
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {deliveryType === "download" && (
              <p className="text-xs text-muted-foreground bg-blue-50/60 border border-blue-200/60 p-3 rounded-lg flex items-start gap-2">
                <span className="text-blue-600 font-bold">ℹ</span>
                <span>
                  El reporte se generará en segundo plano con las columnas seleccionadas. Podrás seguir el avance y descargarlo desde la sección <strong>Descargas</strong>.
                </span>
              </p>
            )}

            {deliveryType === "email" && (
              <div className="space-y-1.5 pt-1">
                <Label
                  htmlFor="dest-email"
                  className="text-xs font-medium text-slate-700"
                >
                  Correo electrónico de destino
                </Label>
                <Input
                  id="dest-email"
                  type="email"
                  value={destinationEmail}
                  onChange={(e) => setDestinationEmail(e.target.value)}
                  placeholder="ejemplo@empresa.com"
                  required
                  className="h-10 text-sm"
                />
                <p className="text-[11px] text-muted-foreground">
                  El archivo generado se enviará como adjunto al correo indicado una vez completado.
                </p>
              </div>
            )}
          </div>

          {/* Pie del modal: Botones agrupados a la derecha con margen mx-[5px], no en extremos opuestos */}
          <DialogFooter className="pt-4 border-t border-slate-200/80 flex flex-row justify-end items-center">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isGenerating}
              className="cursor-pointer mx-[5px] px-5"
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={
                isGenerating ||
                (previewData !== null &&
                  previewData.columns.length > 0 &&
                  selectedColumns.length === 0)
              }
              className="gap-2 cursor-pointer font-semibold mx-[5px] px-5"
            >
              {isGenerating ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  <span>Iniciando...</span>
                </>
              ) : deliveryType === "download" ? (
                <>
                  <Download className="w-4 h-4" />
                  <span>Generar y descargar</span>
                </>
              ) : (
                <>
                  <Send className="w-4 h-4" />
                  <span>Generar y enviar</span>
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};

