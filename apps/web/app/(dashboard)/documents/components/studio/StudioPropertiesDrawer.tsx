"use client";

import React, { useRef, useState } from "react";
import {
  DocumentBlock,
  ImageBlock,
  TableBlock,
  ChartBlock,
  TextBlock,
  ChartDataPoint,
} from "@/types/document-type";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  X,
  Type,
  Image as ImageIcon,
  Table as TableIcon,
  BarChart3,
  Minus,
  Scissors,
  Upload,
  Link as LinkIcon,
  AlignLeft,
  AlignCenter,
  AlignRight,
  AlignJustify,
  Bold,
  Italic,
  Underline,
  Database,
  RefreshCw,
  ArrowUpDown,
  Plus,
  Trash2,
  Loader2,
  HardDrive,
  Heading1,
  Heading2,
  Heading3,
  Heading4,
  Pilcrow,
  Quote,
  Sliders,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { uploadDocumentImage } from "@/services/document-service";
import {
  getReportByIdService,
  getReportHeadersService,
  executeReportQueryService,
} from "@/app/(dashboard)/reports/services/report-service";
import { getRowValue } from "./ReportDataModal";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface StudioPropertiesDrawerProps {
  block: DocumentBlock;
  onClose: () => void;
  onOpenDataSourceModal?: (blockId: string) => void;
}

