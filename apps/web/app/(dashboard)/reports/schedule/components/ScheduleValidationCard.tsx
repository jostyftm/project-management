"use client";

import React, { useRef, useState } from "react";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  AlertConditionItem,
  OPERATORS_BY_DATA_TYPE,
  ReportAlertConditionOperator,
  ReportAlertConditionType,
  ROW_COUNT_OPERATORS,
} from "@/types/alert-types";
import {
  ShieldCheck,
  Layers,
  Play,
  Loader2,
  Plus,
  Trash2,
  CheckCircle2,
  AlertTriangle,
  Database,
  FileSpreadsheet,
  Copy,
  RotateCcw,
  Sparkles,
  Table as TableIcon,
  Timer,
  ChevronDown,
  ChevronUp,
} from "lucide-react";
import { SqlEditor } from "@/components/ui/sql-editor";
import { ReactCodeMirrorRef } from "@uiw/react-codemirror";
import { SchemaTable } from "@/types/schema-type";
import { toast } from "sonner";

interface ScheduleValidationCardProps {
  validationEnabled: boolean;
  setValidationEnabled: (val: boolean) => void;
  validationSource: "report_data" | "custom_query";
  setValidationSource: (val: "report_data" | "custom_query") => void;
  validationQuery: string;
  setValidationQuery: (val: string) => void;
  validationRules: AlertConditionItem[];
  setValidationRules: React.Dispatch<React.SetStateAction<AlertConditionItem[]>>;
  availableColumns: { key: string; label: string; data_type?: string }[];
  onTestValidation: () => Promise<void>;
  isTesting: boolean;
  testResult: {
    success: boolean;
    passed?: boolean;
    evaluated_value?: string;
    threshold_snapshot?: string;
    total_rows?: number;
    sample_data?: Record<string, unknown>[];
    columns?: string[];
    execution_time_ms?: number;
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
  } | null;
  disabled?: boolean;
  dialect?: string;
  tables?: SchemaTable[];
  connectionName?: string;
}

const DATE_MACROS = [
  { label: "{{TODAY}}", desc: "Fecha actual (YYYY-MM-DD)" },
  { label: "{{YESTERDAY}}", desc: "Día anterior (YYYY-MM-DD)" },
  { label: "{{START_OF_MONTH}}", desc: "Primer día del mes actual (YYYY-MM-01)" },
  { label: "{{END_OF_MONTH}}", desc: "Último día del mes actual (YYYY-MM-DD)" },
  { label: "{{NOW}}", desc: "Fecha y hora actual (YYYY-MM-DD HH:mm:ss)" },
];

const getDialectLabel = (dialect?: string) => {
  switch (dialect?.toLowerCase()) {
    case "pgsql":
    case "postgresql":
    case "postgres":
      return "PostgreSQL";
    case "mysql":
      return "MySQL";
    case "mariadb":
      return "MariaDB";
    case "sqlsrv":
    case "mssql":
      return "SQL Server";
    case "sqlite":
      return "SQLite";
    default:
      return "SQL";
  }
};

