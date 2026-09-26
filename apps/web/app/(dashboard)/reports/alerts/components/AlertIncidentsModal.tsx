"use client";

import React, { useState, useEffect } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ReportAlert, ReportAlertIncident } from "@/types/alert-types";
import { requestAlertIncidents } from "@/services/alert-service";
import {
  AlertTriangle,
  CheckCircle2,
  Clock,
  Mail,
  Loader2,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

interface AlertIncidentsModalProps {
  alert: ReportAlert | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export const AlertIncidentsModal: React.FC<AlertIncidentsModalProps> = ({
  alert,
  open,
  onOpenChange,
}) => {
  const [incidents, setIncidents] = useState<ReportAlertIncident[]>([]);
  const [loading, setLoading] = useState<boolean>(false);
  const [expandedIncidentId, setExpandedIncidentId] = useState<number | null>(null);

  useEffect(() => {
    if (open && alert) {
      setLoading(true);
      requestAlertIncidents(alert.id)
        .then((res) => {
          setIncidents(res?.data ?? []);
        })
        .catch((err) => {
          console.error(err);
        })
        .finally(() => {
          setLoading(false);
        });
    } else {
      setIncidents([]);
      setExpandedIncidentId(null);
    }
  }, [open, alert]);

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
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-3xl max-h-[85vh] flex flex-col p-6">
        <DialogHeader className="pb-3 border-b border-border/60">
          <DialogTitle className="text-lg font-bold flex items-center gap-2">
            <AlertTriangle className="h-5 w-5 text-amber-500" />
            Historial de Incidentes y Evaluaciones
          </DialogTitle>
          <DialogDescription className="text-xs text-muted-foreground">
            Registro cronológico de evaluaciones de la alerta:{" "}
            <span className="font-semibold text-foreground">{alert?.name}</span>
          </DialogDescription>
        </DialogHeader>

        <div className="flex-1 overflow-y-auto py-3 space-y-3">
          {loading ? (
            <div className="py-12 flex flex-col items-center justify-center gap-2 text-xs text-muted-foreground">
              <Loader2 className="h-6 w-6 animate-spin text-primary" />
              <span>Cargando historial de incidentes...</span>
            </div>
          ) : incidents.length === 0 ? (
            <div className="py-12 text-center text-xs text-muted-foreground">
              No hay incidentes registrados para esta alerta todavía.
            </div>
          ) : (
            incidents.map((incident) => {
              const isExpanded = expandedIncidentId === incident.id;
              const hasSample = incident.sample_data && incident.sample_data.length > 0;

              return (
                <div
                  key={incident.id}
                  className={`rounded-xl border transition-all ${
                    incident.triggered
                      ? "border-rose-500/30 bg-rose-500/5 dark:bg-rose-950/10"
                      : "border-border/60 bg-muted/20"
                  }`}
                >
                  <div className="p-3.5 flex items-center justify-between gap-3">
                    <div className="flex items-center gap-2.5">
                      {incident.triggered ? (
                        <div className="p-1.5 rounded-lg bg-rose-500/10 text-rose-600">
                          <AlertTriangle className="h-4 w-4" />
                        </div>
                      ) : (
                        <div className="p-1.5 rounded-lg bg-emerald-500/10 text-emerald-600">
                          <CheckCircle2 className="h-4 w-4" />
                        </div>
                      )}
                      <div>
                        <div className="flex items-center gap-2">
                          <Badge
                            variant="outline"
                            className={`text-[10px] font-semibold uppercase px-1.5 py-0.2 ${
                              incident.triggered
                                ? "border-rose-500/40 bg-rose-500/10 text-rose-600"
                                : "border-emerald-500/40 bg-emerald-500/10 text-emerald-600"
                            }`}
                          >
                            {incident.triggered ? "Disparada" : "Normal / OK"}
                          </Badge>
                          <span className="font-semibold text-xs text-foreground">
                            Valor: {incident.evaluated_value || "—"}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[11px] text-muted-foreground mt-0.5">
                          <Clock className="h-3 w-3" />
                          <span>{formatDateTime(incident.created_at)}</span>
                          <span>•</span>
                          <span>Umbral: {incident.threshold_snapshot}</span>
                        </div>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {incident.notification_status === "sent" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 border-blue-500/30 bg-blue-500/10 text-blue-600"
                        >
                          <Mail className="h-3 w-3" />
                          Notificada
                        </Badge>
                      )}
                      {incident.notification_status === "throttled" && (
                        <Badge
                          variant="outline"
                          className="text-[10px] gap-1 border-amber-500/30 bg-amber-500/10 text-amber-600"
                        >
                          <Clock className="h-3 w-3" />
                          Cooldown (Silenciada)
                        </Badge>
                      )}

                      {hasSample && (
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => setExpandedIncidentId(isExpanded ? null : incident.id)}
                          className="h-7 text-xs px-2 gap-1 text-muted-foreground hover:text-foreground"
                        >
                          {isExpanded ? (
                            <>
                              Ocultar muestra <ChevronUp className="h-3.5 w-3.5" />
                            </>
                          ) : (
                            <>
                              Ver muestra ({incident.sample_data?.length}){" "}
                              <ChevronDown className="h-3.5 w-3.5" />
                            </>
                          )}
                        </Button>
                      )}
                    </div>
                  </div>

                  {/* Tabla con la muestra de registros afectados */}
                  {isExpanded && hasSample && (
                    <div className="px-3.5 pb-3.5 pt-1 border-t border-border/40">
                      <div className="text-[11px] font-semibold text-muted-foreground mb-1.5">
                        Muestra de datos capturada en el momento del disparo:
                      </div>
                      <div className="overflow-x-auto rounded-lg border border-border/60 max-h-48">
                        <table className="w-full text-left text-[11px]">
                          <thead className="bg-muted/60 text-muted-foreground border-b border-border/50 uppercase text-[10px]">
                            <tr>
                              {Object.keys(incident.sample_data![0]).map((k) => (
                                <th key={k} className="py-1.5 px-2.5 font-semibold">
                                  {k}
                                </th>
                              ))}
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-border/30">
                            {incident.sample_data!.map((row, rIdx) => (
                              <tr key={rIdx} className="hover:bg-muted/30">
                                {Object.values(row).map((v, cIdx) => (
                                  <td key={cIdx} className="py-1.5 px-2.5 font-mono text-[10px]">
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
                </div>
              );
            })
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};
