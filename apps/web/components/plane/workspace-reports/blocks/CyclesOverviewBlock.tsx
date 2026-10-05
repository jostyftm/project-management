"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Repeat, Calendar, CheckCircle2, Clock } from "lucide-react";

interface CycleItem {
  id: string;
  name: string;
  status: "CURRENT" | "UPCOMING" | "COMPLETED" | "DRAFT";
  start_date?: string;
  end_date?: string;
  total_items: number;
  completed_items: number;
  progress: number;
}

interface CyclesOverviewBlockProps {
  block: ReportBlock;
  data?: {
    cycles?: CycleItem[];
    total?: number;
    status?: string;
  };
}

export function CyclesOverviewBlock({ block, data }: CyclesOverviewBlockProps) {
  const cycles = data?.cycles || [
    {
      id: "1",
      name: "Sprint 24 - Core Features",
      status: "CURRENT" as const,
      start_date: "2026-09-15",
      end_date: "2026-09-30",
      total_items: 18,
      completed_items: 12,
      progress: 66.7,
    },
    {
      id: "2",
      name: "Sprint 25 - Integrations & QA",
      status: "UPCOMING" as const,
      start_date: "2026-10-01",
      end_date: "2026-10-15",
      total_items: 14,
      completed_items: 0,
      progress: 0,
    },
  ];

  const getStatusBadge = (status: string) => {
    switch (status) {
      case "CURRENT":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <Clock className="w-3 h-3" />
            Activo
          </span>
        );
      case "COMPLETED":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            <CheckCircle2 className="w-3 h-3" />
            Completado
          </span>
        );
      case "UPCOMING":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-600 dark:bg-indigo-950/40 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
            Próximo
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 dark:bg-neutral-800 text-neutral-500">
            {status}
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Repeat className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Resumen de Ciclos"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {cycles.length} ciclos listados
            </p>
          </div>
        </div>
      </div>

      {cycles.length === 0 ? (
        <div className="text-center py-6 text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
          No hay ciclos registrados para este filtro.
        </div>
      ) : (
        <div className="space-y-3.5">
          {cycles.map((cycle) => (
            <div
              key={cycle.id}
              className="p-3.5 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-2.5"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {cycle.name}
                </span>
                {getStatusBadge(cycle.status)}
              </div>

              {/* Progress bar */}
              <div className="space-y-1">
                <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                  <span>Progreso de tareas</span>
                  <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                    {cycle.completed_items} / {cycle.total_items} ({cycle.progress}%)
                  </span>
                </div>
                <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                  <div
                    className="h-full bg-indigo-600 dark:bg-indigo-500 rounded-full transition-all duration-300"
                    style={{ width: `${Math.min(cycle.progress, 100)}%` }}
                  />
                </div>
              </div>

              {(cycle.start_date || cycle.end_date) && (
                <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 pt-0.5">
                  <Calendar className="w-3 h-3" />
                  <span>
                    {cycle.start_date || "Inicio"} — {cycle.end_date || "Fin"}
                  </span>
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function CyclesOverviewConfigPanel({
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
          Estado del Ciclo
        </label>
        <select
          value={config.status || "all"}
          onChange={(e) => onChange({ ...config, status: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        >
          <option value="all">Todos los estados</option>
          <option value="CURRENT">Solo Activos (Current)</option>
          <option value="UPCOMING">Solo Próximos (Upcoming)</option>
          <option value="COMPLETED">Solo Completados</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Límite de ciclos
        </label>
        <input
          type="number"
          min={1}
          max={15}
          value={config.limit || 5}
          onChange={(e) => onChange({ ...config, limit: parseInt(e.target.value, 10) || 5 })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        />
      </div>
    </div>
  );
}