export const StudioPropertiesDrawer: React.FC<StudioPropertiesDrawerProps> = ({
  block,
  onClose,
  onOpenDataSourceModal,
}) => {
  const updateBlock = useDocStudioStore((state) => state.updateBlock);
  const deleteBlock = useDocStudioStore((state) => state.deleteBlock);

  // File upload state for Image
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [isUploading, setIsUploading] = useState(false);

  // Refresh states
  const [isRefreshingTable, setIsRefreshingTable] = useState(false);
  const [isRefreshingChart, setIsRefreshingChart] = useState(false);

  // -------------------------------------------------------------
  // Image Block Handlers
  // -------------------------------------------------------------
  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!file.type.startsWith("image/")) {
      toast.error("El archivo seleccionado no es una imagen válida");
      return;
    }

    setIsUploading(true);
    const toastId = toast.loading("Guardando imagen en almacenamiento S3...");

    try {
      const res = await uploadDocumentImage(file);
      const data = res.data;

      updateBlock(block.id, {
        url: data.url,
        path: data.path,
        filename: data.filename,
        size: data.size,
      });

      toast.success("Imagen guardada y vinculada correctamente", {
        id: toastId,
      });
    } catch (err: any) {
      // Fallback a Base64 local si falla la subida al servidor
      const reader = new FileReader();
      reader.onload = (event) => {
        const base64Url = event.target?.result as string;
        updateBlock(block.id, {
          url: base64Url,
          filename: file.name,
          size: file.size,
        });
        toast.warning("Imagen cargada en modo offline", {
          id: toastId,
        });
      };
      reader.readAsDataURL(file);
    } finally {
      setIsUploading(false);
      if (e.target) e.target.value = "";
    }
  };

  const handleRemoveImage = () => {
    updateBlock(block.id, {
      url: "",
      path: undefined,
      filename: undefined,
      size: undefined,
      caption: "",
    });
    toast.info("Imagen eliminada del widget");
  };

  // -------------------------------------------------------------
  // Table Block Handlers
  // -------------------------------------------------------------
  const handleTableRefreshData = async () => {
    const tbl = block as TableBlock;
    if (!tbl.reportId) return;
    setIsRefreshingTable(true);
    try {
      const repRes = await getReportByIdService(tbl.reportId);
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

      const queryRows: Record<string, any>[] = (execRes?.data as any)?.rows || [];
      const headersRes = await getReportHeadersService(tbl.reportId);
      const catalogHeaders = (headersRes?.data || []).map((h: any) => ({
        original_column: h.attributes?.original_column || h.original_column || "",
        display_name: h.attributes?.display_name || h.display_name || h.attributes?.original_column || "",
      }));

      const currentHeaders = tbl.headers || [];
      const currentMappings = tbl.columnMappings || [];

      let finalHeaders: string[] = [];
      let columnMappings: any[] = [];

      if (currentHeaders.length > 0) {
        finalHeaders = currentHeaders;
        columnMappings = currentHeaders.map((headerText, i) => {
          const existing = currentMappings[i];
          if (existing) return existing;
          const match = catalogHeaders.find(
            (h: any) =>
              (h.display_name && h.display_name === headerText) ||
              (h.original_column && h.original_column === headerText)
          );
          return {
            header: headerText,
            sourceKey: match?.original_column || headerText,
          };
        });
      } else {
        const selected = (headersRes?.data || []).filter((h: any) => h.attributes?.is_selected || h.is_selected);
        const headersToUse = selected.length > 0 ? selected : (headersRes?.data || []);
        finalHeaders = headersToUse.map((h: any) => h.attributes?.display_name || h.display_name || h.attributes?.original_column || h.original_column);
        columnMappings = headersToUse.map((h: any) => ({
          header: h.attributes?.display_name || h.display_name || h.attributes?.original_column || h.original_column,
          sourceKey: h.attributes?.original_column || h.original_column,
        }));
      }

      const formattedRows = queryRows.map((qRow) =>
        finalHeaders.map((headerName, colIdx) => {
          const mapItem = columnMappings[colIdx];
          const keyToFind = mapItem?.sourceKey || headerName;
          const val = getRowValue(qRow, keyToFind, catalogHeaders);
          return val !== null && val !== undefined ? String(val) : "";
        })
      );

      updateBlock(block.id, {
        headers: finalHeaders,
        rows: formattedRows,
        columnMappings: columnMappings.length > 0 ? columnMappings : tbl.columnMappings,
      });
      toast.success(`Datos de la tabla actualizados (${queryRows.length} filas)`);
    } catch (err: any) {
      toast.error(err?.message || "Error al actualizar datos de la tabla");
    } finally {
      setIsRefreshingTable(false);
    }
  };

  const handleMoveColumn = (fromIndex: number, toIndex: number) => {
    const tbl = block as TableBlock;
    const headers = tbl.headers || [];
    const rows = tbl.rows || [];
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

    let nextColumnMappings = tbl.columnMappings ? [...tbl.columnMappings] : undefined;
    if (nextColumnMappings && nextColumnMappings.length === headers.length) {
      const [movedMapping] = nextColumnMappings.splice(fromIndex, 1);
      nextColumnMappings.splice(toIndex, 0, movedMapping);
    }

    updateBlock(block.id, {
      headers: nextHeaders,
      rows: nextRows,
      columnMappings: nextColumnMappings,
    });
  };

  // -------------------------------------------------------------
  // Chart Block Handlers
  // -------------------------------------------------------------
  const handleChartRefreshData = async () => {
    const ch = block as ChartBlock;
    if (!ch.reportId || !ch.xAxisKey || !ch.yAxisKey) return;
    setIsRefreshingChart(true);
    try {
      const repRes = await getReportByIdService(ch.reportId);
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

      const rows: Record<string, any>[] = (execRes?.data as any)?.rows || [];
      const headersRes = await getReportHeadersService(ch.reportId);
      const catalogHeaders = (headersRes?.data || []).map((h: any) => ({
        original_column: h.attributes?.original_column || h.original_column || "",
        display_name: h.attributes?.display_name || h.display_name || h.attributes?.original_column || "",
      }));

      const chartData: ChartDataPoint[] = rows.map((row, idx) => {
        const rawLabel = getRowValue(row, ch.xAxisKey!, catalogHeaders);
        const rawValue = getRowValue(row, ch.yAxisKey!, catalogHeaders);
        const parsedVal = Number(rawValue);
        return {
          label: rawLabel !== null && rawLabel !== undefined ? String(rawLabel) : `Item ${idx + 1}`,
          value: isNaN(parsedVal) ? 0 : parsedVal,
        };
      });

      updateBlock(block.id, { data: chartData });
      toast.success(`Datos de la gráfica actualizados (${chartData.length} puntos)`);
    } catch (err: any) {
      toast.error(err?.message || "Error al refrescar datos de la gráfica");
    } finally {
      setIsRefreshingChart(false);
    }
  };

  // -------------------------------------------------------------
  // Header Icon & Title
  // -------------------------------------------------------------
  const getBlockHeader = () => {
    switch (block.type) {
      case "image":
        return {
          icon: <ImageIcon className="w-4 h-4 text-emerald-600" />,
          title: "Widget de Imagen",
          desc: "Ajusta tamaño, alineación y archivo",
        };
      case "table":
        return {
          icon: <TableIcon className="w-4 h-4 text-purple-600" />,
          title: "Widget de Tabla",
          desc: "Configura columnas, datos y filas",
        };
      case "chart":
        return {
          icon: <BarChart3 className="w-4 h-4 text-indigo-600" />,
          title: "Widget de Gráfica",
          desc: "Tipo de visualización y series de datos",
        };
      case "text":
        return {
          icon: <Type className="w-4 h-4 text-blue-600" />,
          title: "Texto Enriquecido",
          desc: "Tipografía, estilos y formato",
        };
      case "divider":
        return {
          icon: <Minus className="w-4 h-4 text-slate-500" />,
          title: "Separador",
          desc: "Línea horizontal divisoria",
        };
      case "page_break":
        return {
          icon: <Scissors className="w-4 h-4 text-amber-600" />,
          title: "Salto de Página",
          desc: "Fuerza una nueva hoja en PDF/Word",
        };
      default:
        return {
          icon: <Sliders className="w-4 h-4 text-slate-600" />,
          title: "Propiedades del Bloque",
          desc: "Ajustes del elemento seleccionado",
        };
    }
  };

  const header = getBlockHeader();

  return (
    <aside className="w-80 border-l bg-card flex flex-col shrink-0 overflow-y-auto z-20 shadow-xs animate-in slide-in-from-right-2 duration-200">
      {/* Top Title Bar */}
      <div className="p-3.5 border-b flex items-center justify-between gap-2 bg-slate-50/70 dark:bg-slate-900/50">
        <div className="flex items-center gap-2 min-w-0">
          <div className="p-1.5 rounded-md bg-background border shadow-2xs">
            {header.icon}
          </div>
          <div className="min-w-0">
            <h3 className="text-xs font-bold text-slate-900 dark:text-slate-100 truncate">
              {header.title}
            </h3>
            <p className="text-[11px] text-muted-foreground truncate">
              {header.desc}
            </p>
          </div>
        </div>

        <Button
          type="button"
          variant="ghost"
          size="sm"
          className="h-7 w-7 p-0 text-slate-500 hover:text-slate-900"
          onClick={onClose}
          title="Cerrar panel de propiedades (Esc)"
        >
          <X className="w-4 h-4" />
        </Button>
      </div>

      {/* Content Form Body */}
      <div className="p-4 space-y-5 flex-1">
        {/* ============================================================== */}
        {/* IMAGE BLOCK CONTROLS                                          */}
        {/* ============================================================== */}
        {block.type === "image" && (() => {
          const img = block as ImageBlock;
          const widthPct = img.widthPercent || 100;
          const align = img.align || "center";

          return (
            <div className="space-y-4">
              {/* Image Preview & Upload / Replace */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Archivo de Imagen</Label>
                {img.url ? (
                  <div className="space-y-2">
                    <div className="relative border rounded-md p-2 bg-slate-50 dark:bg-slate-900/40 flex items-center justify-center min-h-[120px] max-h-[160px] overflow-hidden group/thumb">
                      <img
                        src={img.url}
                        alt={img.caption || "Preview"}
                        className="max-h-[140px] max-w-full object-contain rounded"
                      />
                    </div>

                    {img.path && (
                      <div className="flex items-center gap-1.5 text-[11px] text-slate-600 bg-slate-100/80 p-1.5 rounded">
                        <HardDrive className="w-3.5 h-3.5 text-emerald-600 shrink-0" />
                        <span className="truncate" title={img.path}>
                          {img.filename || img.path}
                        </span>
                        {img.size && (
                          <span className="text-[10px] text-slate-400 ml-auto shrink-0">
                            {Math.round(img.size / 1024)} KB
                          </span>
                        )}
                      </div>
                    )}

                    <div className="flex gap-1.5">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        disabled={isUploading}
                        className="flex-1 text-xs h-8 gap-1.5"
                        onClick={() => fileInputRef.current?.click()}
                      >
                        {isUploading ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin text-primary" />
                        ) : (
                          <Upload className="w-3.5 h-3.5" />
                        )}
                        <span>Reemplazar Archivo</span>
                      </Button>

                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        className="h-8 w-8 p-0 text-slate-400 hover:text-red-600 hover:bg-red-50"
                        onClick={handleRemoveImage}
                        title="Quitar imagen"
                      >
                        <Trash2 className="w-3.5 h-3.5" />
                      </Button>
                    </div>
                  </div>
                ) : (
                  <div
                    className="border-2 border-dashed rounded-lg p-5 flex flex-col items-center justify-center text-center cursor-pointer hover:bg-slate-50 transition-colors"
                    onClick={() => !isUploading && fileInputRef.current?.click()}
                  >
                    {isUploading ? (
                      <div className="flex flex-col items-center gap-2">
                        <Loader2 className="w-6 h-6 animate-spin text-primary" />
                        <span className="text-xs text-slate-600">Guardando en S3...</span>
                      </div>
                    ) : (
                      <>
                        <Upload className="w-5 h-5 text-slate-400 mb-1.5" />
                        <span className="text-xs font-medium text-slate-800">
                          Subir archivo de imagen
                        </span>
                        <span className="text-[10px] text-muted-foreground mt-0.5">
                          PNG, JPG, WebP o SVG (máx. 10 MB)
                        </span>
                      </>
                    )}
                  </div>
                )}

                <input
                  ref={fileInputRef}
                  type="file"
                  accept="image/png,image/jpeg,image/jpg,image/webp,image/svg+xml,image/gif"
                  className="hidden"
                  onChange={handleFileUpload}
                />
              </div>

              {/* Ancho Porcentual */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Ancho en Documento</Label>
                  <span className="text-xs font-mono font-medium text-slate-600">{widthPct}%</span>
                </div>
                <div className="grid grid-cols-4 gap-1.5">
                  {[25, 50, 75, 100].map((pct) => (
                    <Button
                      key={pct}
                      type="button"
                      size="sm"
                      variant={widthPct === pct ? "default" : "outline"}
                      className="h-7 text-xs px-1"
                      onClick={() => updateBlock(block.id, { widthPercent: pct })}
                    >
                      {pct}%
                    </Button>
                  ))}
                </div>
              </div>

              {/* Alineación Horizontal */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Alineación</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={align === "left" ? "default" : "outline"}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => updateBlock(block.id, { align: "left" })}
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                    <span>Izquierda</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={align === "center" ? "default" : "outline"}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => updateBlock(block.id, { align: "center" })}
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                    <span>Centro</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={align === "right" ? "default" : "outline"}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => updateBlock(block.id, { align: "right" })}
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                    <span>Derecha</span>
                  </Button>
                </div>
              </div>

              {/* Pie de imagen / Caption */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Pie de imagen o leyenda</Label>
                <Input
                  value={img.caption || ""}
                  onChange={(e) => updateBlock(block.id, { caption: e.target.value })}
                  placeholder="Ej. Figura 1: Diagrama de arquitectura..."
                  className="h-8 text-xs"
                />
              </div>

              {/* URL directa manual */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">URL directa de imagen</Label>
                <Input
                  value={img.url || ""}
                  onChange={(e) => updateBlock(block.id, { url: e.target.value })}
                  placeholder="https://..."
                  className="h-8 text-xs font-mono text-[11px]"
                />
              </div>
            </div>
          );
        })()}

        {/* ============================================================== */}
        {/* TABLE BLOCK CONTROLS                                          */}
        {/* ============================================================== */}
        {block.type === "table" && (() => {
          const tbl = block as TableBlock;
          const headers = tbl.headers || [];
          const rows = tbl.rows || [];
          const maxRows = tbl.maxRows || 10;
          const striped = tbl.striped ?? true;
          const bordered = tbl.bordered ?? true;

          return (
            <div className="space-y-4">
              {/* Origen de Datos */}
              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Origen de Datos</Label>
                  <Badge variant="outline" className="text-[10px]">
                    {tbl.dataSource === "report" ? "Reporte SQL" : "Manual"}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={tbl.dataSource === "report" ? "default" : "outline"}
                    className="w-full text-xs h-8 gap-1.5 justify-start"
                    onClick={() => onOpenDataSourceModal?.(block.id)}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>
                      {tbl.dataSource === "report"
                        ? "Vincular / Cambiar Reporte"
                        : "Vincular con Reporte SQL"}
                    </span>
                  </Button>

                  {tbl.dataSource === "report" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isRefreshingTable}
                      className="w-full text-xs h-8 gap-1.5 justify-start text-blue-600 hover:text-blue-700"
                      onClick={handleTableRefreshData}
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingTable && "animate-spin")} />
                      <span>Actualizar Datos de Consulta</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Límite de Filas en Editor */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Filas en Canvas</Label>
                  <Select
                    value={String(maxRows)}
                    onValueChange={(val) => updateBlock(block.id, { maxRows: Number(val) })}
                  >
                    <SelectTrigger className="h-7 w-[75px] text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="5">5</SelectItem>
                      <SelectItem value="10">10</SelectItem>
                      <SelectItem value="15">15</SelectItem>
                      <SelectItem value="25">25</SelectItem>
                      <SelectItem value="50">50</SelectItem>
                      <SelectItem value="100">100</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
                <p className="text-[11px] text-muted-foreground">
                  En el canvas se muestran máximo {maxRows} filas. Al exportar a PDF o Word se incluirán{" "}
                  <strong>todos los registros</strong> devueltos por la consulta ({rows.length} registros cargados).
                </p>
              </div>

              {/* Reordenar Columnas */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Columnas ({headers.length})</Label>
                <div className="space-y-1 max-h-[180px] overflow-y-auto pr-1">
                  {headers.map((hdr, idx) => (
                    <div
                      key={idx}
                      className="flex items-center justify-between text-xs p-1.5 bg-slate-50 dark:bg-slate-900 border rounded"
                    >
                      <span className="truncate max-w-[170px]" title={hdr}>
                        {hdr}
                      </span>
                      <div className="flex items-center gap-0.5">
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === 0}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-800"
                          onClick={() => handleMoveColumn(idx, idx - 1)}
                          title="Mover columna a la izquierda"
                        >
                          <ChevronUp className="w-3.5 h-3.5" />
                        </Button>
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          disabled={idx === headers.length - 1}
                          className="h-6 w-6 p-0 text-slate-400 hover:text-slate-800"
                          onClick={() => handleMoveColumn(idx, idx + 1)}
                          title="Mover columna a la derecha"
                        >
                          <ChevronDown className="w-3.5 h-3.5" />
                        </Button>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Estilos visuales de la tabla */}
              <div className="space-y-2.5 pt-2 border-t">
                <Label className="text-xs font-semibold">Estilos de Tabla</Label>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 dark:text-slate-300">Filas alternadas (Striped)</span>
                  <Switch
                    checked={striped}
                    onCheckedChange={(checked) => updateBlock(block.id, { striped: checked })}
                  />
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-xs text-slate-700 dark:text-slate-300">Bordes de celdas (Bordered)</span>
                  <Switch
                    checked={bordered}
                    onCheckedChange={(checked) => updateBlock(block.id, { bordered: checked })}
                  />
                </div>
              </div>
            </div>
          );
        })()}

        {/* ============================================================== */}
        {/* CHART BLOCK CONTROLS                                          */}
        {/* ============================================================== */}
        {block.type === "chart" && (() => {
          const ch = block as ChartBlock;
          const chartType = ch.chartType || "bar";
          const data = ch.data || [];

          return (
            <div className="space-y-4">
              {/* Tipo de Gráfico */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tipo de Visualización</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={chartType === "bar" ? "default" : "outline"}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => updateBlock(block.id, { chartType: "bar" })}
                  >
                    <BarChart3 className="w-3.5 h-3.5" />
                    <span>Barras</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={chartType === "line" ? "default" : "outline"}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => updateBlock(block.id, { chartType: "line" })}
                  >
                    <Minus className="w-3.5 h-3.5" />
                    <span>Líneas</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={chartType === "pie" ? "default" : "outline"}
                    className="h-8 text-xs gap-1.5"
                    onClick={() => updateBlock(block.id, { chartType: "pie" })}
                  >
                    <TableIcon className="w-3.5 h-3.5" />
                    <span>Circular</span>
                  </Button>
                </div>
              </div>

              {/* Título de la Gráfica */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Título del Gráfico</Label>
                <Input
                  value={ch.title || ""}
                  onChange={(e) => updateBlock(block.id, { title: e.target.value })}
                  placeholder="Ej. Distribución por Estado"
                  className="h-8 text-xs"
                />
              </div>

              {/* Origen de Datos */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Origen de Datos</Label>
                  <Badge variant="outline" className="text-[10px]">
                    {ch.dataSource === "report" ? "Reporte SQL" : "Manual"}
                  </Badge>
                </div>

                <div className="flex flex-col gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={ch.dataSource === "report" ? "default" : "outline"}
                    className="w-full text-xs h-8 gap-1.5 justify-start"
                    onClick={() => onOpenDataSourceModal?.(block.id)}
                  >
                    <Database className="w-3.5 h-3.5" />
                    <span>
                      {ch.dataSource === "report"
                        ? "Vincular / Cambiar Reporte"
                        : "Vincular con Reporte SQL"}
                    </span>
                  </Button>

                  {ch.dataSource === "report" && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      disabled={isRefreshingChart}
                      className="w-full text-xs h-8 gap-1.5 justify-start text-blue-600 hover:text-blue-700"
                      onClick={handleChartRefreshData}
                    >
                      <RefreshCw className={cn("w-3.5 h-3.5", isRefreshingChart && "animate-spin")} />
                      <span>Actualizar Datos de Consulta</span>
                    </Button>
                  )}
                </div>
              </div>

              {/* Puntos de Datos */}
              <div className="space-y-2 pt-2 border-t">
                <div className="flex items-center justify-between">
                  <Label className="text-xs font-semibold">Puntos de Serie ({data.length})</Label>
                  {ch.dataSource === "manual" && (
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-6 text-[11px] px-1.5 text-primary gap-1"
                      onClick={() => {
                        const nextData = [...data, { label: `Item ${data.length + 1}`, value: 100 }];
                        updateBlock(block.id, { data: nextData });
                      }}
                    >
                      <Plus className="w-3 h-3" />
                      <span>Añadir punto</span>
                    </Button>
                  )}
                </div>

                <div className="space-y-1.5 max-h-[180px] overflow-y-auto pr-1">
                  {data.map((pt, i) => (
                    <div
                      key={i}
                      className="flex items-center gap-1.5 text-xs p-1.5 bg-slate-50 dark:bg-slate-900 border rounded"
                    >
                      <Input
                        value={pt.label}
                        disabled={ch.dataSource === "report"}
                        onChange={(e) => {
                          const nextData = [...data];
                          nextData[i] = { ...nextData[i], label: e.target.value };
                          updateBlock(block.id, { data: nextData });
                        }}
                        className="h-6 text-xs flex-1"
                      />
                      <Input
                        type="number"
                        value={pt.value}
                        disabled={ch.dataSource === "report"}
                        onChange={(e) => {
                          const nextData = [...data];
                          nextData[i] = { ...nextData[i], value: Number(e.target.value) || 0 };
                          updateBlock(block.id, { data: nextData });
                        }}
                        className="h-6 text-xs w-16 text-right"
                      />
                      {ch.dataSource === "manual" && (
                        <Button
                          type="button"
                          variant="ghost"
                          size="sm"
                          className="h-6 w-6 p-0 text-slate-400 hover:text-red-600"
                          onClick={() => {
                            const nextData = data.filter((_, idx) => idx !== i);
                            updateBlock(block.id, { data: nextData });
                          }}
                        >
                          <Trash2 className="w-3 h-3" />
                        </Button>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            </div>
          );
        })()}

        {/* ============================================================== */}
        {/* TEXT BLOCK CONTROLS                                           */}
        {/* ============================================================== */}
        {block.type === "text" && (() => {
          const txt = block as TextBlock;
          const styles = txt.styles || {};
          const currentTag = txt.tag || "p";

          return (
            <div className="space-y-4">
              {/* Jerarquía / Encabezado */}
              <div className="space-y-2">
                <Label className="text-xs font-semibold">Tipo de Texto</Label>
                <div className="grid grid-cols-3 gap-1.5">
                  <Button
                    type="button"
                    size="sm"
                    variant={currentTag === "h1" ? "default" : "outline"}
                    className="h-8 text-xs gap-1"
                    onClick={() => updateBlock(block.id, { tag: "h1" })}
                  >
                    <Heading1 className="w-3.5 h-3.5" />
                    <span>Título 1</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={currentTag === "h2" ? "default" : "outline"}
                    className="h-8 text-xs gap-1"
                    onClick={() => updateBlock(block.id, { tag: "h2" })}
                  >
                    <Heading2 className="w-3.5 h-3.5" />
                    <span>Título 2</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={currentTag === "h3" ? "default" : "outline"}
                    className="h-8 text-xs gap-1"
                    onClick={() => updateBlock(block.id, { tag: "h3" })}
                  >
                    <Heading3 className="w-3.5 h-3.5" />
                    <span>Título 3</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={currentTag === "h4" ? "default" : "outline"}
                    className="h-8 text-xs gap-1"
                    onClick={() => updateBlock(block.id, { tag: "h4" })}
                  >
                    <Heading4 className="w-3.5 h-3.5" />
                    <span>Título 4</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={currentTag === "p" ? "default" : "outline"}
                    className="h-8 text-xs gap-1"
                    onClick={() => updateBlock(block.id, { tag: "p" })}
                  >
                    <Pilcrow className="w-3.5 h-3.5" />
                    <span>Párrafo</span>
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={currentTag === "quote" ? "default" : "outline"}
                    className="h-8 text-xs gap-1"
                    onClick={() => updateBlock(block.id, { tag: "quote" })}
                  >
                    <Quote className="w-3.5 h-3.5" />
                    <span>Cita</span>
                  </Button>
                </div>
              </div>

              {/* Formato Tipográfico */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Formato</Label>
                <div className="flex items-center gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={styles.bold ? "default" : "outline"}
                    className="h-8 flex-1"
                    onClick={() =>
                      updateBlock(block.id, {
                        styles: { ...styles, bold: !styles.bold },
                      })
                    }
                    title="Negrita"
                  >
                    <Bold className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={styles.italic ? "default" : "outline"}
                    className="h-8 flex-1"
                    onClick={() =>
                      updateBlock(block.id, {
                        styles: { ...styles, italic: !styles.italic },
                      })
                    }
                    title="Cursiva"
                  >
                    <Italic className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={styles.underline ? "default" : "outline"}
                    className="h-8 flex-1"
                    onClick={() =>
                      updateBlock(block.id, {
                        styles: { ...styles, underline: !styles.underline },
                      })
                    }
                    title="Subrayado"
                  >
                    <Underline className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Alineación */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Alineación</Label>
                <div className="grid grid-cols-4 gap-1">
                  <Button
                    type="button"
                    size="sm"
                    variant={(styles.align || "left") === "left" ? "default" : "outline"}
                    className="h-8"
                    onClick={() =>
                      updateBlock(block.id, {
                        styles: { ...styles, align: "left" },
                      })
                    }
                  >
                    <AlignLeft className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={styles.align === "center" ? "default" : "outline"}
                    className="h-8"
                    onClick={() =>
                      updateBlock(block.id, {
                        styles: { ...styles, align: "center" },
                      })
                    }
                  >
                    <AlignCenter className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={styles.align === "right" ? "default" : "outline"}
                    className="h-8"
                    onClick={() =>
                      updateBlock(block.id, {
                        styles: { ...styles, align: "right" },
                      })
                    }
                  >
                    <AlignRight className="w-3.5 h-3.5" />
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={styles.align === "justify" ? "default" : "outline"}
                    className="h-8"
                    onClick={() =>
                      updateBlock(block.id, {
                        styles: { ...styles, align: "justify" },
                      })
                    }
                  >
                    <AlignJustify className="w-3.5 h-3.5" />
                  </Button>
                </div>
              </div>

              {/* Color del Texto */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Color del Texto</Label>
                <div className="flex items-center gap-2">
                  <input
                    type="color"
                    value={styles.color || "#1e293b"}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        styles: { ...styles, color: e.target.value },
                      })
                    }
                    className="w-8 h-8 rounded border cursor-pointer"
                  />
                  <Input
                    value={styles.color || "#1e293b"}
                    onChange={(e) =>
                      updateBlock(block.id, {
                        styles: { ...styles, color: e.target.value },
                      })
                    }
                    className="h-8 text-xs font-mono flex-1"
                  />
                </div>
              </div>

              {/* Editor directo de texto */}
              <div className="space-y-2 pt-2 border-t">
                <Label className="text-xs font-semibold">Contenido de Texto</Label>
                <textarea
                  value={txt.content || ""}
                  onChange={(e) => updateBlock(block.id, { content: e.target.value })}
                  rows={5}
                  className="w-full text-xs p-2 border rounded-md font-sans bg-background focus:outline-none focus:ring-1 focus:ring-primary"
                  placeholder="Redacta el texto aquí..."
                />
              </div>
            </div>
          );
        })()}

        {/* ============================================================== */}
        {/* DIVIDER BLOCK CONTROLS                                         */}
        {/* ============================================================== */}
        {block.type === "divider" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Este bloque crea una línea divisoria horizontal decorativa para separar secciones de tu informe.
            </p>
          </div>
        )}

        {/* ============================================================== */}
        {/* PAGE BREAK BLOCK CONTROLS                                      */}
        {/* ============================================================== */}
        {block.type === "page_break" && (
          <div className="space-y-3">
            <p className="text-xs text-muted-foreground">
              Este bloque fuerza un salto de página estricto al exportar a <strong>PDF</strong> y <strong>Word (.docx)</strong>. Todo el contenido posterior iniciará en una nueva hoja.
            </p>
          </div>
        )}

        {/* Eliminar Bloque */}
        <div className="pt-4 border-t">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full h-8 text-xs text-red-600 hover:text-red-700 hover:bg-red-50 dark:hover:bg-red-950/30 gap-1.5 border-red-200 dark:border-red-900"
            onClick={() => {
              deleteBlock(block.id);
              onClose();
            }}
          >
            <Trash2 className="w-3.5 h-3.5" />
            <span>Eliminar este bloque</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};
