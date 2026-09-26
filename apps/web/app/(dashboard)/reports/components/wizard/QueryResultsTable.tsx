"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import BaseIcon from "@/components/ui/base-icon";
import { QueryExecutionResult } from "../../types/query-execute-type";

interface Props {
  result: QueryExecutionResult | null;
  errorMessage: string | null;
  isLoading: boolean;
  onClear: () => void;
  onReopenParams?: () => void;
  hasParams?: boolean;
}

export const QueryResultsTable = ({
  result,
  errorMessage,
  isLoading,
  onClear,
  onReopenParams,
  hasParams = false,
}: Props) => {
  if (!isLoading && !result && !errorMessage) {
    return null;
  }

  return (
    <div className="rounded-lg border bg-card text-card-foreground shadow-sm overflow-hidden mt-4">
      {/* Estado: Cargando */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center p-8 text-center space-y-2">
          <BaseIcon
            name="Loader"
            size={24}
            className="animate-spin text-primary"
          />
          <p className="text-sm font-medium">
            Ejecutando consulta en la base de datos...
          </p>
          <p className="text-xs text-muted-foreground">
            Obteniendo muestra de resultados en caliente
          </p>
        </div>
      )}

      {/* Estado: Error */}
      {!isLoading && errorMessage && (
        <div className="p-4 bg-destructive/10 border-destructive/20 border-b space-y-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2 text-destructive font-semibold text-sm">
              <BaseIcon name="AlertCircle" size={16} />
              Error en la ejecución de la consulta
            </div>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClear}
              className="h-7 w-7 text-muted-foreground hover:text-foreground"
            >
              <BaseIcon name="X" size={14} />
            </Button>
          </div>
          <pre className="text-xs font-mono bg-background/80 p-3 rounded border text-destructive overflow-x-auto whitespace-pre-wrap">
            {errorMessage}
          </pre>
          {hasParams && onReopenParams && (
            <Button
              variant="outline"
              size="sm"
              onClick={onReopenParams}
              className="text-xs gap-1.5 mt-2"
            >
              <BaseIcon name="SlidersHorizontal" size={13} />
              Ajustar parámetros de consulta
            </Button>
          )}
        </div>
      )}

      {/* Estado: Éxito */}
      {!isLoading && result && (
        <div className="flex flex-col">
          {/* Barra de cabecera de resultados */}
          <div className="flex flex-wrap items-center justify-between gap-2 p-3 bg-muted/40 border-b">
            <div className="flex items-center gap-2">
              <BaseIcon
                name="CheckCircle2"
                size={16}
                className="text-emerald-600 dark:text-emerald-400"
              />
              <span className="text-xs font-medium">
                Vista previa:{" "}
                <strong className="font-semibold">{result.row_count}</strong>{" "}
                {result.row_count === 1 ? "fila devuelta" : "filas devueltas"}
                <span className="text-muted-foreground font-normal text-[11px] ml-1">
                  (muestra máx. 50)
                </span>
              </span>
            </div>

            <div className="flex items-center gap-2">
              <Badge variant="secondary" className="text-[11px] font-mono gap-1">
                <BaseIcon name="Timer" size={12} />
                {result.execution_time_ms} ms
              </Badge>

              {hasParams && onReopenParams && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={onReopenParams}
                  className="h-7 text-xs gap-1.5"
                >
                  <BaseIcon name="SlidersHorizontal" size={12} />
                  Parámetros
                </Button>
              )}

              <Button
                variant="ghost"
                size="icon"
                onClick={onClear}
                className="h-7 w-7 text-muted-foreground hover:text-foreground"
                title="Ocultar tabla"
              >
                <BaseIcon name="X" size={14} />
              </Button>
            </div>
          </div>

          {/* Tabla o mensaje de 0 filas */}
          {result.columns.length === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground">
              La consulta no devolvió columnas ni registros.
            </div>
          ) : result.row_count === 0 ? (
            <div className="p-6 text-center text-sm text-muted-foreground space-y-1">
              <p className="font-medium">
                La consulta se ejecutó con éxito pero arrojó 0 filas.
              </p>
              <p className="text-xs">
                Columnas detectadas: {result.columns.join(", ")}
              </p>
            </div>
          ) : (
            <div className="max-h-72 overflow-auto">
              <Table>
                <TableHeader className="sticky top-0 bg-muted/90 backdrop-blur z-10">
                  <TableRow>
                    <TableHead className="w-12 text-center text-xs text-muted-foreground font-mono">
                      #
                    </TableHead>
                    {result.columns.map((col) => (
                      <TableHead
                        key={col}
                        className="text-xs font-semibold whitespace-nowrap text-foreground"
                      >
                        {col}
                      </TableHead>
                    ))}
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {result.rows.map((row, rIdx) => (
                    <TableRow key={rIdx} className="hover:bg-muted/30">
                      <TableCell className="text-center text-[11px] font-mono text-muted-foreground">
                        {rIdx + 1}
                      </TableCell>
                      {result.columns.map((col) => {
                        const val = row[col];
                        return (
                          <TableCell
                            key={col}
                            className="text-xs font-mono py-2 max-w-xs truncate"
                            title={val !== null && val !== undefined ? String(val) : "NULL"}
                          >
                            {val === null || val === undefined ? (
                              <span className="text-muted-foreground/50 italic">
                                null
                              </span>
                            ) : typeof val === "boolean" ? (
                              <Badge
                                variant={val ? "default" : "secondary"}
                                className="text-[10px] px-1.5 py-0"
                              >
                                {val ? "true" : "false"}
                              </Badge>
                            ) : typeof val === "object" ? (
                              JSON.stringify(val)
                            ) : (
                              String(val)
                            )}
                          </TableCell>
                        );
                      })}
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          )}
        </div>
      )}
    </div>
  );
};
