"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { TrendingUp, TrendingDown, Minus } from "lucide-react";
import { LineChart, Line, ResponsiveContainer } from "recharts";

interface KpiRowBlockProps {
  block: ReportBlock;
  data?: {
    kpis?: Array<{
      key: string;
      label: string;
      value: number;
      previous?: number | null;
      delta?: number | null;
      delta_percent?: number | null;
      icon?: string;
      variant?: string;
    }>;
    sparkline?: Array<{ date: string; value: number }>;
    period?: { from: string; to: string };
  };
}

export function KpiRowBlock({ block, data }: KpiRowBlockProps) {
  const kpis = data?.kpis || [
    { key: "total", label: "Total Work Items", value: 0, delta_percent: 0, icon: "📋" },
    { key: "completed", label: "Completadas", value: 0, delta_percent: 0, icon: "✅" },
    { key: "in_progress", label: "En Progreso", value: 0, icon: "🔄" },
    { key: "overdue", label: "Vencidas", value: 0, icon: "⚠️", variant: "danger" },
  ];

  const sparklineData = data?.sparkline || [];

  return (
    <div className="w-full">
      {block.title && (
        <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-3">
          {block.title}
        </h4>
      )}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
        {kpis.map((kpi) => {
          const isPositive = (kpi.delta ?? 0) > 0;
          const isNegative = (kpi.delta ?? 0) < 0;

          return (
            <div
              key={kpi.key}
              className="bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-4 shadow-xs relative overflow-hidden flex flex-col justify-between"
            >
              <div className="flex items-center justify-between text-xs text-neutral-500 dark:text-neutral-400 mb-1">
                <span className="font-medium truncate">{kpi.label}</span>
                <span className="text-base">{kpi.icon}</span>
              </div>

              <div className="flex items-baseline gap-2 mt-1">
                <span className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
                  {kpi.value.toLocaleString()}
                </span>
                {kpi.delta_percent !== undefined && kpi.delta_percent !== null && (
                  <span
                    className={`inline-flex items-center text-xs font-semibold px-1.5 py-0.5 rounded-full ${
                      isPositive
                        ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
                        : isNegative
                        ? "bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400"
                        : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
                    }`}
                  >
                    {isPositive ? (
                      <TrendingUp className="w-3 h-3 mr-0.5" />
                    ) : isNegative ? (
                      <TrendingDown className="w-3 h-3 mr-0.5" />
                    ) : (
                      <Minus className="w-3 h-3 mr-0.5" />
                    )}
                    {Math.abs(kpi.delta_percent)}%
                  </span>
                )}
              </div>

              {sparklineData.length > 0 && (
                <div className="h-7 w-full mt-2 -mb-1">
                  <ResponsiveContainer width="100%" height="100%">
                    <LineChart data={sparklineData}>
                      <Line
                        type="monotone"
                        dataKey="value"
                        stroke="#6366f1"
                        strokeWidth={2}
                        dot={false}
                      />
                    </LineChart>
                  </ResponsiveContainer>
                </div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function KpiRowConfigPanel({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  const metrics = config.metrics || ["total", "completed", "in_progress", "overdue"];

  const toggleMetric = (key: string) => {
    const next = metrics.includes(key)
      ? metrics.filter((m: string) => m !== key)
      : [...metrics, key];
    onChange({ ...config, metrics: next });
  };

  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-2">
          Métricas a mostrar
        </label>
        <div className="space-y-2">
          {[
            { id: "total", label: "Total Work Items" },
            { id: "completed", label: "Completadas" },
            { id: "in_progress", label: "En Progreso" },
            { id: "overdue", label: "Vencidas" },
          ].map((m) => (
            <label
              key={m.id}
              className="flex items-center gap-2 text-xs text-neutral-700 dark:text-neutral-300 cursor-pointer"
            >
              <input
                type="checkbox"
                checked={metrics.includes(m.id)}
                onChange={() => toggleMetric(m.id)}
                className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
              />
              <span>{m.label}</span>
            </label>
          ))}
        </div>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Rango de Fechas (Días previos)
        </label>
        <select
          value={config.days_back || "30"}
          onChange={(e) => onChange({ ...config, days_back: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="7">Últimos 7 días</option>
          <option value="14">Últimos 14 días</option>
          <option value="30">Últimos 30 días</option>
          <option value="90">Últimos 90 días</option>
        </select>
      </div>
    </div>
  );
}
