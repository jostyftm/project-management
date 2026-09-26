"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { TableBlock, ChartBlock, DocumentBlock } from "@/types/document-type";
import { Report } from "@/types/report-type";
import {
  requestAllReports,
  getReportHeadersService,
  dryRunReportService,
  getReportByIdService,
  executeReportQueryService,
} from "@/app/(dashboard)/reports/services/report-service";
import { Database, Loader2 } from "lucide-react";
import { toast } from "sonner";

export interface ColumnMapping {
  original_column: string;
  display_name: string;
}

/**
 * Extrae el valor de una fila soportando búsqueda exacta, insensible a mayúsculas
 * y correspondencia bidireccional entre original_column y display_name.
 */
export const getRowValue = (
  row: Record<string, unknown>,
  columnKey: string,
  columnMappings?: ColumnMapping[]
): unknown => {
  if (!row || typeof row !== "object") return undefined;

  // 1. Coincidencia exacta directa
  if (row[columnKey] !== undefined) return row[columnKey];

  // 2. Coincidencia insensible a mayúsculas/minúsculas
  const lowerCol = columnKey.toLowerCase();
  for (const k of Object.keys(row)) {
    if (k.toLowerCase() === lowerCol) return row[k];
  }

  // 3. Coincidencia a través de los mapeos de encabezados del reporte
  if (columnMappings && columnMappings.length > 0) {
    const mapping = columnMappings.find(
      (m) =>
        m.original_column === columnKey ||
        m.display_name === columnKey ||
        m.original_column.toLowerCase() === lowerCol ||
        m.display_name.toLowerCase() === lowerCol
    );

    if (mapping) {
      // Probar por original_column
      if (row[mapping.original_column] !== undefined) return row[mapping.original_column];
      const lowerOrig = mapping.original_column.toLowerCase();
      for (const k of Object.keys(row)) {
        if (k.toLowerCase() === lowerOrig) return row[k];
      }

      // Probar por display_name
      if (row[mapping.display_name] !== undefined) return row[mapping.display_name];
      const lowerDisp = mapping.display_name.toLowerCase();
      for (const k of Object.keys(row)) {
        if (k.toLowerCase() === lowerDisp) return row[k];
      }
    }
  }

  return undefined;
};

interface ReportDataModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  targetBlockId: string | null;
}

