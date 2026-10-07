"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend,
} from "recharts";

interface AreaChartBlockProps {
  block: ReportBlock;
  data?: {
    series?: Array<{ date: string; created: number; completed: number }>;
    grouping?: string;
    period?: { from: string; to: string };
  };
}

export function AreaChartBlock({ block, data }: AreaChartBlockProps) {
  const chartData = data?.series || [
    { date: "Sem 1", created: 5, completed: 2 },
    { date: "Sem 2", created: 8, completed: 6 },
    { date: "Sem 3", created: 4, completed: 9 },
    { date: "Sem 4", created: 7, completed: 11 },
  ];

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div>
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {block.title || "Flujo de Trabajo (Creadas vs Completadas)"}
          </h4>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-0.5">
            Evolución por {data?.grouping === "day" ? "Día" : data?.grouping === "month" ? "Mes" : "Semana"}
          </p>
        </div>
      </div>

      <div className="h-64 w-full">
        <ResponsiveContainer width="100%" height="100%">
          <AreaChart data={chartData} margin={{ top: 5, right: 10, left: -20, bottom: 5 }}>
            <defs>
              <linearGradient id="colorCreated" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#6366f1" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#6366f1" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="colorCompleted" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="#10b981" stopOpacity={0.3} />
                <stop offset="95%" stopColor="#10b981" stopOpacity={0} />
              </linearGradient>
            </defs>
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
              itemStyle={{
                color: "#334155",
              }}
            />
            <Legend
              verticalAlign="top"
              align="right"
              height={30}
              formatter={(value) => (
                <span className="text-xs text-neutral-600 dark:text-neutral-300 ml-1">
                  {value === "created" ? "Creadas" : "Completadas"}
                </span>
              )}
            />
            <Area
              type="monotone"
              dataKey="created"
              name="created"
              stroke="#6366f1"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCreated)"
            />
            <Area
              type="monotone"
              dataKey="completed"
              name="completed"
              stroke="#10b981"
              strokeWidth={2}
              fillOpacity={1}
              fill="url(#colorCompleted)"
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
}

export function AreaChartConfigPanel({
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
    </div>
  );
}
