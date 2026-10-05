"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Activity as ActivityIcon, User, Clock, FileEdit, CheckCircle2 } from "lucide-react";

interface ActivityItem {
  id: string;
  actor_id: string;
  actor_name: string;
  actor_email?: string;
  action: string;
  entity_type: string;
  entity_id: string;
  created_at?: string;
}

interface RecentActivityBlockProps {
  block: ReportBlock;
  data?: {
    activities?: ActivityItem[];
    total?: number;
  };
}

export function RecentActivityBlock({ block, data }: RecentActivityBlockProps) {
  const activities = data?.activities || [
    {
      id: "1",
      actor_id: "1",
      actor_name: "Ana Morales",
      action: "completó la tarea",
      entity_type: "WorkItem",
      entity_id: "102",
      created_at: new Date(Date.now() - 3600000 * 2).toISOString(),
    },
    {
      id: "2",
      actor_id: "2",
      actor_name: "Javier Castro",
      action: "actualizó el estado a 'En Progreso'",
      entity_type: "WorkItem",
      entity_id: "108",
      created_at: new Date(Date.now() - 3600000 * 5).toISOString(),
    },
    {
      id: "3",
      actor_id: "3",
      actor_name: "Lucía Méndez",
      action: "creó un nuevo hito",
      entity_type: "Milestone",
      entity_id: "15",
      created_at: new Date(Date.now() - 3600000 * 24).toISOString(),
    },
  ];

  const formatTimeAgo = (dateStr?: string) => {
    if (!dateStr) return "recientemente";
    const diff = Math.floor((Date.now() - new Date(dateStr).getTime()) / 1000);
    if (diff < 60) return "hace unos segundos";
    if (diff < 3600) return `hace ${Math.floor(diff / 60)}m`;
    if (diff < 86400) return `hace ${Math.floor(diff / 3600)}h`;
    return `hace ${Math.floor(diff / 86400)}d`;
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-violet-50 dark:bg-violet-950/50 text-violet-600 dark:text-violet-400">
            <ActivityIcon className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Actividad Reciente"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Últimas actualizaciones del workspace
            </p>
          </div>
        </div>
      </div>

      {activities.length === 0 ? (
        <div className="text-center py-6 text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
          No hay actividad reciente registrada.
        </div>
      ) : (
        <div className="space-y-3">
          {activities.map((act) => (
            <div
              key={act.id}
              className="flex items-start gap-3 p-3 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30"
            >
              <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-200 uppercase shrink-0 mt-0.5">
                {act.actor_name.charAt(0)}
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                    {act.actor_name}
                  </span>
                  <span className="text-[10px] text-neutral-400 flex items-center gap-1 shrink-0">
                    <Clock className="w-2.5 h-2.5" />
                    {formatTimeAgo(act.created_at)}
                  </span>
                </div>

                <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-0.5 leading-relaxed">
                  {act.action}
                </p>

                <div className="mt-1">
                  <span className="inline-block px-1.5 py-0.5 rounded text-[9px] font-mono bg-neutral-200/60 dark:bg-neutral-700/60 text-neutral-600 dark:text-neutral-300">
                    {act.entity_type} #{act.entity_id}
                  </span>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RecentActivityConfigPanel({
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
          Límite de eventos
        </label>
        <input
          type="number"
          min={3}
          max={20}
          value={config.limit || 8}
          onChange={(e) => onChange({ ...config, limit: parseInt(e.target.value, 10) || 8 })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        />
      </div>
    </div>
  );
}
