"use client";

import React from "react";
import { Card } from "@/components/ui/card";
import { ReportAlert } from "@/types/alert-types";
import { Bell, CheckCircle2, AlertTriangle, Clock } from "lucide-react";

interface AlertMetricsCardsProps {
  alerts: ReportAlert[];
}

export const AlertMetricsCards: React.FC<AlertMetricsCardsProps> = ({ alerts }) => {
  const total = alerts.length;
  const active = alerts.filter((a) => a.status === "active").length;
  const triggered = alerts.filter((a) => a.status === "triggered").length;
  const paused = alerts.filter((a) => a.status === "paused").length;

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* Total Alertas */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Total Reglas de Alerta</span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <Bell className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">{total}</div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span>Watchdogs configurados</span>
          </div>
        </div>
      </Card>

      {/* Alertas Normales / Activas */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">En Estado Normal</span>
          <div className="p-2 rounded-lg bg-emerald-500/10 text-emerald-600 dark:text-emerald-400">
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-emerald-600 dark:text-emerald-400">
            {active}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span>Operación dentro de umbrales</span>
          </div>
        </div>
      </Card>

      {/* Alertas Disparadas */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70 hover:border-rose-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">¡Disparadas / Incidentes!</span>
          <div className="p-2 rounded-lg bg-rose-500/10 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className={`text-2xl font-bold tracking-tight ${triggered > 0 ? "text-rose-600 dark:text-rose-400" : "text-foreground"}`}>
            {triggered}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            {triggered > 0 ? (
              <span className="text-rose-600 font-medium">Requieren atención inmediata</span>
            ) : (
              <span>Sin incidentes activos</span>
            )}
          </div>
        </div>
      </Card>

      {/* Pausadas */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Pausadas</span>
          <div className="p-2 rounded-lg bg-muted text-muted-foreground">
            <Clock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">{paused}</div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span>En mantenimiento o silenciadas</span>
          </div>
        </div>
      </Card>
    </div>
  );
};
