"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import {
  PieChart,
  Pie,
  Cell,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface DonutChartBlockProps {
  block: ReportBlock;
  data?: {
    dimension?: string;
    segments?: Array<{ name: string; value: number; percentage: number; color: string }>;
    total?: number;
  };
}

export function DonutChartBlock({ block, data }: DonutChartBlockProps) {
  const segments = data?.segments || [
    { name: "Completadas", value: 10, percentage: 50, color: "#10b981" },
    { name: "En Progreso", value: 6, percentage: 30, color: "#3b82f6" },
    { name: "Por Hacer", value: 4, percentage: 20, color: "#64748b" },
  ];

  const total = data?.total ?? segments.reduce((acc, s) => acc + s.value, 0);

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-2">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {block.title || "Distribución Porcentual"}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Por {data?.dimension === "priority" ? "Prioridad" : "Estado"} • Total: {total}
          </p>
        </div>
      </div>

      <div className="h-64 w-full relative">
        <ResponsiveContainer width="100%" height="100%">
          <PieChart>
            <Pie
              data={segments}
              dataKey="value"
              nameKey="name"
              cx="50%"
              cy="50%"
              innerRadius={55}
              outerRadius={85}
              paddingAngle={3}
            >
              {segments.map((entry, index) => (
                <Cell key={`cell-${index}`} fill={entry.color} />
              ))}
            </Pie>
            <Tooltip
              formatter={(value: any, name: any, item: any) => [
                `${value} (${item.payload.percentage ?? 0}%)`,
                name,
              ]}
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
              itemStyle={{ color: "#334155" }}
            />
            <Legend
              verticalAlign="bottom"
              height={36}
              formatter={(value, entry: any) => (
                <span className="text-xs text-neutral-600 dark:text-neutral-300 ml-1">
                  {value} ({entry.payload.percentage ?? 0}%)
                </span>
              )}
            />
          </PieChart>
        </ResponsiveContainer>

        {/* Center label */}
        <div className="absolute top-[42%] left-1/2 -translate-x-1/2 -translate-y-1/2 text-center pointer-events-none">
          <span className="text-xl font-bold text-neutral-900 dark:text-neutral-100 block leading-tight">
            {total}
          </span>
          <span className="text-[10px] text-neutral-400 uppercase tracking-wider block font-medium">
            Total
          </span>
        </div>
      </div>
    </div>
  );
}

export function DonutChartConfigPanel({
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
          Dimensión de distribución
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
    </div>
  );
}
