"use client";

import React from "react";
import { CycleTimeStats } from "@/types/analytics-types";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Clock, ShieldAlert, Award, Info } from "lucide-react";

interface CycleTimeDistributionChartProps {
  stats: CycleTimeStats | null;
  isLoading: boolean;
}

export function CycleTimeDistributionChart({
  stats,
  isLoading,
}: CycleTimeDistributionChartProps) {
  if (isLoading || !stats) {
    return (
      <div className="h-80 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse border border-slate-200 dark:border-neutral-700" />
    );
  }

  const { percentiles, histogram_buckets, scatter_samples } = stats;

  const barColors = [
    "#10b981", // 1-2d verde
    "#3b82f6", // 3-5d azul
    "#8b5cf6", // 6-10d purpura
    "#f59e0b", // 11-15d ambar
    "#ef4444", // 16d+ rojo
  ];

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-5">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <div className="flex items-center gap-2">
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Distribución de Cycle Time (Tiempo de Ciclo)
            </h4>
            <span className="px-2 py-0.5 rounded-full text-[11px] font-medium bg-purple-50 text-purple-700 dark:bg-purple-950/40 dark:text-purple-400 border border-purple-200 dark:border-purple-800">
              {percentiles.total_completed_analyzed} tareas analizadas
            </span>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
            Tiempo transcurrido desde el inicio de trabajo activo hasta el cierre definitivo
          </p>
        </div>

        {/* Badges de Percentiles Clave */}
        <div className="flex flex-wrap items-center gap-2">
          <div className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-center">
            <span className="text-[10px] font-medium text-slate-400 block uppercase">P50 (Mediana)</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {percentiles.p50}d
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-purple-50 dark:bg-purple-950/40 border border-purple-200 dark:border-purple-800 text-center">
            <span className="text-[10px] font-semibold text-purple-600 block uppercase">
              P85 (SLE Objetivo)
            </span>
            <span className="text-xs font-bold text-purple-700 dark:text-purple-300">
              {percentiles.p85}d
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-center">
            <span className="text-[10px] font-medium text-slate-400 block uppercase">P95</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {percentiles.p95}d
            </span>
          </div>

          <div className="px-2.5 py-1 rounded-lg bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 text-center">
            <span className="text-[10px] font-medium text-slate-400 block uppercase">Promedio</span>
            <span className="text-xs font-bold text-slate-800 dark:text-slate-200">
              {percentiles.average}d
            </span>
          </div>
        </div>
      </div>

      {/* Gráfico de distribución por rangos */}
      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart
            data={histogram_buckets}
            margin={{ top: 10, right: 10, left: -20, bottom: 0 }}
          >
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#f1f5f9" opacity={0.8} />
            <XAxis
              dataKey="range"
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
              content={({ active, payload }) => {
                if (!active || !payload || !payload.length) return null;
                const data = payload[0];
                const bucketColor = data.color || data.fill || "#8b5cf6";
                return (
                  <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-lg p-2.5 shadow-md text-xs space-y-1 min-w-[150px]">
                    <div className="font-semibold text-slate-900 dark:text-slate-100 border-b border-slate-100 dark:border-neutral-800 pb-1">
                      {data.payload?.range}
                    </div>
                    <div className="flex items-center justify-between gap-3 pt-0.5">
                      <div className="flex items-center gap-1.5">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: bucketColor }}
                        />
                        <span className="text-slate-600 dark:text-slate-400">Entregados:</span>
                      </div>
                      <span className="font-bold text-slate-900 dark:text-slate-100">
                        {data.value} ítems
                      </span>
                    </div>
                  </div>
                );
              }}
              cursor={{ fill: "rgba(139, 92, 246, 0.06)" }}
            />
            <Bar dataKey="count" radius={[4, 4, 0, 0]} maxBarSize={48}>
              {histogram_buckets.map((entry, index) => (
                <Cell
                  key={`cell-${index}`}
                  fill={barColors[index % barColors.length]}
                />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>

      {/* Explicación de SLE (Service Level Expectation) */}
      <div className="p-3 bg-purple-50/50 dark:bg-purple-950/20 border border-purple-100 dark:border-purple-900/40 rounded-lg flex items-start gap-2.5 text-xs text-purple-900 dark:text-purple-300">
        <Info className="size-4 shrink-0 mt-0.5 text-purple-600 dark:text-purple-400" />
        <div>
          <span className="font-semibold">Service Level Expectation (SLE P85):</span> Con base en el historial actual, el equipo puede comprometer con un <strong>85% de certeza</strong> que cualquier tarea iniciada se completará en <strong>{percentiles.p85} días o menos</strong>. Los ítems en el rango de 16+ días suelen indicar bloqueos o dependencias no resueltas.
        </div>
      </div>
    </div>
  );
}
