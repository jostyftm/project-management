"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Milestone as MilestoneIcon, Calendar, CheckCircle2, AlertCircle } from "lucide-react";

interface MilestoneItem {
  id: string;
  title: string;
  description?: string;
  status: string;
  target_date?: string;
  completed_at?: string;
  is_overdue: boolean;
  total_items: number;
  completed_items: number;
  progress: number;
}

interface MilestonesProgressBlockProps {
  block: ReportBlock;
  data?: {
    milestones?: MilestoneItem[];
    total?: number;
    status?: string;
  };
}

export function MilestonesProgressBlock({ block, data }: MilestonesProgressBlockProps) {
  const milestones = data?.milestones || [
    {
      id: "1",
      title: "Lanzamiento Beta Público",
      description: "Habilitación para los primeros 500 clientes",
      status: "OPEN",
      target_date: "2026-10-15",
      is_overdue: false,
      total_items: 25,
      completed_items: 20,
      progress: 80,
    },
    {
      id: "2",
      title: "Auditoría de Seguridad SOC2",
      description: "Pruebas de penetración y revisión de infraestructura",
      status: "OPEN",
      target_date: "2026-11-01",
      is_overdue: false,
      total_items: 12,
      completed_items: 6,
      progress: 50,
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-amber-50 dark:bg-amber-950/50 text-amber-600 dark:text-amber-400">
            <MilestoneIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Progreso de Milestones"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {milestones.length} hitos clave
            </p>
          </div>
        </div>
      </div>

      {milestones.length === 0 ? (
        <div className="text-center py-6 text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
          No hay milestones registrados para mostrar.
        </div>
      ) : (
        <div className="space-y-3.5">
          {milestones.map((m) => {
            const isCompleted = m.status === "COMPLETED" || m.progress === 100;

            return (
              <div
                key={m.id}
                className="p-3.5 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-2.5"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <h5 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {m.title}
                    </h5>
                    {m.description && (
                      <p className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5 leading-relaxed">
                        {m.description}
                      </p>
                    )}
                  </div>

                  {isCompleted ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                      <CheckCircle2 className="w-3 h-3" />
                      Completado
                    </span>
                  ) : m.is_overdue ? (
                    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800 shrink-0">
                      <AlertCircle className="w-3 h-3" />
                      Vencido
                    </span>
                  ) : (
                    <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300 shrink-0">
                      En Curso
                    </span>
                  )}
                </div>

                {/* Progress bar */}
                <div className="space-y-1">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>Avance</span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      {m.completed_items} / {m.total_items} ({m.progress}%)
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isCompleted
                          ? "bg-emerald-600"
                          : m.is_overdue
                          ? "bg-rose-600"
                          : "bg-amber-500"
                      }`}
                      style={{ width: `${Math.min(m.progress, 100)}%` }}
                    />
                  </div>
                </div>

                {m.target_date && (
                  <div className="flex items-center gap-1.5 text-[10px] text-neutral-400 pt-0.5">
                    <Calendar className="w-3 h-3" />
                    <span>Fecha meta: {m.target_date}</span>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function MilestonesProgressConfigPanel({
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
          Filtro de Estado
        </label>
        <select
          value={config.status || "all"}
          onChange={(e) => onChange({ ...config, status: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        >
          <option value="all">Todos los hitos</option>
          <option value="OPEN">Solo Abiertos / En curso</option>
          <option value="COMPLETED">Solo Completados</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Límite de hitos
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
