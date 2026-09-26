"use client";

import React, { useState, useEffect, useMemo } from "react";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ScheduleParameter } from "@/types/schedule-type";
import { inferParamType } from "../../utils/sql-param-utils";
import { getParameterOptionsService } from "../../services/report-service";
import SearchableSelect from "@/components/ui/searchable-select";
import {
  Calendar,
  Clock,
  Hash,
  ToggleLeft,
  Type as TypeIcon,
  Sparkles,
  Database,
  ListFilter,
} from "lucide-react";

const MACROS: { label: string; value: string }[] = [
  { label: "Ayer", value: "{{YESTERDAY}}" },
  { label: "Hoy", value: "{{TODAY}}" },
  { label: "Ahora", value: "{{NOW}}" },
  { label: "Inicio de mes", value: "{{START_OF_MONTH}}" },
  { label: "Fin de mes", value: "{{END_OF_MONTH}}" },
  { label: "Hace 7 días", value: "{{DATE:-7d}}" },
  { label: "Próximo mes", value: "{{DATE:+1m}}" },
  { label: "Año anterior", value: "{{DATE:-1y}}" },
];

export interface ScheduleParamDefinition {
  id?: number;
  param_name: string;
  data_type?: string;
  display_label?: string;
  input_type?: string;
  options_source?: "query" | "static" | null;
  static_options?: Array<{ value: string | number; label: string }> | null;
  source_query?: string | null;
  default_value?: string | null;
}

interface Props {
  reportId?: string | number;
  parameters?: ScheduleParamDefinition[];
  parameterNames?: string[];
  value: ScheduleParameter[];
  onChange: (params: ScheduleParameter[]) => void;
}

interface ParamOptionState {
  loading: boolean;
  options: Array<{ value: string | number; label: string }>;
  error?: string | null;
}

const getParamType = (
  param: ScheduleParamDefinition
): "select" | "date" | "datetime" | "number" | "boolean" | "text" => {
  const inp = (param.input_type || "").toLowerCase();
  const hasStatic =
    Array.isArray(param.static_options) && param.static_options.length > 0;

  if (
    inp === "select" ||
    param.options_source === "query" ||
    param.options_source === "static" ||
    hasStatic
  ) {
    return "select";
  }

  const t = (param.data_type || "").toLowerCase();
  if (inp === "boolean" || t.includes("bool")) return "boolean";
  if (inp === "date" || t === "date") return "date";
  if (inp === "datetime" || t.includes("date") || t.includes("time")) return "datetime";
  if (
    inp === "number" ||
    t.includes("num") ||
    t.includes("int") ||
    t.includes("float") ||
    t.includes("double") ||
    t.includes("decimal")
  )
    return "number";

  // Inferencia inteligente según nombre
  const inferred = inferParamType(param.param_name);
  if (inferred === "date") return "date";
  if (inferred === "datetime-local") return "datetime";
  if (inferred === "number") return "number";
  if (inferred === "boolean") return "boolean";
  return "text";
};

