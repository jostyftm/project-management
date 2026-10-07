"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
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

interface BarChartBlockProps {
  block: ReportBlock;
  data?: {
    dimension?: string;
    metric?: string;
    data?: Array<{ name: string; value: number; color: string }>;
    total?: number;
  };
}

export function BarChartBlock({ block, data }: BarChartBlockProps) {
  const chartData = data?.data || [
    { name: "Por Hacer", value: 5, color: "#64748b" },
    { name: "En Progreso", value: 8, color: "#3b82f6" },
    { name: "Completadas", value: 12, color: "#10b981" },
  ];

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {block.title || "Comparativa de Tareas"}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Por {data?.dimension === "priority" ? "Prioridad" : "Estado"} • Total: {data?.total ?? 0}
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.6} />
            <XAxis
              dataKey="name"
              stroke="#9ca3af"
              fontSize={11}
              tickLine={false}
              axisLine={false}
            />
            <YAxis stroke="#9ca3af" fontSize={11} tickLine={false} axisLine={false} />
            <Tooltip
              contentStyle={{
                backgroundColor: "#ffffff",
                borderColor: "#e2e8f0",
                borderRadius: "8px",
                color: "#0f172a",
                fontSize: "12px",
                boxShadow: "0 4px 6px -1px rgba(0, 0, 0, 0.08), 0 2px 4px -2px rgba(0, 0, 0, 0.04)",
              }}
              labelStyle={{
                color: "#0f172a",
                fontWeight: "600",
                marginBottom: "2px",
              }}
              itemStyle={{
                color: "#334155",
              }}
              cursor={{ fill: "rgba(99, 102, 241, 0.05)" }}
            />
            <Bar dataKey="value" radius={[6, 6, 0, 0]}>
              {chartData.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color || "#6366f1"} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function BarChartConfigPanel({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Dimensión de agrupación
        </label>
        <select
          value={config.dimension || "state"}
          onChange={(e) => onChange({ ...config, dimension: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="state">Por Estado</option>
          <option value="priority">Por Prioridad</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Métrica
        </label>
        <select
          value={config.metric || "count"}
          onChange={(e) => onChange({ ...config, metric: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="count">Cantidad de Work Items</option>
          <option value="points">Puntos Estimados (Story Points)</option>
        </select>
      </div>
    </div>
  );
}