export const ReportDataModal: React.FC<ReportDataModalProps> = ({
  open,
  onOpenChange,
  targetBlockId,
}) => {
  const rows = useDocStudioStore((state) => state.rows);
  const updateBlock = useDocStudioStore((state) => state.updateBlock);

  const [reports, setReports] = useState<Report[]>([]);
  const [loadingReports, setLoadingReports] = useState(false);
  const [selectedReportId, setSelectedReportId] = useState<string>("");
  const [columnMappings, setColumnMappings] = useState<ColumnMapping[]>([]);
  const [reportHeaders, setReportHeaders] = useState<string[]>([]);
  const [loadingHeaders, setLoadingHeaders] = useState(false);

  // Chart specific state
  const [xAxisKey, setXAxisKey] = useState<string>("");
  const [yAxisKey, setYAxisKey] = useState<string>("");
  const [tableMaxRows, setTableMaxRows] = useState<number>(10);
  const [loadingPreview, setLoadingPreview] = useState(false);

  // Find target block
  let targetBlock: DocumentBlock | null = null;
  if (targetBlockId) {
    for (const r of rows) {
      for (const c of r.columns) {
        const found = c.blocks.find((b) => b.id === targetBlockId);
        if (found) {
          targetBlock = found;
          break;
        }
      }
    }
  }

  const isChart = targetBlock?.type === "chart";
  const isTable = targetBlock?.type === "table";

  // Fetch list of reports
  useEffect(() => {
    if (open) {
      setLoadingReports(true);
      requestAllReports({ params: { paginate: false } })
        .then((res) => {
          const list = res.data || [];
          setReports(list);
          if (targetBlock && (targetBlock as any).reportId) {
            setSelectedReportId(String((targetBlock as any).reportId));
          }
          if (targetBlock?.type === "chart") {
            const cb = targetBlock as ChartBlock;
            if (cb.xAxisKey) setXAxisKey(cb.xAxisKey);
            if (cb.yAxisKey) setYAxisKey(cb.yAxisKey);
          }
          if (targetBlock?.type === "table") {
            const tb = targetBlock as TableBlock;
            if (tb.maxRows) setTableMaxRows(tb.maxRows);
          }
        })
        .catch(() => toast.error("Error al cargar la lista de reportes"))
        .finally(() => setLoadingReports(false));
    }
  }, [open]);

  // When report changes, load its headers/columns
  useEffect(() => {
    if (!selectedReportId) {
      setColumnMappings([]);
      setReportHeaders([]);
      return;
    }

    setLoadingHeaders(true);
    getReportHeadersService(selectedReportId)
      .then((res) => {
        const hdrs = res.data || [];
        const selectedHdrs = hdrs.filter((h) => h.attributes.is_selected);
        const sourceHdrs = selectedHdrs.length > 0 ? selectedHdrs : hdrs;

        const mappings: ColumnMapping[] = sourceHdrs.map((h) => ({
          original_column: h.attributes.original_column,
          display_name: h.attributes.display_name || h.attributes.original_column,
        }));

        if (mappings.length > 0) {
          setColumnMappings(mappings);
          setReportHeaders(mappings.map((m) => m.display_name));
        } else {
          // Fallback to dry run if no headers configured
          dryRunReportService(selectedReportId)
            .then((dryRes) => {
              const dryCols: ColumnMapping[] = (dryRes.data || []).map((c) => ({
                original_column: c.attributes.key,
                display_name: c.attributes.label || c.attributes.key,
              }));
              setColumnMappings(dryCols);
              setReportHeaders(dryCols.map((c) => c.display_name));
            })
            .catch(() => {});
        }
      })
      .catch(() => {
        // Try dryRun
        dryRunReportService(selectedReportId)
          .then((dryRes) => {
            const dryCols: ColumnMapping[] = (dryRes.data || []).map((c) => ({
              original_column: c.attributes.key,
              display_name: c.attributes.label || c.attributes.key,
            }));
            setColumnMappings(dryCols);
            setReportHeaders(dryCols.map((c) => c.display_name));
          })
          .catch(() => toast.error("Error al obtener columnas del reporte"));
      })
      .finally(() => setLoadingHeaders(false));
  }, [selectedReportId]);

  const handleApply = async () => {
    if (!targetBlockId || !selectedReportId) {
      toast.error("Selecciona un reporte primero");
      return;
    }

    setLoadingPreview(true);
    try {
      // 1. Obtener detalles del reporte y conexión
      const repRes = await getReportByIdService(selectedReportId);
      const rep = repRes.data;
      const connectionId = rep?.relationships?.connection_id;

      if (!rep?.attributes?.sql_query || !connectionId) {
        toast.error("El reporte no cuenta con una consulta SQL o conexión asignada");
        return;
      }

      // 2. Ejecutar la consulta en la base de datos para obtener datos reales
      const execRes = await executeReportQueryService({
        database_connection_id: connectionId,
        sql_query: rep.attributes.sql_query,
        limit: 50,
      });

      const queryRows = execRes.data?.rows || [];
      const queryCols = execRes.data?.columns || [];

      if (isTable) {
        // Construir encabezados con display_name renombrado
        const finalHeaders =
          columnMappings.length > 0
            ? columnMappings.map((m) => m.display_name)
            : reportHeaders.length > 0
            ? reportHeaders
            : queryCols.length > 0
            ? queryCols
            : ["Columna 1", "Columna 2"];

        // Mapear filas extrayendo los valores con soporte para columnas renombradas
        let formattedRows: string[][] = [];
        if (queryRows.length > 0) {
          formattedRows = queryRows.map((r: Record<string, unknown>) => {
            if (columnMappings.length > 0) {
              return columnMappings.map((m) => {
                const val = getRowValue(r, m.original_column, columnMappings);
                return val != null ? String(val) : "";
              });
            }
            return finalHeaders.map((hdr) => {
              const val = getRowValue(r, hdr, columnMappings);
              return val != null ? String(val) : "";
            });
          });
        } else {
          formattedRows = [finalHeaders.map(() => "Sin datos")];
        }

        updateBlock(targetBlockId, {
          dataSource: "report",
          reportId: Number(selectedReportId),
          headers: finalHeaders,
          rows: formattedRows,
          maxRows: tableMaxRows,
          columnMappings: columnMappings.length > 0 ? columnMappings : undefined,
        } as Partial<TableBlock>);

        toast.success(`Tabla vinculada y datos cargados (${queryRows.length} filas)`);
        onOpenChange(false);
      } else if (isChart) {
        if (!xAxisKey || !yAxisKey) {
          toast.error("Selecciona las columnas para el Eje X y Eje Y");
          return;
        }

        let sampleData: Array<{ label: string; value: number }> = [];

        if (queryRows.length > 0) {
          sampleData = queryRows.map((r: Record<string, unknown>, idx: number) => {
            const rawLabel = getRowValue(r, xAxisKey, columnMappings);
            const rawVal = getRowValue(r, yAxisKey, columnMappings);

            const numericVal =
              typeof rawVal === "number"
                ? rawVal
                : parseFloat(String(rawVal ?? 0).replace(/[^0-9.-]+/g, "")) || 0;

            const labelStr =
              rawLabel != null && String(rawLabel).trim() !== ""
                ? String(rawLabel)
                : `Dato ${idx + 1}`;

            return {
              label: labelStr,
              value: numericVal,
            };
          });
        }

        if (sampleData.length === 0) {
          sampleData = [
            { label: "Muestra A", value: 450 },
            { label: "Muestra B", value: 680 },
            { label: "Muestra C", value: 310 },
          ];
        }

        updateBlock(targetBlockId, {
          dataSource: "report",
          reportId: Number(selectedReportId),
          xAxisKey,
          yAxisKey,
          data: sampleData,
        } as Partial<ChartBlock>);

        toast.success(`Gráfica vinculada exitosamente (${sampleData.length} puntos cargados)`);
        onOpenChange(false);
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al vincular los datos del reporte");
      // Fallback
      if (isTable) {
        updateBlock(targetBlockId, {
          dataSource: "report",
          reportId: Number(selectedReportId),
          headers: reportHeaders.length > 0 ? reportHeaders : ["Columna 1", "Columna 2"],
        } as Partial<TableBlock>);
      } else if (isChart) {
        updateBlock(targetBlockId, {
          dataSource: "report",
          reportId: Number(selectedReportId),
          xAxisKey,
          yAxisKey,
        } as Partial<ChartBlock>);
      }
      onOpenChange(false);
    } finally {
      setLoadingPreview(false);
    }
  };

  const handleUnbind = () => {
    if (!targetBlockId) return;
    if (isTable) {
      updateBlock(targetBlockId, {
        dataSource: "manual",
        reportId: null,
      } as Partial<TableBlock>);
    } else if (isChart) {
      updateBlock(targetBlockId, {
        dataSource: "manual",
        reportId: null,
        xAxisKey: undefined,
        yAxisKey: undefined,
      } as Partial<ChartBlock>);
    }
    toast.info("Bloque desvinculado del reporte");
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[520px]">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Database className="w-5 h-5 text-primary" />
            <span>
              {isChart ? "Vincular Gráfica a Reporte Dinámico" : "Vincular Tabla a Reporte Dinámico"}
            </span>
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 pt-2">
          <div className="space-y-2">
            <Label>Seleccionar Reporte Dinámico</Label>
            {loadingReports ? (
              <div className="flex items-center gap-2 text-xs text-muted-foreground py-2">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Cargando reportes...</span>
              </div>
            ) : (
              <Select value={selectedReportId} onValueChange={setSelectedReportId}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Elige un reporte..." />
                </SelectTrigger>
                <SelectContent>
                  {reports.map((rep) => (
                    <SelectItem key={rep.id} value={String(rep.id)}>
                      {rep.attributes.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            )}
          </div>

          {selectedReportId && (
            <div className="space-y-4 border-t pt-3">
              {loadingHeaders ? (
                <div className="flex items-center gap-2 text-xs text-muted-foreground">
                  <Loader2 className="w-4 h-4 animate-spin text-primary" />
                  <span>Leyendo estructura y columnas...</span>
                </div>
              ) : (
                <>
                  {isTable && (
                    <div className="space-y-3">
                      <div className="space-y-2">
                        <Label className="text-xs text-muted-foreground">
                          Columnas vinculadas ({columnMappings.length || reportHeaders.length}):
                        </Label>
                        <div className="flex flex-wrap gap-1.5 max-h-32 overflow-y-auto p-2 border rounded-md bg-slate-50">
                          {(columnMappings.length > 0
                            ? columnMappings
                            : reportHeaders.map((h) => ({ original_column: h, display_name: h }))
                          ).map((col, idx) => (
                            <span
                              key={idx}
                              className="bg-white border text-slate-700 text-xs px-2 py-0.5 rounded shadow-2xs font-medium"
                              title={`Columna original: ${col.original_column}`}
                            >
                              {col.display_name}
                              {col.display_name !== col.original_column && (
                                <span className="text-[10px] text-muted-foreground ml-1">
                                  ({col.original_column})
                                </span>
                              )}
                            </span>
                          ))}
                        </div>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Filas a mostrar en el editor (vista previa)</Label>
                        <Select
                          value={String(tableMaxRows)}
                          onValueChange={(val) => setTableMaxRows(Number(val))}
                        >
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="5">5 filas</SelectItem>
                            <SelectItem value="10">10 filas (recomendado)</SelectItem>
                            <SelectItem value="15">15 filas</SelectItem>
                            <SelectItem value="25">25 filas</SelectItem>
                            <SelectItem value="50">50 filas</SelectItem>
                          </SelectContent>
                        </Select>
                        <p className="text-[11px] text-muted-foreground">
                          Controla cuántas filas se muestran mientras diseñas en el canvas. En la exportación a PDF o Word se incluirán todos los registros de la base de datos.
                        </p>
                      </div>
                    </div>
                  )}

                  {isChart && (
                    <div className="grid grid-cols-2 gap-3">
                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Eje X (Etiqueta/Categoría)</Label>
                        <Select value={xAxisKey} onValueChange={setXAxisKey}>
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Columna..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(columnMappings.length > 0
                              ? columnMappings
                              : reportHeaders.map((h) => ({ original_column: h, display_name: h }))
                            ).map((col, i) => (
                              <SelectItem key={i} value={col.original_column} className="text-xs">
                                {col.display_name !== col.original_column
                                  ? `${col.display_name} (${col.original_column})`
                                  : col.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>

                      <div className="space-y-1.5">
                        <Label className="text-xs font-semibold">Eje Y (Métrica/Valor)</Label>
                        <Select value={yAxisKey} onValueChange={setYAxisKey}>
                          <SelectTrigger className="w-full h-8 text-xs">
                            <SelectValue placeholder="Columna..." />
                          </SelectTrigger>
                          <SelectContent>
                            {(columnMappings.length > 0
                              ? columnMappings
                              : reportHeaders.map((h) => ({ original_column: h, display_name: h }))
                            ).map((col, i) => (
                              <SelectItem key={i} value={col.original_column} className="text-xs">
                                {col.display_name !== col.original_column
                                  ? `${col.display_name} (${col.original_column})`
                                  : col.display_name}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </>
              )}
            </div>
          )}
        </div>

        <DialogFooter className="mt-4 flex justify-between">
          <div>
            {(targetBlock as any)?.dataSource === "report" && (
              <Button
                type="button"
                variant="destructive"
                size="sm"
                onClick={handleUnbind}
              >
                Desvincular
              </Button>
            )}
          </div>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleApply}
              disabled={!selectedReportId || loadingHeaders || loadingPreview}
            >
              {loadingPreview && <Loader2 className="w-4 h-4 mr-1 animate-spin" />}
              Vincular Datos
            </Button>
          </div>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
