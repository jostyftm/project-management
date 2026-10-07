"use client";

import React, { useState } from "react";
import { VelocityTrendCycle } from "@/types/analytics-types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";
import { TrendingUp, Layers, CheckCircle2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectVelocityChartProps {
  trend: VelocityTrendCycle[];
  isLoading: boolean;
}

export function ProjectVelocityChart({ trend, isLoading }: ProjectVelocityChartProps) {
  const [metricMode, setMetricMode] = useState<"points" | "count">("points");

  if (isLoading) {
    return (
      <div className="h-80 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse border border-slate-200 dark:border-neutral-700" />
    );
  }

  if (!trend || trend.length === 0) {
    return (
      <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-6 text-center space-y-3">
        <div className="inline-flex p-3 rounded-full bg-slate-50 dark:bg-neutral-800 text-slate-400">
          <TrendingUp className="size-6" />
        </div>
        <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
          Sin historial de ciclos suficiente
        </h4>
        <p className="text-xs text-slate-500 max-w-sm mx-auto">
          Crea ciclos o sprints y asocia tareas para medir la velocidad de entrega histórica de tu equipo.
        </p>
      </div>
    );
  }

  const chartData = trend.map((cycle) => ({
    name: cycle.cycle_name,
    comprometidos: metricMode === "points" ? cycle.committed_points : cycle.committed_count,
    completados: metricMode === "points" ? cycle.completed_points : cycle.completed_count,
    tasa: cycle.completion_rate_points,
    estado: cycle.status,
  }));

  const avgCompletionRate =
    trend.length > 0
      ? Math.round(
          trend.reduce((acc, curr) => acc + curr.completion_rate_points, 0) / trend.length
        )
      : 0;

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Velocidad por Sprint / Ciclo (Velocity Trend)
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-indigo-50 text-indigo-700 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
              Efectividad media: {avgCompletionRate}%
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Comparativa de capacidad comprometida vs trabajo completado por iteración
          </p>
        </div>

        {/* Selector de métrica (Puntos de Historia vs Cantidad de ítems) */}
        <div className="inline-flex rounded-lg border border-slate-200 dark:border-neutral-800 p-0.5 bg-slate-50 dark:bg-neutral-800/50">
          <button
            onClick={() => setMetricMode("points")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              metricMode === "points"
                ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Puntos (SP)
          </button>
          <button
            onClick={() => setMetricMode("count")}
            className={`px-2.5 py-1 text-xs font-medium rounded-md transition-colors ${
              metricMode === "count"
                ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs"
                : "text-slate-500 hover:text-slate-900"
            }`}
          >
            Cant. Ítems
          </button>
        </div>
      </div>

      <div className="h-72 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 10, right: 10, left: -15, bottom: 0 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.8} />
            <XAxis
              dataKey="name"
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis
              stroke="#94a3b8"
              fontSize={11}
              tickLine={false}
              axisLine={false}
              allowDecimals={false}
            />
            <Tooltip
              content={({ active, payload, label }) => {
                if (!active || !payload || !payload.length) return null;
                return (
                  <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg p-2.5 shadow-md text-xs space-y-1.5 min-w-[170px]">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-neutral-800 pb-1">
                      {label}
                    </div>
                    {payload.map((entry: any, idx: number) => {
                      const isCommitted = entry.dataKey === "comprometidos";
                      return (
                        <div key={idx} className="flex items-center justify-between gap-3">
                          <div className="flex items-center gap-1.5">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: entry.color || entry.fill }}
                            />
                            <span className="text-slate-600 dark:text-slate-400">
                              {isCommitted ? "Comprometido:" : "Completado:"}
                            </span>
                          </div>
                          <span
                            className={cn(
                              "font-bold",
                              isCommitted
                                ? "text-slate-700 dark:text-slate-300"
                                : "text-indigo-600 dark:text-indigo-400"
                            )}
                          >
                            {entry.value} {metricMode === "points" ? "pts" : "tareas"}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                );
              }}
              cursor={{ fill: "rgba(99, 102, 241, 0.06)" }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              iconType="circle"
              wrapperStyle={{ fontSize: "11px", paddingBottom: "10px" }}
              formatter={(val) => (val === "comprometidos" ? "Comprometido" : "Completado")}
            />
            <Bar
              dataKey="comprometidos"
              fill="#94a3b8"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
            <Bar
              dataKey="completados"
              fill="#4f46e5"
              radius={[4, 4, 0, 0]}
              maxBarSize={36}
            />
          </BarChart>
        </ResponsiveContainer>
      </div>

      <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 text-[11px] text-slate-500 flex items-center justify-between">
        <span>Últimos {trend.length} ciclos evaluados</span>
        <span className="text-slate-400">
          Tip: Útil para proyectar compromisos realistas en el próximo sprint planning.
        </span>
      </div>
    </div>
  );
}