export const ScheduleValidationCard: React.FC<ScheduleValidationCardProps> = ({
  validationEnabled,
  setValidationEnabled,
  validationSource,
  setValidationSource,
  validationQuery,
  setValidationQuery,
  validationRules,
  setValidationRules,
  availableColumns,
  onTestValidation,
  isTesting,
  testResult,
  disabled = false,
  dialect = "pgsql",
  tables = [],
  connectionName,
}) => {
  const editorRef = useRef<ReactCodeMirrorRef>(null);
  const [isPreviewOpen, setIsPreviewOpen] = useState<boolean>(true);

  const handleAddCondition = () => {
    const newId = String(Date.now());
    setValidationRules((prev) => [
      ...prev,
      {
        id: newId,
        type: "row_count",
        column: "",
        operator: ">",
        value: "0",
        logic_operator: "AND",
      },
    ]);
  };

  const handleUpdateCondition = (
    index: number,
    patch: Partial<AlertConditionItem>
  ) => {
    setValidationRules((prev) =>
      prev.map((c, i) => (i === index ? { ...c, ...patch } : c))
    );
  };

  const handleRemoveCondition = (index: number) => {
    setValidationRules((prev) => {
      const next = prev.filter((_, i) => i !== index);
      return next.length > 0
        ? next
        : [
            {
              id: "1",
              type: "row_count",
              column: "",
              operator: ">",
              value: "0",
              logic_operator: "AND",
            },
          ];
    });
  };

  const insertMacro = (macro: string) => {
    const view = editorRef.current?.view;
    if (view) {
      const ranges = view.state.selection.ranges;
      const main = ranges[0] ?? {
        from: view.state.doc.length,
        to: view.state.doc.length,
      };
      view.dispatch({
        changes: { from: main.from, to: main.to, insert: macro },
        selection: { anchor: main.from + macro.length },
      });
      view.focus();
    } else {
      setValidationQuery(validationQuery ? `${validationQuery} ${macro}` : macro);
    }
  };

  const handleCopyQuery = async () => {
    if (!validationQuery.trim()) {
      toast.info("No hay consulta para copiar.");
      return;
    }
    try {
      await navigator.clipboard.writeText(validationQuery);
      toast.success("Consulta SQL copiada al portapapeles.");
    } catch {
      toast.error("No se pudo copiar la consulta.");
    }
  };

  const handleClearQuery = () => {
    setValidationQuery("");
    const view = editorRef.current?.view;
    if (view) {
      view.dispatch({
        changes: { from: 0, to: view.state.doc.length, insert: "" },
      });
      view.focus();
    }
  };

  const handleAssignDetectedColumn = (colName: string) => {
    setValidationRules((prev) => {
      if (
        prev.length === 1 &&
        prev[0].type === "row_count" &&
        (!prev[0].column || prev[0].column === "")
      ) {
        return [
          {
            ...prev[0],
            type: "column_value",
            column: colName,
            operator: ">=",
            value: "1",
          },
        ];
      }
      return [
        ...prev,
        {
          id: String(Date.now()),
          type: "column_value",
          column: colName,
          operator: "=",
          value: "",
          logic_operator: "AND",
        },
      ];
    });
    toast.success(`Columna '${colName}' asignada a las reglas.`);
  };

  return (
    <div className="space-y-4 rounded-xl p-4 bg-muted/20 border border-border/70">
      {/* Cabecera con Switch */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <div className="flex h-7 w-7 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <ShieldCheck className="h-4 w-4" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-xs font-bold text-slate-800 dark:text-slate-200 uppercase tracking-wider">
                Validación Previa al Envío
              </span>
              <Badge variant="outline" className="text-[10px] py-0">
                Opcional
              </Badge>
            </div>
            <p className="text-[11px] text-muted-foreground">
              Compara el resultado antes de generar y enviar el archivo. Si no se cumple, se omite el envío y se registra el motivo.
            </p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Label htmlFor="schedule-validation-toggle" className="text-xs text-muted-foreground cursor-pointer">
            {validationEnabled ? "Habilitada" : "Deshabilitada"}
          </Label>
          <Switch
            id="schedule-validation-toggle"
            checked={validationEnabled}
            onCheckedChange={setValidationEnabled}
            disabled={disabled}
          />
        </div>
      </div>

      {validationEnabled && (
        <div className="space-y-4 pt-2 border-t border-border/40">
          {/* Selector de Origen de Datos */}
          <div className="space-y-2">
            <Label className="text-xs font-semibold text-slate-700 dark:text-slate-300">
              Origen de la Validación
            </Label>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div
                onClick={() => setValidationSource("report_data")}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  validationSource === "report_data"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/60 hover:border-border hover:bg-muted/40"
                }`}
              >
                <FileSpreadsheet
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    validationSource === "report_data" ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Resultado del Reporte
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    Evalúa las condiciones sobre los registros que produce la consulta del reporte.
                  </div>
                </div>
              </div>

              <div
                onClick={() => setValidationSource("custom_query")}
                className={`p-3 rounded-lg border cursor-pointer transition-all flex items-start gap-3 ${
                  validationSource === "custom_query"
                    ? "border-primary bg-primary/5 shadow-xs"
                    : "border-border/60 hover:border-border hover:bg-muted/40"
                }`}
              >
                <Database
                  className={`h-4 w-4 mt-0.5 shrink-0 ${
                    validationSource === "custom_query" ? "text-primary" : "text-muted-foreground"
                  }`}
                />
                <div>
                  <div className="text-xs font-medium text-foreground">
                    Consulta SQL Personalizada
                  </div>
                  <div className="text-[11px] text-muted-foreground leading-snug">
                    Ejecuta una consulta SQL de control antes del reporte con CodeMirror, autocompletado y vista previa.
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Consulta SQL Personalizada con CodeMirror y Vista Previa */}
          {validationSource === "custom_query" && (
            <div className="space-y-2.5 p-3.5 bg-background rounded-xl border border-border shadow-2xs">
              {/* Barra de herramientas superior */}
              <div className="flex flex-wrap items-center justify-between gap-2 border-b border-border/60 pb-2.5">
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-foreground">
                    <Database className="h-3.5 w-3.5 text-primary" />
                    <span>Consulta SQL de Validación</span>
                  </div>
                  <Badge
                    variant="secondary"
                    className="text-[10px] font-mono py-0 h-5 px-2 bg-primary/10 text-primary border-primary/20"
                  >
                    {getDialectLabel(dialect)}
                  </Badge>
                  {connectionName && (
                    <span className="text-[10px] text-muted-foreground hidden sm:inline truncate max-w-[200px]" title={connectionName}>
                      ({connectionName})
                    </span>
                  )}
                </div>

                <div className="flex items-center gap-1.5">
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={onTestValidation}
                    disabled={isTesting || !validationQuery.trim()}
                    className="h-7 text-xs px-2.5 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                    title="Ejecutar consulta y ver resultados"
                  >
                    {isTesting ? (
                      <Loader2 className="h-3 w-3 animate-spin" />
                    ) : (
                      <Play className="h-3 w-3" />
                    )}
                    <span>Vista previa</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleCopyQuery}
                    className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                    title="Copiar consulta SQL"
                  >
                    <Copy className="h-3 w-3" />
                    <span className="hidden sm:inline">Copiar</span>
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={handleClearQuery}
                    disabled={!validationQuery.trim()}
                    className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-destructive hover:bg-destructive/10 cursor-pointer"
                    title="Limpiar consulta"
                  >
                    <RotateCcw className="h-3 w-3" />
                    <span className="hidden sm:inline">Limpiar</span>
                  </Button>
                </div>
              </div>

              {/* Botones de inserción rápida de macros de fecha */}
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-[10px] font-medium text-muted-foreground flex items-center gap-1">
                  <Sparkles className="h-3 w-3 text-primary" />
                  Macros dinámicas:
                </span>
                {DATE_MACROS.map((m) => (
                  <button
                    key={m.label}
                    type="button"
                    onClick={() => insertMacro(m.label)}
                    className="text-[10px] font-mono px-2 py-0.5 rounded bg-muted/80 hover:bg-primary/15 hover:text-primary transition-colors border border-border/80 flex items-center gap-1 cursor-pointer"
                    title={`${m.desc} — Clic para insertar en el cursor`}
                  >
                    <span>{m.label}</span>
                    <Plus className="h-2.5 w-2.5 opacity-60" />
                  </button>
                ))}
              </div>

              {/* Editor CodeMirror */}
              <div className="rounded-lg overflow-hidden border border-border focus-within:ring-1 focus-within:ring-primary/40">
                <SqlEditor
                  ref={editorRef}
                  value={validationQuery}
                  onChange={setValidationQuery}
                  dialect={dialect}
                  tables={tables}
                  placeholder="SELECT count(*) as total FROM sync_status WHERE finished = 1 AND fecha = '{{TODAY}}'"
                  disabled={disabled}
                  invalid={Boolean(testResult?.error)}
                  minHeight="110px"
                  maxHeight="260px"
                />
              </div>

              {/* Pie con indicaciones y columnas detectadas */}
              <div className="space-y-1.5">
                <p className="text-[10px] text-muted-foreground">
                  Se ejecuta en la conexión del reporte con autocompletado de tablas, columnas y macros. Escribe <code className="font-mono text-primary font-semibold">{"{{"}</code> para autocompletar variables.
                </p>

                {/* Columnas detectadas tras la prueba */}
                {testResult?.columns && testResult.columns.length > 0 && (
                  <div className="flex items-center gap-1.5 flex-wrap pt-1 text-[11px] text-muted-foreground">
                    <span className="font-semibold text-foreground">Columnas retornadas:</span>
                    {testResult.columns.map((colName) => (
                      <button
                        key={colName}
                        type="button"
                        onClick={() => handleAssignDetectedColumn(colName)}
                        className="font-mono text-[10px] px-2 py-0.5 rounded-md bg-primary/10 text-primary hover:bg-primary/20 transition-colors border border-primary/30 flex items-center gap-1 cursor-pointer"
                        title={`Clic para agregar o usar la columna '${colName}' en las reglas`}
                      >
                        <span>{colName}</span>
                        <Plus className="h-2.5 w-2.5" />
                      </button>
                    ))}
                  </div>
                )}
              </div>

              {/* Estado de carga de la vista previa */}
              {isTesting && (
                <div className="p-4 rounded-lg border border-border/60 bg-muted/20 flex items-center justify-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin text-primary" />
                  <span>Consultando datos en la base de datos y preparando vista previa...</span>
                </div>
              )}

              {/* Error de ejecución SQL */}
              {testResult?.error && (
                <div className="p-3 rounded-lg border border-destructive/30 bg-destructive/10 text-xs text-destructive flex items-start gap-2">
                  <AlertTriangle className="h-4 w-4 shrink-0 mt-0.5 text-destructive" />
                  <div className="space-y-1 overflow-x-auto w-full">
                    <span className="font-semibold">Error al ejecutar la consulta SQL:</span>
                    <pre className="font-mono text-[11px] whitespace-pre-wrap">{testResult.error}</pre>
                  </div>
                </div>
              )}

              {/* Vista previa interactiva de los datos de la consulta personalizada */}
              {!isTesting && testResult && !testResult.error && testResult.sample_data !== undefined && (
                <div className="mt-2.5 rounded-lg border border-border/80 bg-muted/15 overflow-hidden shadow-2xs">
                  {/* Cabecera de la tabla de vista previa */}
                  <div className="flex items-center justify-between px-3 py-2 bg-muted/50 border-b border-border/60">
                    <div className="flex items-center gap-2">
                      <TableIcon className="h-3.5 w-3.5 text-primary" />
                      <span className="text-xs font-semibold text-foreground">
                        Vista previa de datos
                      </span>
                      <Badge variant="secondary" className="text-[10px] font-mono py-0 h-5 px-1.5">
                        {testResult.total_rows ?? 0} {testResult.total_rows === 1 ? "fila devuelta" : "filas devueltas"}
                        {testResult.sample_data && testResult.sample_data.length < (testResult.total_rows ?? 0) && (
                          <span className="opacity-70 ml-1">(muestra de {testResult.sample_data.length})</span>
                        )}
                      </Badge>
                      {testResult.execution_time_ms !== undefined && (
                        <Badge variant="outline" className="text-[10px] font-mono py-0 h-5 px-1.5 text-muted-foreground gap-1">
                          <Timer className="h-2.5 w-2.5" />
                          {testResult.execution_time_ms} ms
                        </Badge>
                      )}
                    </div>

                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      onClick={() => setIsPreviewOpen((prev) => !prev)}
                      className="h-6 px-1.5 text-[11px] text-muted-foreground hover:text-foreground cursor-pointer"
                      title={isPreviewOpen ? "Ocultar tabla de vista previa" : "Mostrar tabla de vista previa"}
                    >
                      {isPreviewOpen ? (
                        <ChevronUp className="h-3.5 w-3.5" />
                      ) : (
                        <ChevronDown className="h-3.5 w-3.5" />
                      )}
                    </Button>
                  </div>

                  {/* Tabla de registros si isPreviewOpen */}
                  {isPreviewOpen && (
                    <>
                      {testResult.sample_data.length > 0 && testResult.columns && testResult.columns.length > 0 ? (
                        <div className="w-full max-w-full overflow-x-auto overflow-y-auto max-h-56">
                          <table className="w-full min-w-max text-xs text-left border-collapse table-auto">
                            <thead className="bg-muted/80 text-foreground font-semibold border-b border-border sticky top-0 z-10 backdrop-blur-xs">
                              <tr>
                                <th className="px-2.5 py-2 w-10 text-center font-mono text-[10px] text-muted-foreground border-r border-border/50">
                                  #
                                </th>
                                {testResult.columns.map((col) => (
                                  <th
                                    key={col}
                                    className="px-3 py-2 font-mono text-xs whitespace-nowrap border-r border-border/50 last:border-r-0 text-foreground font-medium"
                                  >
                                    {col}
                                  </th>
                                ))}
                              </tr>
                            </thead>
                            <tbody>
                              {testResult.sample_data.map((row, rIdx) => (
                                <tr
                                  key={rIdx}
                                  className={`border-b border-border/40 hover:bg-muted/40 transition-colors ${
                                    rIdx % 2 === 1 ? "bg-muted/15" : "bg-background"
                                  }`}
                                >
                                  <td className="px-2.5 py-1.5 text-center font-mono text-[10px] text-muted-foreground border-r border-border/40">
                                    {rIdx + 1}
                                  </td>
                                  {testResult.columns!.map((col) => {
                                    const val = row[col];
                                    return (
                                      <td
                                        key={col}
                                        className="px-3 py-1.5 font-mono text-xs whitespace-nowrap max-w-xs truncate border-r border-border/40 last:border-r-0 text-foreground/90"
                                        title={val !== null && val !== undefined ? String(val) : "null"}
                                      >
                                        {val === null || val === undefined ? (
                                          <span className="text-muted-foreground/50 italic text-[11px]">
                                            null
                                          </span>
                                        ) : typeof val === "boolean" ? (
                                          <Badge
                                            variant={val ? "default" : "secondary"}
                                            className="text-[9px] px-1 py-0 font-mono"
                                          >
                                            {val ? "true" : "false"}
                                          </Badge>
                                        ) : (
                                          String(val)
                                        )}
                                      </td>
                                    );
                                  })}
                                </tr>
                              ))}
                            </tbody>
                          </table>
                        </div>
                      ) : (
                        <div className="p-4 text-center text-xs text-muted-foreground italic">
                          La consulta se ejecutó correctamente pero no retornó registros (0 filas).
                        </div>
                      )}
                    </>
                  )}
                </div>
              )}
            </div>
          )}

          {/* Constructor de Reglas Multi-Condición */}
          <div className="space-y-2.5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-700 dark:text-slate-300">
                <Layers className="h-3.5 w-3.5 text-primary" />
                <span>Reglas Condicionales (AND / OR)</span>
              </div>

              <div className="flex items-center gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={onTestValidation}
                  disabled={isTesting}
                  className="h-7 text-xs px-2.5 gap-1.5 border-primary/40 text-primary hover:bg-primary/10 cursor-pointer"
                >
                  {isTesting ? (
                    <Loader2 className="h-3 w-3 animate-spin" />
                  ) : (
                    <Play className="h-3 w-3" />
                  )}
                  Probar Validación
                </Button>

                <Button
                  type="button"
                  variant="secondary"
                  size="sm"
                  onClick={handleAddCondition}
                  className="h-7 text-xs px-2.5 gap-1 cursor-pointer"
                >
                  <Plus className="h-3.5 w-3.5" /> Regla
                </Button>
              </div>
            </div>

            {/* Lista de Filas de Condiciones */}
            <div className="space-y-2">
              {validationRules.map((cond, idx) => {
                const isUnary = ["is_null", "is_not_null", "is_today"].includes(cond.operator);
                const colDef = availableColumns.find((c) => c.key === cond.column || c.label === cond.column);
                const colDataType = colDef?.data_type || "string";
                const operators =
                  cond.type === "row_count"
                    ? ROW_COUNT_OPERATORS
                    : OPERATORS_BY_DATA_TYPE[colDataType] || OPERATORS_BY_DATA_TYPE.string;

                return (
                  <div key={cond.id || idx} className="space-y-1.5">
                    {/* Operador lógico entre condiciones */}
                    {idx > 0 && (
                      <div className="flex items-center gap-2 my-1">
                        <div className="h-px bg-border flex-1" />
                        <div className="flex items-center bg-muted rounded-full p-0.5 border border-border">
                          <button
                            type="button"
                            onClick={() => handleUpdateCondition(idx, { logic_operator: "AND" })}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
                              cond.logic_operator === "AND"
                                ? "bg-primary text-primary-foreground shadow-xs"
                                : "text-muted-foreground hover:text-foreground"
                            }`}
                          >
                            Y (AND)
                          </button>
                          <button
                            type="button"
                            onClick={() => handleUpdateCondition(idx, { logic_operator: "OR" })}
                            className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold transition-all cursor-pointer ${
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

                    {/* Fila de campos */}
                    <div className="p-2.5 rounded-lg border border-border/70 bg-background flex flex-col sm:flex-row items-start sm:items-center gap-2 shadow-2xs">
                      {/* Tipo */}
                      <div className="w-full sm:w-36 shrink-0">
                        <Select
                          value={cond.type}
                          onValueChange={(val: ReportAlertConditionType) => {
                            const newOp = val === "row_count" ? ">" : "=";
                            handleUpdateCondition(idx, {
                              type: val,
                              operator: newOp,
                              column: val === "row_count" ? "" : cond.column || (availableColumns[0]?.key ?? ""),
                              value: val === "row_count" ? "0" : "",
                            });
                          }}
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="row_count">Cantidad de filas</SelectItem>
                            <SelectItem value="column_value">Valor de columna</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Columna (si es column_value) */}
                      {cond.type === "column_value" && (
                        <div className="w-full sm:w-44 shrink-0">
                          {availableColumns.length > 0 ? (
                            <Select
                              value={cond.column || ""}
                              onValueChange={(val) => handleUpdateCondition(idx, { column: val })}
                            >
                              <SelectTrigger className="h-8 text-xs font-mono">
                                <SelectValue placeholder="Columna..." />
                              </SelectTrigger>
                              <SelectContent>
                                {availableColumns.map((c) => (
                                  <SelectItem key={c.key} value={c.key} className="text-xs font-mono">
                                    {c.label || c.key}
                                  </SelectItem>
                                ))}
                              </SelectContent>
                            </Select>
                          ) : (
                            <Input
                              value={cond.column || ""}
                              onChange={(e) => handleUpdateCondition(idx, { column: e.target.value })}
                              placeholder="Nombre columna"
                              className="h-8 text-xs font-mono"
                            />
                          )}
                        </div>
                      )}

                      {/* Operador */}
                      <div className="w-full sm:w-44 shrink-0">
                        <Select
                          value={cond.operator}
                          onValueChange={(val: ReportAlertConditionOperator) =>
                            handleUpdateCondition(idx, { operator: val })
                          }
                        >
                          <SelectTrigger className="h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            {operators.map((op) => (
                              <SelectItem key={op.value} value={op.value} className="text-xs">
                                {op.label}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      {/* Valor objetivo */}
                      {!isUnary && (
                        <div className="flex-1 w-full min-w-[100px]">
                          <Input
                            value={cond.value}
                            onChange={(e) => handleUpdateCondition(idx, { value: e.target.value })}
                            placeholder={
                              cond.type === "row_count"
                                ? "ej: 0"
                                : "Valor esperado"
                            }
                            className="h-8 text-xs font-mono"
                          />
                        </div>
                      )}

                      {/* Botón Eliminar */}
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => handleRemoveCondition(idx)}
                        disabled={validationRules.length <= 1}
                        className="h-8 w-8 text-muted-foreground hover:text-destructive hover:bg-destructive/10 shrink-0 ml-auto cursor-pointer"
                        title="Eliminar regla"
                      >
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Banner de Resultado de la Prueba en Vivo (Dry-Run) */}
          {testResult && (
            <div
              className={`p-3 rounded-lg border text-xs transition-all ${
                testResult.passed
                  ? "bg-emerald-500/10 border-emerald-500/30 text-emerald-800 dark:text-emerald-300"
                  : "bg-amber-500/10 border-amber-500/30 text-amber-800 dark:text-amber-300"
              }`}
            >
              <div className="flex items-start gap-2">
                {testResult.passed ? (
                  <CheckCircle2 className="h-4 w-4 text-emerald-600 shrink-0 mt-0.5" />
                ) : (
                  <AlertTriangle className="h-4 w-4 text-amber-600 shrink-0 mt-0.5" />
                )}
                <div className="space-y-1 w-full">
                  <div className="font-semibold flex items-center justify-between">
                    <span>
                      {testResult.passed
                        ? "Validación Cumplida — El reporte se generaría y enviaría"
                        : "Validación No Cumplida — El reporte NO se generaría ni enviaría"}
                    </span>
                    {testResult.total_rows !== undefined && (
                      <span className="text-[10px] font-mono opacity-80">
                        {testResult.total_rows} filas analizadas
                      </span>
                    )}
                  </div>
                  {testResult.reason && (
                    <pre className="text-[11px] font-mono whitespace-pre-wrap opacity-90 pt-1">
                      {testResult.reason}
                    </pre>
                  )}
                  {testResult.error && (
                    <p className="text-[11px] font-mono text-destructive pt-1">
                      {testResult.error}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
