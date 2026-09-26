"use client";

import React, { useState } from "react";
import { TableBlock } from "@/types/document-type";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import {
  Plus,
  Trash2,
  Table as TableIcon,
  Check,
  RefreshCw,
  ArrowUpDown,
  ChevronLeft,
  ChevronRight,
  ArrowUp,
  ArrowDown,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from "@/components/ui/dialog";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import {
  getReportByIdService,
  getReportHeadersService,
  executeReportQueryService,
} from "@/app/(dashboard)/reports/services/report-service";
import { getRowValue } from "../ReportDataModal";

interface TableBlockViewProps {
  block: TableBlock;
  isSelected: boolean;
  isPreview: boolean;
  onOpenDataSourceModal?: (blockId: string) => void;
}

export const TableBlockView: React.FC<TableBlockViewProps> = ({
  block,
  isSelected,
  isPreview,
  onOpenDataSourceModal,
}) => {
  const updateBlock = useDocStudioStore((state) => state.updateBlock);
  const [editingCell, setEditingCell] = useState<{
    type: "header" | "cell";
    row?: number;
    col: number;
  } | null>(null);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [reorderModalOpen, setReorderModalOpen] = useState(false);

  const headers = block.headers || [];
  const rows = block.rows || [];
  const striped = block.striped ?? true;
  const bordered = block.bordered ?? true;
  const maxRows = block.maxRows || 10;
  const displayedRows = rows.slice(0, maxRows);

  const handleMoveColumn = (fromIndex: number, toIndex: number) => {
    if (fromIndex < 0 || fromIndex >= headers.length) return;
    if (toIndex < 0 || toIndex >= headers.length) return;
    if (fromIndex === toIndex) return;

    const nextHeaders = [...headers];
    const [movedHeader] = nextHeaders.splice(fromIndex, 1);
    nextHeaders.splice(toIndex, 0, movedHeader);

    const nextRows = rows.map((row) => {
      const nextRow = [...row];
      const [movedCell] = nextRow.splice(fromIndex, 1);
      nextRow.splice(toIndex, 0, movedCell);
      return nextRow;
    });

    let nextColumnMappings = block.columnMappings ? [...block.columnMappings] : undefined;
    if (nextColumnMappings && nextColumnMappings.length === headers.length) {
      const [movedMapping] = nextColumnMappings.splice(fromIndex, 1);
      nextColumnMappings.splice(toIndex, 0, movedMapping);
    }

    updateBlock(block.id, {
      headers: nextHeaders,
      rows: nextRows,
      columnMappings: nextColumnMappings,
    });
    toast.success(`Columna "${movedHeader}" reordenada`);
  };

  const handleAddColumn = () => {
    const newHeaders = [...headers, `Col ${headers.length + 1}`];
    const newRows = rows.map((r) => [...r, "-"]);
    updateBlock(block.id, { headers: newHeaders, rows: newRows });
  };

  const handleRemoveColumn = (colIndex: number) => {
    if (headers.length <= 1) return;
    const newHeaders = headers.filter((_, i) => i !== colIndex);
    const newRows = rows.map((r) => r.filter((_, i) => i !== colIndex));
    updateBlock(block.id, { headers: newHeaders, rows: newRows });
  };

  const handleAddRow = () => {
    const emptyRow = new Array(headers.length).fill("Dato");
    updateBlock(block.id, { rows: [...rows, emptyRow] });
  };

  const handleRemoveRow = (rowIndex: number) => {
    const newRows = rows.filter((_, i) => i !== rowIndex);
    updateBlock(block.id, { rows: newRows });
  };

  const handleHeaderChange = (colIndex: number, val: string) => {
    const nextHeaders = [...headers];
    nextHeaders[colIndex] = val;
    updateBlock(block.id, { headers: nextHeaders });
  };

  const handleCellChange = (rowIndex: number, colIndex: number, val: string) => {
    const nextRows = rows.map((row, rIdx) => {
      if (rIdx !== rowIndex) return row;
      const nextRow = [...row];
      nextRow[colIndex] = val;
      return nextRow;
    });
    updateBlock(block.id, { rows: nextRows });
  };

  const handleRefreshData = async () => {
    if (!block.reportId) return;
    setIsRefreshing(true);
    try {
      const repRes = await getReportByIdService(block.reportId);
      const rep = repRes.data;
      const connectionId = rep?.relationships?.connection_id;

      if (!rep?.attributes?.sql_query || !connectionId) {
        toast.error("El reporte no cuenta con consulta o conexión válida");
        return;
      }

      const execRes = await executeReportQueryService({
        database_connection_id: connectionId,
        sql_query: rep.attributes.sql_query,
        limit: 50,
      });

      const queryRows = execRes.data?.rows || [];
      const queryCols = execRes.data?.columns || [];

      const hdrsRes = await getReportHeadersService(block.reportId).catch(() => null);
      const hdrs = hdrsRes?.data || [];
      const selectedHdrs = hdrs.filter((h) => h.attributes.is_selected);
      const sourceHdrs = selectedHdrs.length > 0 ? selectedHdrs : hdrs;

      const columnMappings = sourceHdrs.map((h) => ({
        original_column: h.attributes.original_column,
        display_name: h.attributes.display_name || h.attributes.original_column,
      }));

      // Respetar el orden configurado por el usuario en el bloque si ya existe
      let finalHeaders = block.headers && block.headers.length > 0 ? block.headers : [];
      if (finalHeaders.length === 0) {
        if (columnMappings.length > 0) {
          finalHeaders = columnMappings.map((m) => m.display_name);
        } else {
          finalHeaders = queryCols;
        }
      }

      let formattedRows: string[][] = [];
      if (queryRows.length > 0) {
        formattedRows = queryRows.map((r: Record<string, unknown>) => {
          return finalHeaders.map((hdr) => {
            const val = getRowValue(r, hdr, columnMappings);
            return val != null ? String(val) : "";
          });
        });
      } else {
        formattedRows = [finalHeaders.map(() => "Sin datos")];
      }

      updateBlock(block.id, {
        headers: finalHeaders,
        rows: formattedRows,
        columnMappings: columnMappings.length > 0 ? columnMappings : block.columnMappings,
      });
      toast.success(`Datos de la tabla actualizados (${queryRows.length} filas)`);
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar datos de la tabla");
    } finally {
      setIsRefreshing(false);
    }
  };

  return (
    <div className="border rounded-lg p-3 bg-card shadow-2xs my-2">
      {/* Render Table */}
      <div className="w-full overflow-x-auto">
        <table
          className={cn(
            "w-full text-xs border-collapse",
            bordered && "border border-slate-200"
          )}
        >
          <thead>
            <tr className="bg-slate-900 text-white">
              {headers.map((h, colIdx) => (
                <th
                  key={colIdx}
                  className="p-2 font-semibold text-left border border-slate-800 relative group/th"
                >
                  <div className="flex items-center justify-between gap-1">
                    {editingCell?.type === "header" && editingCell.col === colIdx && !isPreview ? (
                      <div className="flex items-center gap-1 flex-1">
                        <Input
                          value={h}
                          onChange={(e) => handleHeaderChange(colIdx, e.target.value)}
                          onBlur={() => setEditingCell(null)}
                          className="h-6 text-xs text-slate-900 bg-white"
                          autoFocus
                        />
                      </div>
                    ) : (
                      <span
                        className="cursor-pointer hover:underline truncate"
                        onClick={() =>
                          !isPreview && setEditingCell({ type: "header", col: colIdx })
                        }
                      >
                        {h}
                      </span>
                    )}

                    {isSelected && !isPreview && headers.length > 1 && (
                      <div className="flex items-center gap-0.5 opacity-0 group-hover/th:opacity-100 transition-opacity ml-1 shrink-0">
                        <button
                          type="button"
                          disabled={colIdx === 0}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveColumn(colIdx, colIdx - 1);
                          }}
                          className={cn(
                            "p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none"
                          )}
                          title="Mover columna a la izquierda"
                        >
                          <ChevronLeft className="w-3 h-3" />
                        </button>
                        <button
                          type="button"
                          disabled={colIdx === headers.length - 1}
                          onClick={(e) => {
                            e.stopPropagation();
                            handleMoveColumn(colIdx, colIdx + 1);
                          }}
                          className={cn(
                            "p-0.5 rounded text-slate-400 hover:text-white hover:bg-slate-800 disabled:opacity-20 disabled:pointer-events-none"
                          )}
                          title="Mover columna a la derecha"
                        >
                          <ChevronRight className="w-3 h-3" />
                        </button>

                        {block.dataSource === "manual" && (
                          <button
                            type="button"
                            className="p-0.5 rounded text-slate-400 hover:text-red-400 hover:bg-slate-800 ml-0.5"
                            onClick={(e) => {
                              e.stopPropagation();
                              handleRemoveColumn(colIdx);
                            }}
                            title="Eliminar columna"
                          >
                            <Trash2 className="w-3 h-3" />
                          </button>
                        )}
                      </div>
                    )}
                  </div>
                </th>
              ))}
              {isSelected && !isPreview && block.dataSource === "manual" && (
                <th className="w-8 p-1 text-center border border-slate-800">
                  <span className="sr-only">Acciones</span>
                </th>
              )}
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 ? (
              <tr>
                <td
                  colSpan={headers.length || 1}
                  className="p-6 text-center text-xs text-muted-foreground"
                >
                  {block.dataSource === "report" ? (
                    <div className="flex flex-col items-center gap-2 py-2">
                      <p>Esta tabla está vinculada al reporte, pero aún no tiene filas cargadas.</p>
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isRefreshing}
                        className="h-7 text-xs gap-1.5"
                        onClick={handleRefreshData}
                      >
                        <RefreshCw className={cn("w-3.5 h-3.5", isRefreshing && "animate-spin")} />
                        <span>Cargar datos ahora</span>
                      </Button>
                    </div>
                  ) : (
                    "Sin filas en la tabla"
                  )}
                </td>
              </tr>
            ) : (
              displayedRows.map((row, rowIdx) => (
              <tr
                key={rowIdx}
                className={cn(
                  striped && rowIdx % 2 === 1 ? "bg-slate-50" : "bg-white",
                  "hover:bg-slate-100/60 transition-colors group/tr"
                )}
              >
                {row.map((cell, colIdx) => (
                  <td
                    key={colIdx}
                    className="p-2 border border-slate-200 text-slate-700"
                  >
                    {editingCell?.type === "cell" &&
                    editingCell.row === rowIdx &&
                    editingCell.col === colIdx &&
                    !isPreview ? (
                      <Input
                        value={cell}
                        onChange={(e) =>
                          handleCellChange(rowIdx, colIdx, e.target.value)
                        }
                        onBlur={() => setEditingCell(null)}
                        className="h-6 text-xs"
                        autoFocus
                      />
                    ) : (
                      <div
                        className="cursor-pointer min-h-[18px]"
                        onClick={() =>
                          !isPreview &&
                          setEditingCell({
                            type: "cell",
                            row: rowIdx,
                            col: colIdx,
                          })
                        }
                      >
                        {cell || <span className="text-slate-300">-</span>}
                      </div>
                    )}
                  </td>
                ))}
                {isSelected && !isPreview && block.dataSource === "manual" && (
                  <td className="w-8 p-1 text-center border border-slate-200">
                    <button
                      type="button"
                      className="opacity-0 group-hover/tr:opacity-100 text-slate-400 hover:text-red-500"
                      onClick={() => handleRemoveRow(rowIdx)}
                      title="Eliminar fila"
                    >
                      <Trash2 className="w-3 h-3" />
                    </button>
                  </td>
                )}
              </tr>
            )))}
          </tbody>
        </table>
      </div>

      {/* Footer / Status bar with row count & export indicator */}
      <div className="flex flex-wrap items-center justify-between gap-2 mt-2 pt-2 border-t text-[11px] text-muted-foreground">
        <div className="flex items-center gap-1.5">
          <TableIcon className="w-3.5 h-3.5 text-primary" />
          <span>
            Mostrando <strong>{displayedRows.length}</strong> de <strong>{rows.length}</strong> filas en el editor.
            <span className="text-slate-500 ml-1">
              (Al exportar a PDF o Word se incluirán todos los registros de la tabla)
            </span>
          </span>
        </div>
        {block.dataSource === "report" && (
          <Badge variant="outline" className="text-[10px] text-blue-600 border-blue-200 bg-blue-50/50">
            Datos en vivo
          </Badge>
        )}
      </div>

      {/* Modal para reordenar columnas */}
      <Dialog open={reorderModalOpen} onOpenChange={setReorderModalOpen}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle className="text-sm font-semibold flex items-center gap-2">
              <ArrowUpDown className="w-4 h-4 text-primary" />
              <span>Reordenar Columnas de la Tabla</span>
            </DialogTitle>
          </DialogHeader>
          <div className="space-y-1.5 py-2 max-h-[360px] overflow-y-auto">
            {headers.map((h, idx) => (
              <div
                key={idx}
                className="flex items-center justify-between p-2 rounded-md border bg-slate-50 text-xs"
              >
                <div className="flex items-center gap-2 truncate">
                  <span className="text-muted-foreground font-mono w-5">#{idx + 1}</span>
                  <span className="font-medium text-slate-800 truncate">{h}</span>
                </div>
                <div className="flex items-center gap-1 shrink-0">
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={idx === 0}
                    className="h-6 w-6 p-0"
                    onClick={() => handleMoveColumn(idx, idx - 1)}
                    title="Mover arriba / izquierda"
                  >
                    <ArrowUp className="w-3 h-3" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant="outline"
                    disabled={idx === headers.length - 1}
                    className="h-6 w-6 p-0"
                    onClick={() => handleMoveColumn(idx, idx + 1)}
                    title="Mover abajo / derecha"
                  >
                    <ArrowDown className="w-3 h-3" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
          <DialogFooter>
            <Button size="sm" className="text-xs h-8" onClick={() => setReorderModalOpen(false)}>
              Listo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
