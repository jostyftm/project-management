"use client";

import React, { useState, useEffect } from "react";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { ReportAlert, ReportAlertIncident } from "@/types/alert-types";
import { requestAlertIncidents } from "@/services/alert-service";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Send,
  Globe,
  Loader2,
  ChevronDown,
  ChevronUp,
  X,
  RefreshCw,
  Terminal,
  Table as TableIcon,
  Check,
  AlertCircle,
} from "lucide-react";

interface AlertIncidentsDrawerProps {
  alert: ReportAlert | null;
  open: boolean;
  onClose: () => void;
}

export const AlertIncidentsDrawer: React.FC<AlertIncidentsDrawerProps> = ({
  alert,
  open,
  onClose,
}) => {
  const [incidents, setIncidents] = useState<ReportAlertIncident[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedIncidentId, setExpandedIncidentId] = useState<number | null>(null);
  const [activeTabByIncident, setActiveTabByIncident] = useState<
    Record<number, "sample" | "logs">
  >({});

  const fetchIncidents = () => {
    if (!alert) return;
    setLoading(true);
    requestAlertIncidents(alert.id)
      .then((res) => {
        setIncidents(res?.data ?? []);
        if (res?.data && res.data.length > 0) {
          // Auto-expand first incident if triggered
          const first = res.data[0];
          if (first.triggered) {
            setExpandedIncidentId(first.id);
          }
        }
      })
      .catch((err) => {
        console.error("Error fetching incidents:", err);
      })
      .finally(() => {
        setLoading(false);
      });
  };

  useEffect(() => {
    if (open && alert) {
      fetchIncidents();
    } else {
      setIncidents([]);
      setExpandedIncidentId(null);
      setActiveTabByIncident({});
    }
  }, [open, alert]);

  // Handle escape key
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && open) {
        onClose();
      }
    };
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [open, onClose]);

  if (!open) return null;

  const formatDateTime = (dateStr: string) => {
    try {
      const d = new Date(dateStr);
      return new Intl.DateTimeFormat("es-MX", {
        day: "2-digit",
        month: "short",
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
      }).format(d);
    } catch {
      return dateStr;
    }
  };

  return (
    <div className="fixed inset-0 z-50 overflow-hidden">
      {/* Backdrop */}
      <div
        onClick={onClose}
        className="fixed inset-0 bg-black/50 backdrop-blur-xs transition-opacity animate-in fade-in duration-200"
      />

      {/* Sliding Lateral Drawer (1/3 screen width on large screens) */}
      <div
        className="fixed inset-y-0 right-0 z-50 flex flex-col bg-background shadow-2xl border-l border-border
                   w-full sm:w-[500px] lg:w-[35vw] xl:w-[33vw] max-w-full
                   animate-in slide-in-from-right duration-300 ease-out"
      >
        {/* Header */}
        <div className="p-4 border-b border-border bg-muted/20 flex items-start justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <div className="p-1.5 rounded-lg bg-amber-500/10 text-amber-600">
                <AlertTriangle className="h-4 w-4" />
              </div>
              <h2 className="text-sm font-bold text-foreground">Historial de Incidentes</h2>
            </div>
            <p className="text-xs text-muted-foreground mt-1 line-clamp-1">
              Alerta: <span className="font-semibold text-foreground">{alert?.name}</span>
            </p>
          </div>

          <div className="flex items-center gap-1">
            <Button
              variant="ghost"
              size="icon"
              onClick={fetchIncidents}
              disabled={loading}
              title="Recargar historial"
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <RefreshCw className={`h-4 w-4 ${loading ? "animate-spin" : ""}`} />
            </Button>
            <Button
              variant="ghost"
              size="icon"
              onClick={onClose}
              className="h-8 w-8 text-muted-foreground hover:text-foreground"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </div>

        {/* Incidents List Container */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-24 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Cargando historial de evaluaciones...</span>
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-20 text-center text-xs text-muted-foreground">
              <Clock className="h-8 w-8 mx-auto mb-2 text-muted-foreground/50" />
              No hay incidentes ni evaluaciones registradas todavía para esta alerta.
            </div>
          ) : (
            incidents.map((incident) => {
              const isExpanded = expandedIncidentId === incident.id;
              const hasSample = !!incident.sample_data && incident.sample_data.length > 0;
              const hasLogs = !!incident.notification_logs && Object.keys(incident.notification_logs).length > 0;
              const currentTab = activeTabByIncident[incident.id] || (hasSample ? "sample" : "logs");

              return (
                <div
                  key={incident.id}
                  className={`rounded-xl border transition-all ${
                    incident.triggered
                      ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10 shadow-xs"
                      : "border-border/60 bg-muted/15"
                  }`}
                >
                  {/* Item Header */}
                  <div
                    onClick={() => setExpandedIncidentId(isExpanded ? null : incident.id)}
                    className="p-3 cursor-pointer hover:bg-muted/20 transition-colors flex items-center justify-between gap-2"
                  >
                    <div className="flex items-start gap-2.5 min-w-0">
                      {incident.triggered ? (
                        <div className="p-1 rounded-md bg-rose-500/10 text-rose-600 shrink-0 mt-0.5">
                          <AlertTriangle className="h-3.5 w-3.5" />
                        </div>
                      ) : (
                        <div className="p-1 rounded-md bg-emerald-500/10 text-emerald-600 shrink-0 mt-0.5">
                          <CheckCircle2 className="h-3.5 w-3.5" />
                        </div>
                      )}

                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 flex-wrap">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-bold px-1.5 py-0 uppercase ${
                              incident.triggered
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {incident.triggered ? "Disparada" : "OK"}
                          </Badge>
                          <span className="text-xs font-semibold text-foreground truncate">
                            Valor: {incident.evaluated_value || "—"}
                          </span>
                        </div>
                        <div className="text-[11px] text-muted-foreground flex items-center gap-1.5 mt-0.5">
                          <span>{formatDateTime(incident.created_at)}</span>
                          <span>•</span>
                          <span className="truncate" title={incident.threshold_snapshot || ""}>
                            {incident.threshold_snapshot}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-1.5 shrink-0">
                      {incident.notification_status === "sent" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600"
                        >
                          <Mail className="h-2.5 w-2.5" /> Enviada
                        </Badge>
                      )}
                      {incident.notification_status === "throttled" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600"
                        >
                          <Clock className="h-2.5 w-2.5" /> Cooldown
                        </Badge>
                      )}
                      {incident.notification_status === "failed" && (
                        <Badge
                          variant="outline"
                          className="text-[9px] gap-1 border-rose-500/30 bg-rose-500/10 text-rose-600"
                        >
                          <AlertCircle className="h-2.5 w-2.5" /> Error
                        </Badge>
                      )}

                      <div className="text-muted-foreground">
                        {isExpanded ? (
                          <ChevronUp className="h-4 w-4" />
                        ) : (
                          <ChevronDown className="h-4 w-4" />
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Expanded Details */}
                  {isExpanded && (
                    <div className="px-3 pb-3 pt-1 border-t border-border/40 space-y-2">
                      {/* Internal Sub-Tabs */}
                      <div className="flex items-center gap-1.5 border-b border-border/40 pb-2">
                        {hasSample && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTabByIncident((prev) => ({
                                ...prev,
                                [incident.id]: "sample",
                              }))
                            }
                            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                              currentTab === "sample"
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                          >
                            <TableIcon className="h-3 w-3" />
                            Muestra ({incident.sample_data?.length})
                          </button>
                        )}

                        {hasLogs && (
                          <button
                            type="button"
                            onClick={() =>
                              setActiveTabByIncident((prev) => ({
                                ...prev,
                                [incident.id]: "logs",
                              }))
                            }
                            className={`flex items-center gap-1 text-[11px] font-medium px-2 py-1 rounded-md transition-colors ${
                              currentTab === "logs"
                                ? "bg-primary text-primary-foreground font-semibold"
                                : "text-muted-foreground hover:bg-muted/40 hover:text-foreground"
                            }`}
                          >
                            <Terminal className="h-3 w-3" />
                            Debugger de Notificaciones
                          </button>
                        )}
                      </div>

                      {/* Content: Sample Data Table (Isolated Horizontal Scroll) */}
                      {currentTab === "sample" && hasSample && (
                        <div className="space-y-1">
                          <div className="text-[10px] text-muted-foreground">
                            Primeros registros detectados durante la evaluación:
                          </div>
                          <div className="overflow-x-auto rounded-lg border border-border/60 max-h-48 scrollbar-thin">
                            <table className="w-full text-left text-[10px]">
                              <thead className="bg-muted/70 text-muted-foreground border-b border-border uppercase font-semibold sticky top-0">
                                <tr>
                                  {Object.keys(incident.sample_data![0]).map((col) => (
                                    <th key={col} className="py-1 px-2 whitespace-nowrap">
                                      {col}
                                    </th>
                                  ))}
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/40">
                                {incident.sample_data!.map((row, rIdx) => (
                                  <tr key={rIdx} className="hover:bg-muted/30">
                                    {Object.values(row).map((v, cIdx) => (
                                      <td
                                        key={cIdx}
                                        className="py-1 px-2 font-mono text-[10px] whitespace-nowrap"
                                      >
                                        {typeof v === "object" ? JSON.stringify(v) : String(v)}
                                      </td>
                                    ))}
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        </div>
                      )}

                      {/* Content: Notification Logs Debugger */}
                      {currentTab === "logs" && hasLogs && (
                        <div className="space-y-2 text-xs">
                          {/* Webhook Log */}
                          {incident.notification_logs?.webhook && (
                            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-foreground">
                                  <Globe className="h-3.5 w-3.5 text-blue-500" />
                                  <span>Webhook HTTP</span>
                                  <Badge variant="outline" className="text-[9px] uppercase px-1 py-0">
                                    {incident.notification_logs.webhook.method || "POST"}
                                  </Badge>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {incident.notification_logs.webhook.latency_ms !== undefined && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {incident.notification_logs.webhook.latency_ms} ms
                                    </span>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 ${
                                      incident.notification_logs.webhook.status === "sent"
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                                        : "border-rose-500/40 bg-rose-500/10 text-rose-600"
                                    }`}
                                  >
                                    {incident.notification_logs.webhook.status_code
                                      ? `HTTP ${incident.notification_logs.webhook.status_code}`
                                      : incident.notification_logs.webhook.status}
                                  </Badge>
                                </div>
                              </div>

                              <div className="text-[10px] text-muted-foreground truncate font-mono">
                                {incident.notification_logs.webhook.url}
                              </div>

                              {incident.notification_logs.webhook.error && (
                                <div className="p-1.5 rounded bg-rose-500/10 text-rose-600 text-[10px]">
                                  <strong>Error:</strong> {incident.notification_logs.webhook.error}
                                </div>
                              )}

                              {incident.notification_logs.webhook.payload_sent && (
                                <div>
                                  <span className="text-[10px] font-medium text-muted-foreground">Payload enviado:</span>
                                  <pre className="mt-0.5 p-1.5 rounded bg-slate-900 text-slate-100 text-[9px] font-mono overflow-x-auto max-h-24 scrollbar-thin">
                                    {typeof incident.notification_logs.webhook.payload_sent === "string"
                                      ? incident.notification_logs.webhook.payload_sent
                                      : JSON.stringify(incident.notification_logs.webhook.payload_sent, null, 2)}
                                  </pre>
                                </div>
                              )}

                              {incident.notification_logs.webhook.response_body && (
                                <div>
                                  <span className="text-[10px] font-medium text-muted-foreground">Respuesta del servidor:</span>
                                  <pre className="mt-0.5 p-1.5 rounded bg-slate-900 text-slate-100 text-[9px] font-mono overflow-x-auto max-h-24 scrollbar-thin">
                                    {incident.notification_logs.webhook.response_body}
                                  </pre>
                                </div>
                              )}
                            </div>
                          )}

                          {/* Telegram Log */}
                          {incident.notification_logs?.telegram && (
                            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-foreground">
                                  <Send className="h-3.5 w-3.5 text-sky-500" />
                                  <span>Telegram Bot</span>
                                </div>
                                <div className="flex items-center gap-1.5">
                                  {incident.notification_logs.telegram.latency_ms !== undefined && (
                                    <span className="text-[10px] text-muted-foreground">
                                      {incident.notification_logs.telegram.latency_ms} ms
                                    </span>
                                  )}
                                  <Badge
                                    variant="outline"
                                    className={`text-[9px] px-1 py-0 ${
                                      incident.notification_logs.telegram.status === "sent"
                                        ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                                        : "border-rose-500/40 bg-rose-500/10 text-rose-600"
                                    }`}
                                  >
                                    {incident.notification_logs.telegram.status === "sent" ? "Entregado" : "Falló"}
                                  </Badge>
                                </div>
                              </div>

                              {incident.notification_logs.telegram.error && (
                                <div className="p-1.5 rounded bg-rose-500/10 text-rose-600 text-[10px]">
                                  <strong>Error:</strong> {incident.notification_logs.telegram.error}
                                </div>
                              )}
                            </div>
                          )}

                          {/* Email Log */}
                          {incident.notification_logs?.email && (
                            <div className="p-2.5 rounded-lg border border-border/60 bg-muted/20 space-y-1.5">
                              <div className="flex items-center justify-between">
                                <div className="flex items-center gap-1.5 font-semibold text-[11px] text-foreground">
                                  <Mail className="h-3.5 w-3.5 text-blue-500" />
                                  <span>Correo Electrónico</span>
                                </div>
                                <Badge
                                  variant="outline"
                                  className={`text-[9px] px-1 py-0 ${
                                    incident.notification_logs.email.status === "sent"
                                      ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                                      : "border-rose-500/40 bg-rose-500/10 text-rose-600"
                                  }`}
                                >
                                  {incident.notification_logs.email.status === "sent" ? "Enviado" : "Falló"}
                                </Badge>
                              </div>

                              {incident.notification_logs.email.recipients && (
                                <div className="text-[10px] text-muted-foreground truncate">
                                  Destinatarios: {incident.notification_logs.email.recipients.join(", ")}
                                </div>
                              )}

                              {incident.notification_logs.email.error && (
                                <div className="p-1.5 rounded bg-rose-500/10 text-rose-600 text-[10px]">
                                  <strong>Error:</strong> {incident.notification_logs.email.error}
                                </div>
                              )}
                            </div>
                          )}
                        </div>
                      )}

                      {/* General Error if any */}
                      {incident.error_message && (
                        <div className="p-2 rounded bg-rose-500/10 border border-rose-500/20 text-rose-600 text-[11px]">
                          <strong>Detalle del fallo:</strong> {incident.error_message}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
};

export default AlertIncidentsDrawer;