export const ScheduleParameters = ({
  reportId,
  parameters,
  parameterNames,
  value,
  onChange,
}: Props) => {
  const [paramOptions, setParamOptions] = useState<Record<string, ParamOptionState>>({});

  // Normalizar lista de parámetros combinando parameters y parameterNames
  const paramDefs: ScheduleParamDefinition[] = useMemo(() => {
    if (parameters && parameters.length > 0) {
      return parameters;
    }
    if (parameterNames && parameterNames.length > 0) {
      return parameterNames.map((name) => ({
        param_name: name,
        data_type: "string",
      }));
    }
    return [];
  }, [parameters, parameterNames]);

  const existingMap = useMemo(() => {
    return new Map(value.map((p) => [p.param_name, p.param_value]));
  }, [value]);

  const updateParam = (name: string, paramValue: string) => {
    const next = new Map(existingMap);
    next.set(name, paramValue);
    onChange(
      Array.from(next.entries()).map(([param_name, pv], index) => ({
        id: index,
        param_name,
        param_value: pv,
      }))
    );
  };

  /* eslint-disable react-hooks/set-state-in-effect */
  // Auto-inicializar parámetros booleanos en "true" si no tienen valor asignado
  useEffect(() => {
    let changed = false;
    const next = new Map(existingMap);
    paramDefs.forEach((param) => {
      const type = getParamType(param);
      if (type === "boolean" && !next.has(param.param_name)) {
        next.set(param.param_name, "true");
        changed = true;
      }
    });

    if (changed) {
      onChange(
        Array.from(next.entries()).map(([param_name, pv], index) => ({
          id: index,
          param_name,
          param_value: pv,
        }))
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [paramDefs]);

  // Carga de opciones para catálogos dinámicos (SQL) y estáticos
  useEffect(() => {
    const initialOptions: Record<string, ParamOptionState> = {};

    paramDefs.forEach((p) => {
      const name = p.param_name;
      const type = getParamType(p);

      if (type === "select") {
        if (p.options_source === "static" && Array.isArray(p.static_options)) {
          initialOptions[name] = {
            loading: false,
            options: p.static_options,
          };
        } else if (p.options_source === "query" || p.input_type === "select") {
          initialOptions[name] = {
            loading: true,
            options: [],
          };
        }
      }
    });

    setParamOptions(initialOptions);

    // Consultar el endpoint de opciones si hay parámetros con consulta SQL
    paramDefs.forEach(async (p) => {
      const name = p.param_name;
      const isQuery =
        p.options_source === "query" ||
        (p.input_type === "select" && p.options_source !== "static");

      if (isQuery && reportId && p.id) {
        try {
          const res = await getParameterOptionsService(reportId, p.id);
          const opts = res?.data ?? [];
          setParamOptions((prev) => ({
            ...prev,
            [name]: {
              loading: false,
              options: opts,
            },
          }));
        } catch (err: unknown) {
          const errorObj = err as { message?: string };
          setParamOptions((prev) => ({
            ...prev,
            [name]: {
              loading: false,
              options: [],
              error: errorObj?.message || "Error al cargar opciones del catálogo",
            },
          }));
        }
      }
    });
  }, [paramDefs, reportId]);
  /* eslint-enable react-hooks/set-state-in-effect */

  if (paramDefs.length === 0) {
    return (
      <p className="text-xs text-muted-foreground italic py-2">
        Este reporte no tiene parámetros detectados en su consulta SQL.
      </p>
    );
  }

  return (
    <div className="grid gap-3">
      {paramDefs.map((param, index) => {
        const name = param.param_name;
        const currentVal = existingMap.get(name) ?? "";
        const type = getParamType(param);
        const label = param.display_label || name;
        const isMacro =
          typeof currentVal === "string" &&
          currentVal.startsWith("{{") &&
          currentVal.endsWith("}}");

        const optState = paramOptions[name];

        return (
          <div
            key={`${name}-${index}`}
            className="rounded-lg border border-slate-200/90 bg-white p-3.5 space-y-2.5 shadow-xs"
          >
            <div className="flex items-center justify-between gap-2 flex-wrap">
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-slate-800">
                  {label}
                </span>
                <Badge variant="secondary" className="font-mono text-[10px]">
                  :{name}
                </Badge>
              </div>

              {/* Badge indicativo del tipo de parámetro */}
              <div>
                {type === "select" && param.options_source === "query" && (
                  <Badge className="bg-indigo-50 text-indigo-700 border-indigo-200 gap-1 font-sans text-[11px] font-medium">
                    <Database className="w-3 h-3 text-indigo-600" />
                    Catálogo Dinámico (SQL)
                  </Badge>
                )}
                {type === "select" && param.options_source !== "query" && (
                  <Badge className="bg-cyan-50 text-cyan-700 border-cyan-200 gap-1 font-sans text-[11px] font-medium">
                    <ListFilter className="w-3 h-3 text-cyan-600" />
                    Catálogo Estático
                  </Badge>
                )}
                {type === "date" && (
                  <Badge className="bg-blue-50 text-blue-700 border-blue-200 gap-1 font-sans text-[11px] font-medium">
                    <Calendar className="w-3 h-3 text-blue-600" />
                    Fecha
                  </Badge>
                )}
                {type === "datetime" && (
                  <Badge className="bg-purple-50 text-purple-700 border-purple-200 gap-1 font-sans text-[11px] font-medium">
                    <Clock className="w-3 h-3 text-purple-600" />
                    Fecha y Hora
                  </Badge>
                )}
                {type === "number" && (
                  <Badge className="bg-amber-50 text-amber-700 border-amber-200 gap-1 font-sans text-[11px] font-medium">
                    <Hash className="w-3 h-3 text-amber-600" />
                    Número
                  </Badge>
                )}
                {type === "boolean" && (
                  <Badge className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1 font-sans text-[11px] font-medium">
                    <ToggleLeft className="w-3 h-3 text-emerald-600" />
                    Booleano
                  </Badge>
                )}
                {type === "text" && (
                  <Badge className="bg-slate-100 text-slate-700 border-slate-200 gap-1 font-sans text-[11px] font-medium">
                    <TypeIcon className="w-3 h-3 text-slate-500" />
                    Texto
                  </Badge>
                )}
              </div>
            </div>

            {/* Input según el tipo de dato */}
            <div>
              {/* Caso Catálogo (Select con Buscador) */}
              {type === "select" && (
                <div className="space-y-1.5">
                  <SearchableSelect
                    options={(optState?.options ?? []).map((opt) => ({
                      value: String(opt.value),
                      label: opt.label,
                    }))}
                    value={currentVal}
                    onChange={(val) => updateParam(name, val)}
                    placeholder={
                      optState?.loading
                        ? "Cargando opciones del catálogo..."
                        : `Selecciona una opción para :${name}`
                    }
                    searchPlaceholder={`Buscar en catálogo :${name}...`}
                    emptyText={
                      optState?.loading
                        ? "Cargando opciones..."
                        : "Sin opciones disponibles en este catálogo."
                    }
                    isLoading={optState?.loading}
                    className="max-w-md"
                  />
                  {optState?.error && (
                    <p className="text-[11px] text-rose-500 font-medium">
                      {optState.error}
                    </p>
                  )}
                </div>
              )}

              {/* Caso Booleano */}
              {type === "boolean" && (
                <div className="flex items-center gap-2">
                  <Select
                    value={currentVal || "true"}
                    onValueChange={(val) => updateParam(name, val)}
                  >
                    <SelectTrigger className="w-64 text-xs h-9 bg-white">
                      <SelectValue placeholder="Selecciona valor" />
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
                </div>
              )}

              {/* Caso Fecha */}
              {type === "date" && (
                <div className="space-y-2">
                  <div className="flex flex-wrap items-center gap-2">
                    {isMacro ? (
                      <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                        <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-blue-200 bg-blue-50/70 text-blue-900 text-xs font-mono font-medium flex-1 h-9">
                          <Sparkles className="w-3.5 h-3.5 text-blue-600 shrink-0" />
                          <span className="truncate">Macro: {currentVal}</span>
                          <span className="text-blue-600/80 font-sans text-[11px] ml-auto">
                            {MACROS.find((m) => m.value === currentVal)?.label}
                          </span>
                        </div>
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          onClick={() =>
                            updateParam(
                              name,
                              new Date().toISOString().slice(0, 10)
                            )
                          }
                          className="text-xs h-9 cursor-pointer"
                        >
                          Fecha fija
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                        <Input
                          type="date"
                          value={currentVal || ""}
                          onChange={(e) => updateParam(name, e.target.value)}
                          className="flex-1 font-mono text-xs h-9 bg-white"
                        />
                        <div className="flex items-center gap-1 shrink-0">
                          <button
                            type="button"
                            onClick={() =>
                              updateParam(
                                name,
                                new Date().toISOString().slice(0, 10)
                              )
                            }
                            className="text-[11px] text-primary hover:underline font-medium cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-100"
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
                              updateParam(name, firstDay);
                            }}
                            className="text-[11px] text-slate-500 hover:text-slate-800 cursor-pointer px-1.5 py-0.5 rounded hover:bg-slate-100"
                          >
                            1° mes
                          </button>
                        </div>
                      </div>
                    )}

                    <Select onValueChange={(m) => updateParam(name, m)}>
                      <SelectTrigger className="w-48 text-xs h-9 bg-white">
                        <SelectValue placeholder="Macro dinámica..." />
                      </SelectTrigger>
                      <SelectContent>
                        {MACROS.map((macro) => (
                          <SelectItem
                            key={macro.value}
                            value={macro.value}
                            className="text-xs"
                          >
                            {macro.label} ({macro.value})
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              )}

              {/* Caso Fecha y Hora */}
              {type === "datetime" && (
                <div className="flex flex-wrap items-center gap-2">
                  {isMacro ? (
                    <div className="flex items-center gap-2 flex-1 min-w-[240px]">
                      <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-md border border-purple-200 bg-purple-50/70 text-purple-900 text-xs font-mono font-medium flex-1 h-9">
                        <Sparkles className="w-3.5 h-3.5 text-purple-600 shrink-0" />
                        <span className="truncate">Macro: {currentVal}</span>
                        <span className="text-purple-600/80 font-sans text-[11px] ml-auto">
                          {MACROS.find((m) => m.value === currentVal)?.label}
                        </span>
                      </div>
                      <Button
                        type="button"
                        variant="outline"
                        size="sm"
                        onClick={() =>
                          updateParam(
                            name,
                            new Date().toISOString().slice(0, 16)
                          )
                        }
                        className="text-xs h-9 cursor-pointer"
                      >
                        Fecha fija
                      </Button>
                    </div>
                  ) : (
                    <div className="flex items-center gap-2 flex-1 min-w-[200px]">
                      <Input
                        type="datetime-local"
                        value={currentVal || ""}
                        onChange={(e) => updateParam(name, e.target.value)}
                        className="flex-1 font-mono text-xs h-9 bg-white"
                      />
                    </div>
                  )}

                  <Select onValueChange={(m) => updateParam(name, m)}>
                    <SelectTrigger className="w-48 text-xs h-9 bg-white">
                      <SelectValue placeholder="Macro dinámica..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MACROS.map((macro) => (
                        <SelectItem
                          key={macro.value}
                          value={macro.value}
                          className="text-xs"
                        >
                          {macro.label} ({macro.value})
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Caso Número */}
              {type === "number" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="number"
                    step="any"
                    value={currentVal}
                    onChange={(e) => updateParam(name, e.target.value)}
                    placeholder={`Número para :${name} (ej. 100)`}
                    className="flex-1 min-w-[180px] font-mono text-xs h-9 bg-white"
                  />
                  <Select onValueChange={(m) => updateParam(name, m)}>
                    <SelectTrigger className="w-44 text-xs h-9 bg-white">
                      <SelectValue placeholder="Macro opcional..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MACROS.map((macro) => (
                        <SelectItem
                          key={macro.value}
                          value={macro.value}
                          className="text-xs"
                        >
                          {macro.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Caso Texto / Default */}
              {type === "text" && (
                <div className="flex flex-wrap items-center gap-2">
                  <Input
                    type="text"
                    value={currentVal}
                    onChange={(e) => updateParam(name, e.target.value)}
                    placeholder={`Valor para :${name} o usa una macro`}
                    className="flex-1 min-w-[200px] text-xs h-9 bg-white"
                  />
                  <Select onValueChange={(m) => updateParam(name, m)}>
                    <SelectTrigger className="w-44 text-xs h-9 bg-white">
                      <SelectValue placeholder="Macro..." />
                    </SelectTrigger>
                    <SelectContent>
                      {MACROS.map((macro) => (
                        <SelectItem
                          key={macro.value}
                          value={macro.value}
                          className="text-xs"
                        >
                          {macro.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default ScheduleParameters;
