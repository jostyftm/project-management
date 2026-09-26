"use client";

import React, { useState } from "react";
import { ReportAlert } from "@/types/alert-types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Switch } from "@/components/ui/switch";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { requestTestAlert } from "@/services/alert-service";
import { toast } from "sonner";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import useModuleActions from "@/hooks/permission-guard/use-module-actions";
import {
  Flame,
  AlertTriangle,
  Info,
  Clock,
  Play,
  History,
  MoreVertical,
  Edit2,
  Trash2,
  Loader2,
  FileText,
  Mail,
  Webhook,
  Send,
} from "lucide-react";

interface AlertsTableProps {
  alerts: ReportAlert[];
  isLoading: boolean;
  onEdit: (alert: ReportAlert) => void;
  onDelete: (id: number) => void;
  onToggle: (id: number) => void;
  onViewIncidents: (alert: ReportAlert) => void;
}

export const AlertsTable: React.FC<AlertsTableProps> = ({
  alerts,
  isLoading,
  onEdit,
  onDelete,
  onToggle,
  onViewIncidents,
}) => {
  const [testingId, setTestingId] = useState<number | null>(null);

  const { canUpdate, canDelete } = useModuleActions();

  const handleQuickTest = async (alert: ReportAlert) => {
    setTestingId(alert.id);
    const toastId = toast.loading(`Evaluando condición de '${alert.name}'...`);

    try {
      const res = await requestTestAlert(alert.id);
      const data = res.data;

      if (data.triggered) {
        toast.error(
          `¡Condición CUMPLIDA! Se detectaron ${data.evaluated_value} (${data.threshold_snapshot}). La alerta se dispararía.`,
          { id: toastId, duration: 6000 }
        );
      } else {
        toast.success(
          `Condición Normal: ${data.evaluated_value} (${data.threshold_snapshot}). Operación dentro del rango esperado.`,
          { id: toastId, duration: 5000 }
        );
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al evaluar la alerta.", { id: toastId });
    } finally {
      setTestingId(null);
    }
  };

  const formatDateTime = (dateStr: string | null) => {
    if (!dateStr) return "Nunca";
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  if (isLoading && alerts.length === 0) {
    return (
      <div className="py-20 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
        <Loader2 className="h-6 w-6 animate-spin text-primary" />
        <span>Cargando reglas de alerta...</span>
      </div>
    );
  }

  if (alerts.length === 0) {
    return (
      <div className="py-16 text-center text-xs text-muted-foreground">
        No se encontraron alertas configuradas con los filtros actuales.
      </div>
    );
  }

  return (
    <div className="overflow-x-auto rounded-xl border border-border/70 bg-card shadow-sm">
      <table className="w-full text-xs text-left">
        <thead className="bg-muted/50 text-muted-foreground border-b border-border/50 uppercase tracking-wider text-[10px]">
          <tr>
            <th className="py-3 px-4 font-semibold">Alerta / Reporte</th>
            <th className="py-3 px-4 font-semibold">Severidad</th>
            <th className="py-3 px-4 font-semibold">Regla de Umbral</th>
            <th className="py-3 px-4 font-semibold">Frecuencia</th>
            <th className="py-3 px-4 font-semibold">Estado Actual</th>
            <th className="py-3 px-4 font-semibold">Activo</th>
            <th className="py-3 px-4 font-semibold text-right">Acciones</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/40">
          {alerts.map((alert) => {
            const isTesting = testingId === alert.id;

            return (
              <tr key={alert.id} className="hover:bg-muted/30 transition-colors">
                {/* Nombre y Reporte */}
                <td className="py-3.5 px-4 font-medium text-foreground">
                  <div className="space-y-0.5">
                    <div className="font-semibold text-foreground text-xs flex items-center gap-2">
                      <span>{alert.name}</span>
                    </div>
                    <div className="flex items-center gap-1.5 text-[11px] text-muted-foreground">
                      <FileText className="h-3 w-3 shrink-0" />
                      <span className="truncate max-w-[200px]">
                        {alert.report?.name || `Reporte #${alert.report_id}`}
                      </span>
                    </div>
                  </div>
                </td>

                {/* Severidad */}
                <td className="py-3.5 px-4">
                  {alert.severity === "critical" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold border-rose-500/40 bg-rose-500/10 text-rose-600 gap-1"
                    >
                      <Flame className="h-3 w-3" /> Crítica
                    </Badge>
                  )}
                  {alert.severity === "warning" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold border-amber-500/40 bg-amber-500/10 text-amber-600 gap-1"
                    >
                      <AlertTriangle className="h-3 w-3" /> Advertencia
                    </Badge>
                  )}
                  {alert.severity === "info" && (
                    <Badge
                      variant="outline"
                      className="text-[10px] font-semibold border-blue-500/40 bg-blue-500/10 text-blue-600 gap-1"
                    >
                      <Info className="h-3 w-3" /> Informativa
                    </Badge>
                  )}
                </td>

                {/* Regla */}
                <td className="py-3.5 px-4">
                  {alert.conditions && alert.conditions.length > 1 ? (
                    <div className="flex items-center gap-1.5 flex-wrap">
                      <Badge
                        variant="secondary"
                        className="text-[10px] font-semibold bg-primary/10 text-primary border-primary/20"
                      >
                        {alert.conditions.length} condiciones
                      </Badge>
                      <span className="text-[11px] font-mono text-muted-foreground truncate max-w-[180px]">
                        {alert.conditions[0]?.column || "filas"} {alert.conditions[0]?.operator}{" "}
                        {alert.conditions[0]?.value} ...
                      </span>
                    </div>
                  ) : (
                    <Badge
                      variant="outline"
                      className="font-mono text-[11px] px-2 py-0.5 border-border/80 bg-background"
                    >
                      {alert.condition_type === "row_count"
                        ? `Filas ${alert.condition_operator} ${alert.condition_value}`
                        : `${alert.condition_column} ${alert.condition_operator} ${alert.condition_value}`}
                    </Badge>
                  )}
                </td>

                {/* Frecuencia & Canales */}
                <td className="py-3.5 px-4 text-muted-foreground">
                  <div className="space-y-1">
                    <div className="flex items-center gap-1.5 text-[11px]">
                      <Clock className="h-3 w-3 text-amber-500 shrink-0" />
                      <span className="font-mono text-[10px]">{alert.cron_expression}</span>
                    </div>
                    <div className="flex items-center gap-2 text-[10px]">
                      {alert.notify_email && (
                        <span className="flex items-center gap-0.5 text-blue-500" title="Email">
                          <Mail className="h-2.5 w-2.5" />
                          {alert.email_recipients?.length || 0}
                        </span>
                      )}
                      {alert.notify_telegram && (
                        <span className="flex items-center gap-0.5 text-sky-500" title="Telegram Bot">
                          <Send className="h-2.5 w-2.5" />
                          Bot
                        </span>
                      )}
                      {alert.notify_webhook && (
                        <span className="flex items-center gap-0.5 text-purple-500" title="Webhook">
                          <Webhook className="h-2.5 w-2.5" />
                          {alert.webhook_method || "API"}
                        </span>
                      )}
                    </div>
                  </div>
                </td>

                {/* Estado Actual */}
                <td className="py-3.5 px-4">
                  <div className="space-y-1">
                    {alert.status === "triggered" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-bold border-rose-500/50 bg-rose-500/15 text-rose-600 animate-pulse gap-1"
                      >
                        <AlertTriangle className="h-3 w-3" /> ¡Disparada!
                      </Badge>
                    )}
                    {alert.status === "active" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-medium border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                      >
                        Normal / OK
                      </Badge>
                    )}
                    {alert.status === "paused" && (
                      <Badge
                        variant="outline"
                        className="text-[10px] font-normal border-border bg-muted text-muted-foreground"
                      >
                        Pausada
                      </Badge>
                    )}

                    <div className="text-[10px] text-muted-foreground">
                      Último valor: {alert.last_evaluated_value || "—"}
                    </div>
                  </div>
                </td>

                {/* Switch Activo / Pausado */}
                <td className="py-3.5 px-4">
                  <Switch
                    checked={alert.status !== "paused"}
                    disabled={!canUpdate}
                    onCheckedChange={() => onToggle(alert.id)}
                  />
                </td>

                {/* Acciones */}
                <td className="py-3.5 px-4 text-right">
                  <div className="flex items-center justify-end gap-1.5">
                    {/* Botón Probar Ahora */}
                    <PermissionGuard action="view">
                      <Button
                        variant="outline"
                        size="sm"
                        disabled={isTesting}
                        onClick={() => handleQuickTest(alert)}
                        className="h-7 text-xs px-2 gap-1 border-border/70 hover:bg-muted cursor-pointer"
                        title="Evaluar condición en caliente con datos reales"
                      >
                        {isTesting ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : (
                          <Play className="h-3 w-3 text-primary" />
                        )}
                        <span className="hidden sm:inline">Probar</span>
                      </Button>
                    </PermissionGuard>

                    {/* Botón Incidentes */}
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => onViewIncidents(alert)}
                      className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground cursor-pointer"
                      title="Ver historial de disparos e incidentes"
                    >
                      <History className="h-3.5 w-3.5" />
                      <span className="hidden sm:inline">Historial</span>
                    </Button>

                    {/* Menú de Opciones: solo si tiene permiso de editar o eliminar */}
                    {(canUpdate || canDelete) && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button variant="ghost" size="sm" className="h-7 w-7 p-0 cursor-pointer">
                            <MoreVertical className="h-3.5 w-3.5" />
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end">
                          <PermissionGuard action="update">
                            <DropdownMenuItem onClick={() => onEdit(alert)} className="gap-2 text-xs cursor-pointer">
                              <Edit2 className="h-3.5 w-3.5" /> Editar regla
                            </DropdownMenuItem>
                          </PermissionGuard>
                          <PermissionGuard action="delete">
                            <DropdownMenuItem
                              onClick={() => {
                                if (confirm(`¿Eliminar la alerta "${alert.name}"?`)) {
                                  onDelete(alert.id);
                                }
                              }}
                              className="gap-2 text-xs text-rose-600 focus:text-rose-600 cursor-pointer"
                            >
                              <Trash2 className="h-3.5 w-3.5" /> Eliminar alerta
                            </DropdownMenuItem>
                          </PermissionGuard>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
};
