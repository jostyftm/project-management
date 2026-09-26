"use client";

import React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { DashboardKpis } from "@/types/dashboard-types";
import {
  FileText,
  Activity,
  CheckCircle2,
  CalendarClock,
  Users,
  TrendingUp,
  Database,
  Timer,
} from "lucide-react";

interface OverviewKpiCardsProps {
  kpis?: DashboardKpis;
}

export const OverviewKpiCards: React.FC<OverviewKpiCardsProps> = ({ kpis }) => {
  if (!kpis) return null;

  const successRateColor =
    kpis.success_rate >= 90
      ? "text-emerald-600 dark:text-emerald-400"
      : kpis.success_rate >= 70
      ? "text-amber-600 dark:text-amber-400"
      : "text-rose-600 dark:text-rose-400";

  const successBgColor =
    kpis.success_rate >= 90
      ? "bg-emerald-500/10 border-emerald-500/20"
      : kpis.success_rate >= 70
      ? "bg-amber-500/10 border-amber-500/20"
      : "bg-rose-500/10 border-rose-500/20";

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4">
      {/* 1. Total Reportes */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70 hover:border-blue-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Total Reportes</span>
          <div className="p-2 rounded-lg bg-blue-500/10 text-blue-600 dark:text-blue-400">
            <FileText className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {kpis.total_reports}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <Database className="h-3 w-3 text-muted-foreground/70" />
            <span>{kpis.total_connections} conexión{kpis.total_connections !== 1 ? "es" : ""} BD</span>
          </div>
        </div>
      </Card>

      {/* 2. Ejecuciones Hoy */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70 hover:border-indigo-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Ejecuciones Hoy</span>
          <div className="p-2 rounded-lg bg-indigo-500/10 text-indigo-600 dark:text-indigo-400">
            <Activity className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {kpis.executions_today}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <TrendingUp className="h-3 w-3 text-indigo-500/70" />
            <span>{kpis.total_executions} acumuladas</span>
          </div>
        </div>
      </Card>

      {/* 3. Tasa de Éxito */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70 hover:border-emerald-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Tasa de Éxito</span>
          <div className={`p-2 rounded-lg ${successBgColor} ${successRateColor}`}>
            <CheckCircle2 className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className={`text-2xl font-bold tracking-tight ${successRateColor}`}>
            {kpis.success_rate}%
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span>Salud operativa</span>
          </div>
        </div>
      </Card>

      {/* 4. Programadas Activas */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70 hover:border-amber-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Programadas</span>
          <div className="p-2 rounded-lg bg-amber-500/10 text-amber-600 dark:text-amber-400">
            <CalendarClock className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {kpis.active_schedules}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-amber-500" />
            <span>En calendario</span>
          </div>
        </div>
      </Card>

      {/* 5. Usuarios Asignados */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70 hover:border-purple-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Usuarios SDI</span>
          <div className="p-2 rounded-lg bg-purple-500/10 text-purple-600 dark:text-purple-400">
            <Users className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {kpis.total_users}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-purple-500" />
            <span>Sincronizados</span>
          </div>
        </div>
      </Card>

      {/* 6. Tiempo de Ejecución Promedio (mejora 4.1) */}
      <Card className="p-4 gap-0 relative overflow-hidden transition-all duration-200 hover:shadow-md border-border/70 hover:border-cyan-500/40">
        <div className="flex items-center justify-between">
          <span className="text-xs font-medium text-muted-foreground">Tiempo Prom.</span>
          <div className="p-2 rounded-lg bg-cyan-500/10 text-cyan-600 dark:text-cyan-400">
            <Timer className="h-4 w-4" />
          </div>
        </div>
        <div className="mt-2.5">
          <div className="text-2xl font-bold tracking-tight text-foreground">
            {kpis.avg_exec_ms !== undefined && kpis.avg_exec_ms > 0
              ? kpis.avg_exec_ms > 1000
                ? `${(kpis.avg_exec_ms / 1000).toFixed(1)}s`
                : `${kpis.avg_exec_ms}ms`
              : "< 1s"}
          </div>
          <div className="flex items-center gap-1.5 mt-1 text-xs text-muted-foreground">
            <span className="inline-block h-1.5 w-1.5 rounded-full bg-cyan-500" />
            <span className="truncate">
              {kpis.slowest_report?.report_name
                ? `Máx: ${kpis.slowest_report.report_name}`
                : "Motor de ejecución"}
            </span>
          </div>
        </div>
      </Card>
    </div>
  );
};
