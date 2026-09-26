"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { RecentExecutionItem } from "@/types/dashboard-types";
import { reportRequestService } from "@/lib/request-report";
import { API_URL } from "@/config/enviroments";
import { toast } from "sonner";
import {
  Download,
  Loader2,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowRight,
  Zap,
  Calendar,
  ShieldAlert,
} from "lucide-react";

interface RecentExecutionsTableProps {
  executions?: RecentExecutionItem[];
}

export const RecentExecutionsTable: React.FC<RecentExecutionsTableProps> = ({
  executions = [],
}) => {
  const [downloadingId, setDownloadingId] = useState<number | null>(null);

  const handleDownload = async (exec: RecentExecutionItem) => {
    setDownloadingId(exec.id);
    const toastId = toast.loading(`Descargando ${exec.report_name}...`);

    try {
      const endpoint = API_URL("report", "v1");
      const blob = await reportRequestService<Blob>({
        url: `${endpoint}/report-executions/${exec.id}/download`,
        method: "GET",
        responseType: "blob",
      });

      const fileName = `${exec.report_name.replace(/\s+/g, "_")}_${exec.id}.${exec.file_format || "xlsx"}`;
      const url = window.URL.createObjectURL(new Blob([blob]));
      const link = document.createElement("a");
      link.href = url;
      link.setAttribute("download", fileName);
      document.body.appendChild(link);
      link.click();
      link.parentNode?.removeChild(link);
      window.URL.revokeObjectURL(url);

      toast.success("Archivo descargado exitosamente", { id: toastId });
    } catch (err) {
      console.error(err);
      toast.error("No se pudo descargar el archivo. Puede que haya expirado o ya no exista.", {
        id: toastId,
      });
    } finally {
      setDownloadingId(null);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "—";
    try {
      const date = new Date(dateStr);
      return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(date);
    } catch {
      return dateStr;
    }
  };

  return (
    <Card className="col-span-1 lg:col-span-5 border-border/70 shadow-sm">
      <CardHeader className="pb-3">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-base font-semibold">Actividad Reciente de Ejecuciones</CardTitle>
            <CardDescription className="text-xs">
              Últimos reportes generados con trazabilidad y descarga directa
            </CardDescription>
          </div>
          <Button asChild variant="ghost" size="sm" className="h-7 text-xs gap-1 text-primary">
            <Link href="/reports/executions">
              Ver historial completo <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
      </CardHeader>

      <CardContent className="pt-0 px-0 pb-2">
        {executions.length === 0 ? (
          <div className="py-12 text-center text-xs text-muted-foreground">
            No hay ejecuciones registradas recientemente
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead className="bg-muted/40 text-muted-foreground border-y border-border/50 uppercase tracking-wider text-[10px]">
                <tr>
                  <th className="py-2.5 px-4 font-semibold">Reporte / ID</th>
                  <th className="py-2.5 px-4 font-semibold">Origen</th>
                  <th className="py-2.5 px-4 font-semibold">Formato</th>
                  <th className="py-2.5 px-4 font-semibold">Registros</th>
                  <th className="py-2.5 px-4 font-semibold">Estado</th>
                  <th className="py-2.5 px-4 font-semibold">Fecha / Hora</th>
                  <th className="py-2.5 px-4 font-semibold text-right">Acción</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/40">
                {executions.map((exec) => {
                  const isDownloading = downloadingId === exec.id;

                  return (
                    <tr
                      key={exec.id}
                      className="hover:bg-muted/30 transition-colors"
                    >
                      {/* Reporte */}
                      <td className="py-3 px-4 font-medium text-foreground">
                        <div className="flex items-center gap-2">
                          <span className="truncate max-w-[260px]">
                            {exec.report_name}
                          </span>
                          <span className="font-mono text-[10px] text-muted-foreground">
                            #{exec.id}
                          </span>
                        </div>
                      </td>

                      {/* Origen */}
                      <td className="py-3 px-4">
                        <Badge
                          variant="outline"
                          className="text-[10px] px-2 py-0.5 font-normal gap-1 border-border/70"
                        >
                          {exec.trigger_type === "manual" ? (
                            <>
                              <Zap className="h-3 w-3 text-blue-500" />
                              Manual
                            </>
                          ) : (
                            <>
                              <Calendar className="h-3 w-3 text-amber-500" />
                              Programado
                            </>
                          )}
                        </Badge>
                      </td>

                      {/* Formato */}
                      <td className="py-3 px-4">
                        {exec.file_format ? (
                          <Badge
                            variant="outline"
                            className="font-mono uppercase text-[10px] px-1.5 py-0.5 bg-muted/40"
                          >
                            {exec.file_format}
                          </Badge>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">—</span>
                        )}
                      </td>

                      {/* Registros */}
                      <td className="py-3 px-4 font-mono text-muted-foreground">
                        {exec.row_count !== null ? (
                          `${new Intl.NumberFormat("es-MX").format(exec.row_count)} filas`
                        ) : (
                          "—"
                        )}
                      </td>

                      {/* Estado */}
                      <td className="py-3 px-4">
                        {exec.status === "success" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 font-medium border-emerald-500/30 bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 gap-1"
                          >
                            <CheckCircle2 className="h-3 w-3" />
                            Exitoso
                          </Badge>
                        )}
                        {exec.status === "failed" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 font-medium border-rose-500/30 bg-rose-500/10 text-rose-600 dark:text-rose-400 gap-1"
                          >
                            <XCircle className="h-3 w-3" />
                            Fallido
                          </Badge>
                        )}
                        {exec.status === "processing" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 font-medium border-blue-500/30 bg-blue-500/10 text-blue-600 dark:text-blue-400 gap-1 animate-pulse"
                          >
                            <Clock className="h-3 w-3" />
                            Procesando
                          </Badge>
                        )}
                        {exec.status === "skipped" && (
                          <Badge
                            variant="outline"
                            className="text-[10px] px-2 py-0.5 font-medium border-slate-500/30 bg-slate-500/10 text-slate-700 dark:text-slate-300 gap-1"
                          >
                            <ShieldAlert className="h-3 w-3 text-slate-500" />
                            Omitido
                          </Badge>
                        )}
                      </td>

                      {/* Fecha / Hora */}
                      <td className="py-3 px-4 text-muted-foreground whitespace-nowrap">
                        {formatDateTime(exec.created_at)}
                      </td>

                      {/* Acción */}
                      <td className="py-3 px-4 text-right">
                        {exec.status === "success" && exec.has_file ? (
                          <Button
                            variant="outline"
                            size="sm"
                            disabled={isDownloading}
                            onClick={() => handleDownload(exec)}
                            className="h-7 text-xs px-2.5 gap-1.5 border-border/70 hover:bg-muted"
                          >
                            {isDownloading ? (
                              <Loader2 className="h-3 w-3 animate-spin" />
                            ) : (
                              <Download className="h-3 w-3 text-primary" />
                            )}
                            Descargar
                          </Button>
                        ) : (
                          <span className="text-muted-foreground/60 text-[11px]">—</span>
                        )}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
