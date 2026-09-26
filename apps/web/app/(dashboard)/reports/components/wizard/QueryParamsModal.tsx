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
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import BaseIcon from "@/components/ui/base-icon";
import { DetectedParam, QueryParamType } from "../../types/query-execute-type";
import { getDefaultParamValue } from "../../utils/sql-param-utils";

interface Props {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  initialParams: DetectedParam[];
  onExecute: (
    values: Record<string, unknown>,
    updatedParams: DetectedParam[]
  ) => void;
  isLoading?: boolean;
}

const PARAM_TYPE_OPTIONS: { label: string; value: QueryParamType }[] = [
  { label: "Fecha", value: "date" },
  { label: "Fecha y hora", value: "datetime-local" },
  { label: "Número", value: "number" },
  { label: "Texto", value: "text" },
  { label: "Booleano", value: "boolean" },
];

export const QueryParamsModal = ({
  open,
  onOpenChange,
  initialParams,
  onExecute,
  isLoading = false,
}: Props) => {
  const [params, setParams] = useState<DetectedParam[]>(initialParams);

  useEffect(() => {
    setParams(initialParams);
  }, [initialParams, open]);

  const handleTypeChange = (index: number, newType: QueryParamType) => {
    setParams((prev) => {
      const copy = [...prev];
      const current = copy[index];
      copy[index] = {
        ...current,
        type: newType,
        value: current.value || getDefaultParamValue(newType),
      };
      return copy;
    });
  };

  const handleValueChange = (index: number, newValue: string) => {
    setParams((prev) => {
      const copy = [...prev];
      copy[index] = {
        ...copy[index],
        value: newValue,
      };
      return copy;
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    const valuesMap: Record<string, unknown> = {};

    params.forEach((p) => {
      if (p.type === "number") {
        const num = Number(p.value);
        valuesMap[p.name] = isNaN(num) ? p.value : num;
      } else if (p.type === "boolean") {
        valuesMap[p.name] = p.value === "true";
      } else {
        valuesMap[p.name] = p.value;
      }
    });

    onExecute(valuesMap, params);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-lg max-h-[85vh] flex flex-col">
        <DialogHeader>
          <div className="flex items-center gap-2 text-primary text-xs font-semibold">
            <span className="inline-block w-1.5 h-1.5 rounded-full bg-primary" />
            <span>Previsualización en caliente</span>
          </div>
          <DialogTitle className="flex items-center gap-2 text-base font-bold">
            <BaseIcon name="Variable" size={18} className="text-primary" />
            Valores de prueba para la consulta
          </DialogTitle>
          <DialogDescription className="text-xs text-slate-500">
            Ingresa valores temporales de prueba para verificar los resultados de la consulta en este editor.
          </DialogDescription>
        </DialogHeader>

        <div className="p-3 rounded-lg bg-blue-50/90 border border-blue-200/80 text-xs text-blue-900 flex items-start gap-2.5">
          <BaseIcon name="Info" size={16} className="text-blue-600 shrink-0 mt-0.5" />
          <div className="space-y-0.5">
            <p className="font-semibold text-blue-950">
              ¿Deseas configurar desplegables y catálogos SQL?
            </p>
            <p className="text-blue-800/90 text-[11px] leading-relaxed">
              Estos valores son únicamente para probar la consulta aquí en el editor. En el <strong>Paso 3 (Parámetros y Catálogos)</strong> podrás definir las etiquetas amigables y convertir los parámetros en <strong>Desplegables / Catálogos SQL</strong> vinculados a tablas de la base de datos.
            </p>
          </div>
        </div>

        <form
          onSubmit={handleSubmit}
          className="flex-1 flex flex-col overflow-hidden"
        >
          <div className="flex-1 overflow-y-auto pr-1 py-3 space-y-3">
            {params.map((param, index) => (
              <div
                key={param.name}
                className="rounded-lg border p-3 bg-muted/20 space-y-2"
              >
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-2">
                    <Badge variant="secondary" className="font-mono text-xs font-semibold">
                      {`{{${param.name}}}`}
                    </Badge>
                    <span className="text-xs text-muted-foreground">
                      ({param.type})
                    </span>
                  </div>

                  {/* Selector para cambiar la naturaleza del campo si lo desea */}
                  <Select
                    value={param.type}
                    onValueChange={(val: QueryParamType) =>
                      handleTypeChange(index, val)
                    }
                  >
                    <SelectTrigger className="h-7 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {PARAM_TYPE_OPTIONS.map((opt) => (
                        <SelectItem
                          key={opt.value}
                          value={opt.value}
                          className="text-xs"
                        >
                          {opt.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-1">
                  <Label className="text-xs text-muted-foreground">Valor</Label>
                  {param.type === "date" && (
                    <Input
                      type="date"
                      value={param.value}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                      className="h-9 font-mono text-sm bg-background"
                      required
                    />
                  )}

                  {param.type === "datetime-local" && (
                    <Input
                      type="datetime-local"
                      value={param.value}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                      className="h-9 font-mono text-sm bg-background"
                      required
                    />
                  )}

                  {param.type === "number" && (
                    <Input
                      type="number"
                      step="any"
                      placeholder="Ej: 100"
                      value={param.value}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                      className="h-9 font-mono text-sm bg-background"
                      required
                    />
                  )}

                  {param.type === "boolean" && (
                    <Select
                      value={param.value}
                      onValueChange={(val) => handleValueChange(index, val)}
                    >
                      <SelectTrigger className="h-9 bg-background">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="true">Verdadero (true / 1)</SelectItem>
                        <SelectItem value="false">Falso (false / 0)</SelectItem>
                      </SelectContent>
                    </Select>
                  )}

                  {param.type === "text" && (
                    <Input
                      type="text"
                      placeholder="Valor del texto..."
                      value={param.value}
                      onChange={(e) => handleValueChange(index, e.target.value)}
                      className="h-9 font-mono text-sm bg-background"
                    />
                  )}
                </div>
              </div>
            ))}
          </div>

          <DialogFooter className="pt-3 border-t flex gap-2 sm:justify-end">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancelar
            </Button>
            <Button type="submit" disabled={isLoading} className="gap-2">
              <BaseIcon
                name={isLoading ? "Loader" : "Play"}
                size={15}
                className={isLoading ? "animate-spin" : ""}
              />
              {isLoading ? "Ejecutando..." : "Ejecutar consulta"}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
};
