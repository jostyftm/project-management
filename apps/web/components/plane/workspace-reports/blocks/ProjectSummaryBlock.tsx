"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { CheckCircle2, AlertTriangle, AlertCircle, Calendar, Repeat, Users, Sparkles } from "lucide-react";

interface ProjectSummaryBlockProps {
  block: ReportBlock;
  data?: {
    has_project?: boolean;
    name?: string;
    identifier?: string;
    description?: string;
    total_items?: number;
    completed_items?: number;
    progress_percent?: number;
    overdue_items?: number;
    health?: "on_track" | "needs_attention" | "at_risk";
    cycles_count?: number;
    members_count?: number;
    members?: Array<{ id: number; name: string; avatar?: string }>;
    start_date?: string;
    target_date?: string;
    message?: string;
  };
}

export function ProjectSummaryBlock({ block, data }: ProjectSummaryBlockProps) {
  if (data?.has_project === false) {
    return (
      <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-6 text-center text-xs text-neutral-400">
        <Sparkles className="w-6 h-6 mx-auto mb-2 text-neutral-300" />
        No se encontró proyecto para mostrar el resumen.
      </div>
    );
  }

  const name = data?.name || "Proyecto Principal";
  const identifier = data?.identifier || "PRJ";
  const description = data?.description || "Sin descripción disponible.";
  const progress = data?.progress_percent ?? 65;
  const total = data?.total_items ?? 20;
  const completed = data?.completed_items ?? 13;
  const health = data?.health ?? "on_track";

  const healthBadge = () => {
    switch (health) {
      case "at_risk":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-600 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-900/50">
            <AlertCircle className="w-3.5 h-3.5" />
            En Riesgo
          </span>
        );
      case "needs_attention":
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-amber-50 text-amber-600 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-900/50">
            <AlertTriangle className="w-3.5 h-3.5" />
            Requiere Atención
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-xs font-semibold px-2.5 py-1 rounded-full bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-900/50">
            <CheckCircle2 className="w-3.5 h-3.5" />
            En Tiempo
          </span>
        );
    }
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-6 shadow-xs space-y-5">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 pb-4 border-b border-neutral-100 dark:border-neutral-800">
        <div>
          <div className="flex items-center gap-2">
            <span className="text-xs font-mono font-bold px-2 py-0.5 rounded bg-indigo-50 text-indigo-600 dark:bg-indigo-950/50 dark:text-indigo-400">
              {identifier}
            </span>
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              {name}
            </h3>
          </div>
          {description && (
            <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 line-clamp-2 max-w-xl">
              {description}
            </p>
          )}
        </div>
        <div>{healthBadge()}</div>
      </div>

      {/* Progress Bar & Key Stats */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 items-center">
        {/* Progress bar */}
        <div className="md:col-span-2 space-y-2">
          <div className="flex items-center justify-between text-xs font-medium">
            <span className="text-neutral-700 dark:text-neutral-300">
              Progreso General
            </span>
            <span className="text-indigo-600 dark:text-indigo-400 font-bold">
              {progress}% ({completed}/{total} completadas)
            </span>
          </div>
          <div className="w-full h-3 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden">
            <div
              className="h-full rounded-full bg-indigo-600 transition-all duration-500"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* Quick badges */}
        <div className="flex items-center gap-4 text-xs text-neutral-600 dark:text-neutral-400">
          <div className="flex items-center gap-1.5">
            <Repeat className="w-4 h-4 text-neutral-400" />
            <span>{data?.cycles_count ?? 0} Ciclos</span>
          </div>
          <div className="flex items-center gap-1.5">
            <Users className="w-4 h-4 text-neutral-400" />
            <span>{data?.members_count ?? 0} Miembros</span>
          </div>
        </div>
      </div>

      {/* Dates & Members Footer */}
      {(data?.start_date || data?.target_date || (data?.members && data.members.length > 0)) && (
        <div className="flex flex-wrap items-center justify-between gap-3 pt-3 border-t border-neutral-100 dark:border-neutral-800 text-[11px] text-neutral-400">
          <div className="flex items-center gap-4">
            {data?.start_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Inicio: {data.start_date}
              </span>
            )}
            {data?.target_date && (
              <span className="flex items-center gap-1">
                <Calendar className="w-3.5 h-3.5" /> Entrega: {data.target_date}
              </span>
            )}
          </div>

          {data?.members && data.members.length > 0 && (
            <div className="flex items-center gap-1">
              <span className="mr-1">Equipo:</span>
              <div className="flex -space-x-1.5 overflow-hidden">
                {data.members.map((m) => (
                  <div
                    key={m.id}
                    title={m.name}
                    className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[9px] font-bold flex items-center justify-center ring-1 ring-white dark:ring-neutral-900"
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

export function ProjectSummaryConfigPanel({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      <p className="text-xs text-neutral-500">
        Este bloque muestra el estado de salud, completado y equipo del proyecto principal o seleccionado.
      </p>
    </div>
  );
}
