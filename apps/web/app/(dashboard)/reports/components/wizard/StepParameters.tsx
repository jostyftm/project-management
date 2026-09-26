"use client";
import React, { useEffect, useState } from "react";
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
import { useReportWizardStore } from "@/hooks/zustand/use-report-wizard-store";
import { Report, ReportParameterOption, ReportParameterSyncItem, ParameterInputType, ParameterOptionsSource } from "@/types/report-type";
import {
  getReportParametersService,
  syncReportParametersService,
  testParameterQueryService,
} from "../../services/report-service";
import { extractSqlParameters, inferParamType } from "../../utils/sql-param-utils";
import { toast } from "sonner";
import { SqlEditor } from "@/components/ui/sql-editor";
import { useListConnections } from "../../../setting/connections/hooks/use-list-connections";
import { useSchema } from "@/hooks/use-schema";
import {
  SlidersHorizontal,
  Database,
  ListFilter,
  CheckCircle2,
  AlertCircle,
  Play,
  Plus,
  Trash2,
  ArrowLeft,
  ArrowRight,
  Save,
  Loader2,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface Props {
  report?: Report | null;
}

interface LocalParamState {
  id?: number;
  param_name: string;
  data_type: string;
  display_label: string;
  input_type: ParameterInputType;
  options_source: ParameterOptionsSource;
  source_query: string;
  static_options: ReportParameterOption[];
  default_value: string;
  // UI test query state
  isTestingQuery?: boolean;
  testQuerySuccess?: boolean;
  testQueryError?: string | null;
  testQueryResults?: ReportParameterOption[];
}

export const StepParameters = ({ report }: Props) => {
  const reportId = useReportWizardStore((s) => s.reportId);
  const sqlQuery = useReportWizardStore((s) => s.sqlQuery);
  const storeConnectionId = useReportWizardStore((s) => s.connectionId);
  const connectionId =
    storeConnectionId ?? report?.relationships?.connection_id ?? null;
  const setStep = useReportWizardStore((s) => s.setStep);
  const discardedParameters = useReportWizardStore((s) => s.discardedParameters);

  const { data: connections } = useListConnections({
    params: { params: { paginate: false } },
  });
  const connection = connections?.find((c) => c.id === connectionId);
  const driverCode =
    connection?.relationships?.driver?.laravel_driver ?? "mysql";
  const driverLabel =
    connection?.relationships?.driver?.name ?? connection?.attributes?.name ?? null;

  const { schema, isLoading: isLoadingSchema } = useSchema(connectionId);

  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [isSaving, setIsSaving] = useState<boolean>(false);
  const [parameters, setParameters] = useState<LocalParamState[]>([]);

  // Inicializar y sincronizar parámetros desde el reporte y la consulta SQL
  useEffect(() => {
    const loadParams = async () => {
      setIsLoading(true);
      try {
        const detectedNames = extractSqlParameters(sqlQuery);
        let existingParams: any[] = [];

        if (reportId) {
          try {
            const res = await getReportParametersService(reportId);
            if (res?.data) {
              existingParams = res.data;
            }
          } catch (e) {
            console.error("Error al cargar parámetros existentes:", e);
          }
        }

        if (existingParams.length === 0 && report?.relationships?.parameters) {
          existingParams = report.relationships.parameters;
        }

        const existingMap = new Map<string, any>();
        existingParams.forEach((p) => {
          const name = p.attributes?.param_name ?? p.param_name;
          if (name) {
            existingMap.set(name, p);
          }
        });

        // Combinar parámetros detectados con existentes, excluyendo los descartados
        const paramNamesToUse = Array.from(
          new Set([...detectedNames, ...Array.from(existingMap.keys())])
        ).filter((name) => !discardedParameters.includes(name));

        const initialList: LocalParamState[] = paramNamesToUse.map((name) => {
          const existing = existingMap.get(name);
          const attr = existing?.attributes ?? existing ?? {};

          const inferred = inferParamType(name);
          let defaultInputType: ParameterInputType = "text";
          if (inferred === "date") defaultInputType = "date";
          else if (inferred === "datetime-local") defaultInputType = "datetime";
          else if (inferred === "number") defaultInputType = "number";
          else if (inferred === "boolean") defaultInputType = "boolean";

          const friendlyLabel = name
            .replace(/_/g, " ")
            .replace(/\b\w/g, (l) => l.toUpperCase());

          return {
            id: existing?.id ? Number(existing.id) : undefined,
            param_name: name,
            data_type: attr.data_type ?? (inferred === "number" ? "number" : "string"),
            display_label: attr.display_label || friendlyLabel,
            input_type: (attr.input_type as ParameterInputType) || defaultInputType,
            options_source: (attr.options_source as ParameterOptionsSource) || null,
            source_query: attr.source_query || "",
            static_options: Array.isArray(attr.static_options) ? attr.static_options : [],
            default_value: attr.default_value || "",
          };
        });

        setParameters(initialList);
      } finally {
        setIsLoading(false);
      }
    };

    loadParams();
  }, [reportId, sqlQuery, report, discardedParameters]);

  const updateParam = (index: number, updates: Partial<LocalParamState>) => {
    setParameters((prev) => {
      const copy = [...prev];
      copy[index] = { ...copy[index], ...updates };
      return copy;
    });
  };

  const handleTestQuery = async (index: number) => {
    const param = parameters[index];
    if (!connectionId) {
      toast.error("No hay una conexión de base de datos asociada al reporte.");
      return;
    }
    if (!param.source_query.trim()) {
      toast.error("Ingresa una consulta SQL para el catálogo.");
      return;
    }

    updateParam(index, {
      isTestingQuery: true,
      testQueryError: null,
      testQuerySuccess: false,
    });

    try {
      const res = await testParameterQueryService(
        connectionId,
        param.source_query
      );
      const options = res?.data ?? [];
      updateParam(index, {
        isTestingQuery: false,
        testQuerySuccess: true,
        testQueryResults: options,
        testQueryError: null,
      });
      toast.success(
        `Catálogo probado exitosamente: ${options.length} opciones obtenidas.`
      );
    } catch (err: any) {
      updateParam(index, {
        isTestingQuery: false,
        testQuerySuccess: false,
        testQueryError:
          err?.response?.data?.message ||
          err?.message ||
          "Error al ejecutar la consulta del catálogo.",
      });
      toast.error("Falló la consulta del catálogo.");
    }
  };

  const handleAddStaticOption = (index: number) => {
    const current = parameters[index].static_options || [];
    const nextOptions = [...current, { value: "", label: "" }];
    updateParam(index, { static_options: nextOptions });
  };

  const handleUpdateStaticOption = (
    paramIndex: number,
    optIndex: number,
    field: "value" | "label",
    value: string
  ) => {
    const current = [...(parameters[paramIndex].static_options || [])];
    current[optIndex] = { ...current[optIndex], [field]: value };
    updateParam(paramIndex, { static_options: current });
  };

  const handleRemoveStaticOption = (paramIndex: number, optIndex: number) => {
    const current = [...(parameters[paramIndex].static_options || [])];
    current.splice(optIndex, 1);
    updateParam(paramIndex, { static_options: current });
  };

  const handleSaveAndContinue = async () => {
    if (!reportId) {
      setStep("headers");
      return;
    }

    if (parameters.length === 0) {
      setStep("headers");
      return;
    }

    setIsSaving(true);
    try {
      const payload: ReportParameterSyncItem[] = parameters.map((p) => ({
        id: p.id,
        param_name: p.param_name,
        data_type: p.data_type,
        display_label: p.display_label,
        input_type: p.input_type,
        options_source: p.input_type === "select" ? p.options_source : null,
        source_query:
          p.input_type === "select" && p.options_source === "query"
            ? p.source_query
            : null,
        static_options:
          p.input_type === "select" && p.options_source === "static"
            ? p.static_options.filter((o) => o.value !== "" || o.label !== "")
            : null,
        default_value: p.default_value || null,
      }));

      await syncReportParametersService(reportId, payload);
      toast.success("Configuración de parámetros guardada con éxito.");
      setStep("headers");
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message ||
          "Error al guardar los parámetros del reporte."
      );
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="py-12 flex flex-col items-center justify-center gap-3 text-slate-500">
        <Loader2 className="w-6 h-6 animate-spin text-primary" />
        <span className="text-sm">Analizando parámetros de la consulta...</span>
      </div>
    );
  }

  // Estado si no hay parámetros en el reporte
  if (parameters.length === 0) {
    return (
      <div className="space-y-6">
        <div className="p-8 rounded-xl border border-slate-200 bg-slate-50/50 text-center flex flex-col items-center justify-center max-w-lg mx-auto">
          <div className="w-12 h-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mb-3">
            <CheckCircle2 className="w-6 h-6" />
          </div>
          <h3 className="text-base font-bold text-slate-800 mb-1">
            Consulta sin parámetros dinámicos
          </h3>
          <p className="text-xs text-slate-500 max-w-sm mb-6">
            La consulta SQL no incluye variables de sustitución (
            <code className="text-primary font-mono">{"{{nombre}}"}</code>). No
            es necesario configurar catálogos desplegables. Puedes continuar
            directamente al mapeo de encabezados.
          </p>
          <Button
            type="button"
            onClick={() => setStep("headers")}
            className="gap-2 cursor-pointer font-medium"
          >
            <span>Continuar a Encabezados</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>

        <div className="flex justify-between items-center pt-2">
          <Button
            variant="outline"
            type="button"
            onClick={() => setStep("sql")}
            className="gap-2 cursor-pointer"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Atrás</span>
          </Button>
          <Button
            type="button"
            onClick={() => setStep("headers")}
            className="gap-2 cursor-pointer"
          >
            <span>Continuar</span>
            <ArrowRight className="w-4 h-4" />
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div>
          <h3 className="text-base font-bold text-slate-900 flex items-center gap-2">
            <SlidersHorizontal className="w-4 h-4 text-primary" />
            <span>Configuración de Parámetros y Catálogos</span>
          </h3>
          <p className="text-xs text-slate-500 mt-0.5">
            Personaliza cómo el usuario final verá e interactuará con cada parámetro
            en <strong>Mis Reportes</strong> (texto, fechas, o listas desplegables SQL).
          </p>
        </div>
        <Badge variant="outline" className="font-mono text-xs px-2.5 py-1">
          {parameters.length} {parameters.length === 1 ? "parámetro" : "parámetros"} detectados
        </Badge>
      </div>

      <div className="space-y-4">
        {parameters.map((param, index) => (
          <div
            key={param.param_name}
            className="p-4 rounded-xl border border-slate-200/90 bg-white shadow-xs space-y-4"
          >
            {/* Cabecera del Parámetro */}
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-100 pb-3">
              <div className="flex items-center gap-2">
                <Badge
                  variant="secondary"
                  className="font-mono text-xs font-bold bg-primary/10 text-primary border border-primary/20"
                >
                  {`{{${param.param_name}}}`}
                </Badge>
                <span className="text-xs text-slate-400">|</span>
                <span className="text-xs text-slate-600 font-medium">
                  Tipo SQL inferido: <strong className="font-mono">{param.data_type}</strong>
                </span>
              </div>

              {/* Selector de Tipo de Entrada */}
              <div className="flex items-center gap-2">
                <Label
                  htmlFor={`type-${index}`}
                  className="text-xs font-semibold text-slate-700"
                >
                  Tipo de Entrada:
                </Label>
                <Select
                  value={param.input_type}
                  onValueChange={(val: ParameterInputType) =>
                    updateParam(index, {
                      input_type: val,
                      options_source:
                        val === "select" ? param.options_source || "query" : null,
                    })
                  }
                >
                  <SelectTrigger
                    id={`type-${index}`}
                    className="h-8 w-44 text-xs bg-slate-50 border-slate-200"
                  >
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="text" className="text-xs">
                      Texto libre
                    </SelectItem>
                    <SelectItem value="number" className="text-xs">
                      Número
                    </SelectItem>
                    <SelectItem value="date" className="text-xs">
                      Fecha (selector)
                    </SelectItem>
                    <SelectItem value="datetime" className="text-xs">
                      Fecha y Hora
                    </SelectItem>
                    <SelectItem value="boolean" className="text-xs">
                      Booleano (Sí/No)
                    </SelectItem>
                    <SelectItem
                      value="select"
                      className="text-xs font-semibold text-primary"
                    >
                      Desplegable / Catálogo
                    </SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Fila con Etiqueta Visible y Valor por Defecto */}
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">
                  Etiqueta Visible (nombre amigable)
                </Label>
                <Input
                  value={param.display_label}
                  onChange={(e) =>
                    updateParam(index, { display_label: e.target.value })
                  }
                  placeholder="Ej: Departamento de Origen"
                  className="h-8 text-xs bg-white"
                />
              </div>

              <div className="space-y-1">
                <Label className="text-xs font-medium text-slate-700">
                  Valor por Defecto (opcional)
                </Label>
                <Input
                  value={param.default_value}
                  onChange={(e) =>
                    updateParam(index, { default_value: e.target.value })
                  }
                  placeholder="Ej: 1 o activo"
                  className="h-8 text-xs bg-white"
                />
              </div>
            </div>

            {/* Configuración especial si es Tipo 'select' */}
            {param.input_type === "select" && (
              <div className="p-3.5 rounded-lg bg-slate-50 border border-slate-200/90 space-y-3">
                <div className="flex flex-wrap items-center justify-between gap-2 border-b border-slate-200/60 pb-2">
                  <div className="flex items-center gap-1.5 text-xs font-bold text-slate-800">
                    <ListFilter className="w-3.5 h-3.5 text-primary" />
                    <span>Origen de las Opciones del Desplegable</span>
                  </div>

                  <div className="flex items-center gap-1">
                    <button
                      type="button"
                      onClick={() =>
                        updateParam(index, { options_source: "query" })
                      }
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer border",
                        param.options_source === "query"
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      Consulta SQL Dinámica
                    </button>
                    <button
                      type="button"
                      onClick={() =>
                        updateParam(index, { options_source: "static" })
                      }
                      className={cn(
                        "px-2.5 py-1 text-xs rounded-md font-medium transition-all cursor-pointer border",
                        param.options_source === "static"
                          ? "bg-primary text-white border-primary shadow-xs"
                          : "bg-white text-slate-600 border-slate-200 hover:bg-slate-100"
                      )}
                    >
                      Lista Estática Manual
                    </button>
                  </div>
                </div>

                {/* Subsección: Consulta SQL Dinámica */}
                {param.options_source === "query" && (
                  <div className="space-y-2.5 pt-1">
                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <Label className="text-xs text-slate-700 font-semibold flex items-center gap-1.5">
                        <Database className="w-3.5 h-3.5 text-primary" />
                        <span>Consulta SQL para llenar el desplegable</span>
                      </Label>
                      <div className="flex items-center gap-2">
                        <span className="text-[11px] text-slate-500">
                          Debe retornar las columnas <code className="font-mono text-primary font-semibold">value</code> y <code className="font-mono text-primary font-semibold">label</code>
                        </span>
                        {driverLabel && (
                          <Badge variant="outline" className="text-[10px] font-mono py-0 h-5 text-slate-600">
                            {driverLabel}
                          </Badge>
                        )}
                      </div>
                    </div>

                    <div className="border rounded-lg overflow-hidden bg-slate-950">
                      <SqlEditor
                        value={param.source_query}
                        onChange={(newSql) => {
                          updateParam(index, {
                            source_query: newSql,
                            testQueryError: null,
                          });
                        }}
                        dialect={driverCode}
                        tables={schema?.tables ?? []}
                        placeholder="SELECT id AS value, name AS label FROM helpdesk.area_departments ORDER BY name ASC"
                        minHeight="95px"
                        invalid={!!param.testQueryError}
                        className="text-xs font-mono"
                      />
                    </div>

                    <div className="flex flex-wrap items-center justify-between gap-2">
                      <p className="text-[11px] text-slate-500">
                        {isLoadingSchema ? (
                          <span className="inline-flex items-center gap-1">
                            <Loader2 className="w-3 h-3 animate-spin text-primary" /> Cargando autocompletado del esquema...
                          </span>
                        ) : (
                          "Escribe o presiona Ctrl+Espacio para autocompletar tablas y columnas del esquema."
                        )}
                      </p>

                      <Button
                        type="button"
                        variant="secondary"
                        size="sm"
                        onClick={() => handleTestQuery(index)}
                        disabled={param.isTestingQuery || !param.source_query.trim()}
                        className="h-8 gap-1.5 text-xs cursor-pointer font-medium"
                      >
                        {param.isTestingQuery ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                          <Play className="w-3.5 h-3.5 text-primary" />
                        )}
                        <span>{param.isTestingQuery ? "Probando..." : "Probar consulta"}</span>
                      </Button>
                    </div>

                    {/* Feedback del Test de Consulta */}
                    {param.testQueryError && (
                      <div className="p-2.5 rounded-md bg-rose-50 border border-rose-200 text-rose-700 text-xs flex items-start gap-2">
                        <AlertCircle className="w-4 h-4 text-rose-500 shrink-0 mt-0.5" />
                        <div className="space-y-0.5">
                          <p className="font-semibold">Error al ejecutar la consulta del catálogo:</p>
                          <p className="font-mono text-[11px] leading-relaxed">{param.testQueryError}</p>
                        </div>
                      </div>
                    )}

                    {param.testQuerySuccess && param.testQueryResults && (
                      <div className="p-2.5 rounded-md bg-emerald-50 border border-emerald-200 text-emerald-800 text-xs space-y-1.5">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-1.5 font-semibold text-emerald-900">
                            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
                            <span>
                              {param.testQueryResults.length} opciones obtenidas correctamente:
                            </span>
                          </div>
                          <span className="text-[10px] text-emerald-700">
                            Mostrando primeras {Math.min(param.testQueryResults.length, 15)}
                          </span>
                        </div>
                        <div className="flex flex-wrap gap-1.5 max-h-28 overflow-y-auto p-1.5 bg-white/80 rounded border border-emerald-100">
                          {param.testQueryResults.slice(0, 15).map((opt, oIdx) => (
                            <Badge
                              key={oIdx}
                              variant="outline"
                              className="text-[11px] bg-white border-emerald-300 text-slate-700 font-sans"
                            >
                              <strong className="text-emerald-700 mr-1 font-mono">
                                {String(opt.value)}:
                              </strong>
                              {opt.label}
                            </Badge>
                          ))}
                          {param.testQueryResults.length > 15 && (
                            <span className="text-[11px] text-slate-500 italic self-center">
                              (+{param.testQueryResults.length - 15} más...)
                            </span>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                )}

                {/* Subsección: Lista Estática Manual */}
                {param.options_source === "static" && (
                  <div className="space-y-2 pt-1">
                    <div className="flex items-center justify-between">
                      <Label className="text-xs text-slate-700 font-medium">
                        Opciones fijas del desplegable:
                      </Label>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() => handleAddStaticOption(index)}
                        className="h-7 text-xs gap-1 cursor-pointer bg-white"
                      >
                        <Plus className="w-3 h-3" />
                        <span>Añadir opción</span>
                      </Button>
                    </div>

                    <div className="space-y-1.5">
                      {param.static_options.map((opt, optIndex) => (
                        <div
                          key={optIndex}
                          className="flex items-center gap-2"
                        >
                          <Input
                            placeholder="Valor (ej: completed)"
                            value={opt.value}
                            onChange={(e) =>
                              handleUpdateStaticOption(
                                index,
                                optIndex,
                                "value",
                                e.target.value
                              )
                            }
                            className="h-8 text-xs font-mono bg-white flex-1"
                          />
                          <Input
                            placeholder="Etiqueta (ej: Completado)"
                            value={opt.label}
                            onChange={(e) =>
                              handleUpdateStaticOption(
                                index,
                                optIndex,
                                "label",
                                e.target.value
                              )
                            }
                            className="h-8 text-xs bg-white flex-1"
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="icon"
                            onClick={() =>
                              handleRemoveStaticOption(index, optIndex)
                            }
                            className="h-8 w-8 text-slate-400 hover:text-rose-600 hover:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="w-3.5 h-3.5" />
                          </Button>
                        </div>
                      ))}

                      {param.static_options.length === 0 && (
                        <div className="text-center py-3 text-xs text-slate-400 italic bg-white rounded border border-dashed border-slate-200">
                          Presiona &quot;Añadir opción&quot; para definir las opciones del selector.
                        </div>
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Navegación del Paso */}
      <div className="flex gap-2 justify-between items-center pt-2">
        <Button
          variant="outline"
          type="button"
          onClick={() => setStep("sql")}
          className="gap-2 cursor-pointer"
        >
          <ArrowLeft className="w-4 h-4" />
          <span>Atrás</span>
        </Button>

        <Button
          type="button"
          onClick={handleSaveAndContinue}
          disabled={isSaving}
          className="gap-2 cursor-pointer font-semibold"
        >
          {isSaving ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              <span>Guardando...</span>
            </>
          ) : (
            <>
              <Save className="w-4 h-4" />
              <span>Guardar y continuar</span>
            </>
          )}
        </Button>
      </div>
    </div>
  );
};
