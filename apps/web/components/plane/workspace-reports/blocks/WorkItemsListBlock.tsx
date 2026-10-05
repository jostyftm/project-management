"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { AlertCircle, Clock, UserX, Sparkles, CheckCircle2 } from "lucide-react";

interface WorkItemsListBlockProps {
  block: ReportBlock;
  data?: {
    filter?: string;
    items?: Array<{
      id: number;
      identifier: string;
      title: string;
      priority: string;
      state: { name: string; group: string };
      lead?: { name: string; avatar?: string } | null;
      target_date?: string | null;
    }>;
    count?: number;
  };
}

export function WorkItemsListBlock({ block, data }: WorkItemsListBlockProps) {
  const items = data?.items || [
    {
      id: 1,
      identifier: "PRJ-44",
      title: "Solucionar memory leak en streaming de eventos",
      priority: "URGENT",
      state: { name: "En Progreso", group: "STARTED" },
      lead: { name: "Mario" },
      target_date: "2026-09-30",
    },
    {
      id: 2,
      identifier: "PRJ-45",
      title: "Revisar políticas de seguridad para endpoints públicos",
      priority: "HIGH",
      state: { name: "Por Hacer", group: "UNSTARTED" },
      lead: null,
      target_date: "2026-10-02",
    },
  ];

  const filter = data?.filter || block.config?.filter || "urgent";

  const filterIcon = () => {
    switch (filter) {
      case "overdue":
        return <Clock className="w-3.5 h-3.5 text-rose-500" />;
      case "unassigned":
        return <UserX className="w-3.5 h-3.5 text-amber-500" />;
      case "recent":
        return <Sparkles className="w-3.5 h-3.5 text-indigo-500" />;
      default:
        return <AlertCircle className="w-3.5 h-3.5 text-orange-500" />;
    }
  };

  const filterLabel = () => {
    switch (filter) {
      case "overdue":
        return "Tareas Vencidas";
      case "unassigned":
        return "Sin Asignar";
      case "recent":
        return "Creadas Recientemente";
      default:
        return "Alta Prioridad / Urgentes";
    }
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
        <div className="flex items-center gap-2">
          {filterIcon()}
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {block.title || filterLabel()}
          </h4>
        </div>
        <span className="text-[11px] font-medium text-neutral-400">
          {items.length} items
        </span>
      </div>

      {items.length === 0 ? (
        <div className="text-center py-6 text-xs text-neutral-400">
          <CheckCircle2 className="w-5 h-5 mx-auto mb-1 text-emerald-500" />
          No hay items que coincidan con este filtro.
        </div>
      ) : (
        <div className="space-y-2">
          {items.map((item) => (
            <div
              key={item.id}
              className="flex items-center justify-between p-2.5 rounded-lg border border-neutral-100 dark:border-neutral-800/80 hover:bg-neutral-50 dark:hover:bg-neutral-800/50 transition-colors gap-3"
            >
              <div className="flex items-center gap-2.5 min-w-0">
                <span className="text-[11px] font-mono font-bold text-neutral-400 shrink-0">
                  {item.identifier}
                </span>
                <span className="text-xs font-medium text-neutral-800 dark:text-neutral-200 truncate">
                  {item.title}
                </span>
              </div>

              <div className="flex items-center gap-2.5 shrink-0 text-[11px]">
                <span className="text-neutral-500">
                  {item.lead?.name || <span className="text-neutral-300 dark:text-neutral-600">Sin asignar</span>}
                </span>
                {item.target_date && (
                  <span className="text-neutral-400 text-[10px]">
                    {item.target_date}
                  </span>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function WorkItemsListConfigPanel({
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
          Filtro destacado
        </label>
        <select
          value={config.filter || "urgent"}
          onChange={(e) => onChange({ ...config, filter: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="urgent">Items Urgentes / Alta Prioridad</option>
          <option value="overdue">Items Vencidos</option>
          <option value="unassigned">Sin Asignar</option>
          <option value="recent">Recientes</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Límite de items
        </label>
        <select
          value={config.limit || "5"}
          onChange={(e) => onChange({ ...config, limit: Number(e.target.value) })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="3">3 items</option>
          <option value="5">5 items</option>
          <option value="10">10 items</option>
        </select>
      </div>
    </div>
  );
}
