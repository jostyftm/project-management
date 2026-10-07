"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

interface LineChartBlockProps {
  block: ReportBlock;
  data?: {
    series?: Array<{
      name: string;
      color: string;
      data: Array<{ date: string; value: number }>;
    }>;
    grouping?: string;
    period?: { from: string; to: string };
  };
}

export function LineChartBlock({ block, data }: LineChartBlockProps) {
  const series = data?.series?.[0];
  const chartData = series?.data || [
    { date: "Sem 1", value: 4 },
    { date: "Sem 2", value: 8 },
    { date: "Sem 3", value: 15 },
    { date: "Sem 4", value: 22 },
  ];
  const color = series?.color || block.config?.color || "#6366f1";
  const name = series?.name || "Work Items";

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {block.title || "Evolución Temporal"}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            {name}
          </p>
        </div>
        <div className="flex items-center gap-2">
          <span className="w-2.5 h-2.5 rounded-full" style={{ backgroundColor: color }} />
          <span className="text-xs font-medium text-neutral-600 dark:text-neutral-400">{name}</span>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={chartData} margin={{ top: 5, right: 20, left: -20, bottom: 5 }}>
            <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e5e7eb" opacity={0.6} />
            <XAxis
              dataKey="date"
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
              itemStyle={{ color: "#334155" }}
            />
            <Line
              type="monotone"
              dataKey="value"
              name={name}
              stroke={color}
              strokeWidth={3}
              dot={{ r: 3, fill: color }}
              activeDot={{ r: 5 }}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function LineChartConfigPanel({
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
          Métrica a graficar
        </label>
        <select
          value={config.metric || "work_items_completed"}
          onChange={(e) => onChange({ ...config, metric: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="work_items_completed">Work Items Completados</option>
          <option value="work_items_created">Work Items Creados</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Agrupación temporal
        </label>
        <select
          value={config.grouping || "week"}
          onChange={(e) => onChange({ ...config, grouping: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="day">Por Día</option>
          <option value="week">Por Semana</option>
          <option value="month">Por Mes</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Color de la línea
        </label>
        <div className="flex items-center gap-2">
          {["#6366f1", "#3b82f6", "#10b981", "#f59e0b", "#ec4899"].map((c) => (
            <button
              key={c}
              type="button"
              onClick={() => onChange({ ...config, color: c })}
              className={`w-6 h-6 rounded-full border-2 transition-transform ${
                (config.color || "#6366f1") === c
                  ? "border-neutral-900 dark:border-white scale-110"
                  : "border-transparent"
              }`}
              style={{ backgroundColor: c }}
            />
          ))}
        </div>
      </div>
    </div>
  );
}
