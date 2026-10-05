"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Flame } from "lucide-react";

interface HeatmapDay {
  date: string;
  day_of_week: number;
  count: number;
  level: number; // 0 a 4
}

interface HeatmapBlockProps {
  block: ReportBlock;
  data?: {
    matrix?: HeatmapDay[];
    total_events?: number;
    max_count?: number;
    metric?: string;
    weeks?: number;
    period?: {
      from: string;
      to: string;
    };
  };
}

export function HeatmapBlock({ block, data }: HeatmapBlockProps) {
  const weeks = data?.weeks || 12;
  const totalEvents = data?.total_events ?? 48;
  const matrix = data?.matrix || generateSampleHeatmap(weeks);

  // Agrupar en columnas de semanas (cada columna tiene hasta 7 días)
  const columns: HeatmapDay[][] = [];
  let currentWeek: HeatmapDay[] = [];

  matrix.forEach((day, index) => {
    currentWeek.push(day);
    if (day.day_of_week === 6 || index === matrix.length - 1) {
      columns.push(currentWeek);
      currentWeek = [];
    }
  });

  const getCellColor = (level: number) => {
    switch (level) {
      case 1:
        return "bg-emerald-200 dark:bg-emerald-950/80";
      case 2:
        return "bg-emerald-300 dark:bg-emerald-800";
      case 3:
        return "bg-emerald-500 dark:bg-emerald-600";
      case 4:
        return "bg-emerald-600 dark:bg-emerald-500";
      default:
        return "bg-neutral-100 dark:bg-neutral-800/60";
    }
  };

  const dayLabels = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Flame className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Mapa de Calor de Actividad"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {totalEvents} tareas en las últimas {weeks} semanas
            </p>
          </div>
        </div>
      </div>

      <div className="overflow-x-auto pb-2">
        <div className="inline-flex gap-1.5 items-start">
          {/* Day of week labels */}
          <div className="flex flex-col gap-1.5 pr-2 pt-0.5 text-[9px] font-medium text-neutral-400 select-none">
            {dayLabels.map((lbl, idx) => (
              <div key={idx} className="h-3 flex items-center">
                {idx % 2 === 1 ? lbl : ""}
              </div>
            ))}
          </div>

          {/* Grid Columns */}
          {columns.map((week, wIdx) => (
            <div key={wIdx} className="flex flex-col gap-1.5">
              {week.map((day) => (
                <div
                  key={day.date}
                  title={`${day.date}: ${day.count} tareas`}
                  className={`w-3 h-3 rounded-xs transition-colors hover:ring-2 hover:ring-indigo-400/50 cursor-pointer ${getCellColor(
                    day.level
                  )}`}
                />
              ))}
            </div>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex items-center justify-between text-[11px] text-neutral-400 pt-1 border-t border-neutral-100 dark:border-neutral-800">
        <span>
          {data?.period?.from ? `${data.period.from} a ${data.period.to}` : "Último trimestre"}
        </span>

        <div className="flex items-center gap-1.5">
          <span>Menos</span>
          <div className="flex items-center gap-1">
            <div className="w-2.5 h-2.5 rounded-xs bg-neutral-100 dark:bg-neutral-800" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-200 dark:bg-emerald-950/80" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-300 dark:bg-emerald-800" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-500 dark:bg-emerald-600" />
            <div className="w-2.5 h-2.5 rounded-xs bg-emerald-600 dark:bg-emerald-500" />
          </div>
          <span>Más</span>
        </div>
      </div>
    </div>
  );
}

function generateSampleHeatmap(weeks: number): HeatmapDay[] {
  const days: HeatmapDay[] = [];
  const totalDays = weeks * 7;
  const now = new Date();

  for (let i = totalDays - 1; i >= 0; i--) {
    const d = new Date(now.getTime() - i * 86400000);
    const count = Math.random() > 0.6 ? Math.floor(Math.random() * 5) : 0;
    const level = count > 3 ? 4 : count > 2 ? 3 : count > 1 ? 2 : count > 0 ? 1 : 0;

    days.push({
      date: d.toISOString().split("T")[0],
      day_of_week: d.getDay(),
      count,
      level,
    });
  }

  return days;
}

export function HeatmapConfigPanel({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Métrica a visualizar
        </label>
        <select
          value={config.metric || "completed"}
          onChange={(e) => onChange({ ...config, metric: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        >
          <option value="completed">Tareas Completadas</option>
          <option value="created">Tareas Creadas</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Semanas a mostrar
        </label>
        <select
          value={config.weeks || 12}
          onChange={(e) => onChange({ ...config, weeks: parseInt(e.target.value, 10) || 12 })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        >
          <option value={8}>8 semanas (~2 meses)</option>
          <option value={12}>12 semanas (~3 meses)</option>
          <option value={16}>16 semanas (~4 meses)</option>
        </select>
      </div>
    </div>
  );
}
