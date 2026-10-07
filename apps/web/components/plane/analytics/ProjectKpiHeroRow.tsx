"use client";

import React from "react";
import { ProjectKpiOverview } from "@/types/analytics-types";
import {
  TrendingUp,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bug,
  ShieldCheck,
  Flame,
  Activity,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectKpiHeroRowProps {
  overview: ProjectKpiOverview | null;
  isLoading: boolean;
}

export function ProjectKpiHeroRow({ overview, isLoading }: ProjectKpiHeroRowProps) {
  if (isLoading || !overview) {
    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {[1, 2, 3, 4].map((i) => (
          <div
            key={i}
            className="h-32 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse border border-slate-200 dark:border-neutral-700"
          />
        ))}
      </div>
    );
  }

  const { summary, speed_and_throughput, delivery_and_quality } = overview;

  const healthBadge = {
    on_track: {
      label: "En Curso (Saludable)",
      bg: "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-400 dark:border-emerald-800",
      dot: "bg-emerald-500",
    },
    at_risk: {
      label: "En Riesgo",
      bg: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-400 dark:border-amber-800",
      dot: "bg-amber-500",
    },
    off_track: {
      label: "Desviado (Atención)",
      bg: "bg-rose-50 text-rose-700 border-rose-200 dark:bg-rose-950/40 dark:text-rose-400 dark:border-rose-800",
      dot: "bg-rose-500",
    },
  }[summary.health_status] || {
    label: "En Curso",
    bg: "bg-slate-50 text-slate-700 border-slate-200",
    dot: "bg-slate-500",
  };

  return (
    <div className="space-y-4">
      {/* Barra de estado general del proyecto */}
      <div className="flex flex-wrap items-center justify-between gap-3 p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs">
        <div className="flex items-center gap-3">
          <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
            <Activity className="size-5" />
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="text-sm font-semibold text-slate-900 dark:text-slate-100">
                Estado Operativo del Proyecto
              </span>
              <span
                className={cn(
                  "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                  healthBadge.bg
                )}
              >
                <span className={cn("size-1.5 rounded-full", healthBadge.dot)} />
                {healthBadge.label}
              </span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              {summary.completed_items} de {summary.total_items} ítems completados ({summary.completion_percentage}%) •{" "}
              {summary.in_progress_wip} en curso activo • {summary.unstarted_items} pendientes
            </p>
          </div>
        </div>

        <div className="flex items-center gap-4 text-xs text-slate-600 dark:text-slate-400">
          <div className="text-right">
            <span className="block font-semibold text-slate-900 dark:text-slate-200">
              {summary.completed_estimate_points} / {summary.total_estimate_points} pts
            </span>
            <span className="text-[11px] text-slate-400">Puntos de Historia</span>
          </div>
          <div className="w-28 bg-slate-100 dark:bg-neutral-800 h-2 rounded-full overflow-hidden">
            <div
              className="bg-indigo-600 h-full rounded-full transition-all duration-500"
              style={{
                width: `${
                  summary.total_estimate_points > 0
                    ? Math.min(
                        100,
                        Math.round(
                          (summary.completed_estimate_points / summary.total_estimate_points) * 100
                        )
                      )
                    : summary.completion_percentage
                }%`,
              }}
            />
          </div>
        </div>
      </div>

      {/* Tarjetas de 4 pilares clave de KPIs empresariales */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
        {/* KPI 1: Velocidad (Velocity & Throughput) */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Velocidad (14 días)
            </span>
            <div className="p-1.5 bg-blue-50 dark:bg-blue-950/40 text-blue-600 rounded-md">
              <TrendingUp className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {speed_and_throughput.velocity_14d_points}
              </span>
              <span className="text-xs font-medium text-slate-500">story points</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {speed_and_throughput.velocity_14d_items} tareas cerradas en los últimos 14 días
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-between text-[11px] text-slate-500">
            <span>En periodo seleccionado:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {speed_and_throughput.throughput_period_items} ítems ({speed_and_throughput.throughput_period_points} pts)
            </span>
          </div>
        </div>

        {/* KPI 2: Cycle Time & Percentil 85 (SLE) */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Cycle Time (SLE P85)
            </span>
            <div className="p-1.5 bg-purple-50 dark:bg-purple-950/40 text-purple-600 rounded-md">
              <Clock className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {speed_and_throughput.p85_cycle_time_days}
              </span>
              <span className="text-xs font-medium text-slate-500">días (P85)</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              Promedio: {speed_and_throughput.avg_cycle_time_days}d • Lead Time: {speed_and_throughput.avg_lead_time_days}d
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-between text-[11px] text-slate-500">
            <span>Compromiso SLE:</span>
            <span className="font-semibold text-purple-700 dark:text-purple-400">
              85% se entrega en ≤ {speed_and_throughput.p85_cycle_time_days}d
            </span>
          </div>
        </div>

        {/* KPI 3: On-Time Delivery Rate (Cumplimiento de Plazo) */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Entrega a Tiempo (OTD)
            </span>
            <div
              className={cn(
                "p-1.5 rounded-md",
                delivery_and_quality.on_time_delivery_rate >= 85
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
                  : delivery_and_quality.on_time_delivery_rate >= 70
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-600"
              )}
            >
              <CheckCircle2 className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {delivery_and_quality.on_time_delivery_rate}%
              </span>
              <span className="text-xs font-medium text-slate-500">de cumplimiento</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {delivery_and_quality.items_completed_on_time} a tiempo de {delivery_and_quality.items_with_target_date} con fecha límite
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-between text-[11px] text-slate-500">
            <span>Vencidas activas:</span>
            <span
              className={cn(
                "font-semibold",
                delivery_and_quality.overdue_active_items > 0
                  ? "text-rose-600 dark:text-rose-400 font-bold"
                  : "text-emerald-600"
              )}
            >
              {delivery_and_quality.overdue_active_items} retrasadas
            </span>
          </div>
        </div>

        {/* KPI 4: Densidad de Defectos y Calidad */}
        <div className="p-4 bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs space-y-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
              Densidad de Defectos
            </span>
            <div
              className={cn(
                "p-1.5 rounded-md",
                delivery_and_quality.defect_density_rate <= 15
                  ? "bg-emerald-50 dark:bg-emerald-950/40 text-emerald-600"
                  : delivery_and_quality.defect_density_rate <= 30
                  ? "bg-amber-50 dark:bg-amber-950/40 text-amber-600"
                  : "bg-rose-50 dark:bg-rose-950/40 text-rose-600"
              )}
            >
              <Bug className="size-4" />
            </div>
          </div>
          <div>
            <div className="flex items-baseline gap-2">
              <span className="text-2xl font-bold text-slate-900 dark:text-slate-50">
                {delivery_and_quality.defect_density_rate}%
              </span>
              <span className="text-xs font-medium text-slate-500">ratio de bugs</span>
            </div>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
              {delivery_and_quality.resolved_bugs} de {delivery_and_quality.total_bugs} bugs resueltos
            </p>
          </div>
          <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex justify-between text-[11px] text-slate-500">
            <span>Tasa de resolución:</span>
            <span className="font-semibold text-slate-700 dark:text-slate-300">
              {delivery_and_quality.total_bugs > 0
                ? Math.round(
                    (delivery_and_quality.resolved_bugs / delivery_and_quality.total_bugs) * 100
                  )
                : 100}
              % resueltos
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}
