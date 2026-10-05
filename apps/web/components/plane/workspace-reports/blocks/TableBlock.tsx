"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";

interface TableBlockProps {
  block: ReportBlock;
  data?: {
    rows?: Array<{
      id: number;
      identifier: string;
      title: string;
      state: { name: string; group: string };
      priority: string;
      lead?: { name: string; avatar?: string } | null;
      target_date?: string | null;
      created_at?: string;
    }>;
    total?: number;
    columns?: string[];
  };
}

export function TableBlock({ block, data }: TableBlockProps) {
  const rows = data?.rows || [
    {
      id: 1,
      identifier: "PRJ-101",
      title: "Configurar autenticación y roles de usuario",
      state: { name: "En Progreso", group: "STARTED" },
      priority: "HIGH",
      lead: { name: "Ana López" },
      target_date: "2026-10-15",
    },
    {
      id: 2,
      identifier: "PRJ-102",
      title: "Diseño del canvas interactivo y barra lateral",
      state: { name: "Completado", group: "COMPLETED" },
      priority: "URGENT",
      lead: { name: "Carlos Ruiz" },
      target_date: "2026-10-01",
    },
    {
      id: 3,
      identifier: "PRJ-103",
      title: "Integración con pipeline CI/CD y tests",
      state: { name: "Por Hacer", group: "UNSTARTED" },
      priority: "MEDIUM",
      lead: null,
      target_date: "2026-10-20",
    },
  ];

  const priorityBadge = (p: string) => {
    switch (p) {
      case "URGENT":
        return <span className="text-[11px] font-semibold text-rose-600 dark:text-rose-400">Urgente</span>;
      case "HIGH":
        return <span className="text-[11px] font-semibold text-orange-600 dark:text-orange-400">Alta</span>;
      case "MEDIUM":
        return <span className="text-[11px] font-semibold text-amber-600 dark:text-amber-400">Media</span>;
      case "LOW":
        return <span className="text-[11px] font-semibold text-blue-600 dark:text-blue-400">Baja</span>;
      default:
        return <span className="text-[11px] text-neutral-400">Normal</span>;
    }
  };

  const stateBadge = (state: { name: string; group: string }) => {
    const isCompleted = state.group === "COMPLETED";
    const isStarted = state.group === "STARTED";

    return (
      <span
        className={`inline-flex items-center text-[10px] font-semibold px-2 py-0.5 rounded-full ${
          isCompleted
            ? "bg-emerald-50 text-emerald-600 dark:bg-emerald-950/40 dark:text-emerald-400"
            : isStarted
            ? "bg-blue-50 text-blue-600 dark:bg-blue-950/40 dark:text-blue-400"
            : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400"
        }`}
      >
        {state.name}
      </span>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
      {block.title && (
        <div className="px-5 py-3.5 border-b border-neutral-100 dark:border-neutral-800 flex items-center justify-between">
          <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
            {block.title}
          </h4>
          <span className="text-xs text-neutral-400">{rows.length} registros</span>
        </div>
      )}

      <div className="overflow-x-auto">
        <table className="w-full text-left text-xs text-neutral-700 dark:text-neutral-300">
          <thead className="bg-neutral-50/70 dark:bg-neutral-800/40 border-b border-neutral-100 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
            <tr>
              <th className="py-2.5 px-4">Item</th>
              <th className="py-2.5 px-4">Título</th>
              <th className="py-2.5 px-4">Estado</th>
              <th className="py-2.5 px-4">Prioridad</th>
              <th className="py-2.5 px-4">Asignado</th>
              <th className="py-2.5 px-4">Fecha Límite</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800">
            {rows.map((row) => (
              <tr key={row.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/30 transition-colors">
                <td className="py-2.5 px-4 font-mono font-medium text-neutral-500">
                  {row.identifier}
                </td>
                <td className="py-2.5 px-4 font-medium text-neutral-900 dark:text-neutral-100 max-w-xs truncate">
                  {row.title}
                </td>
                <td className="py-2.5 px-4">{stateBadge(row.state)}</td>
                <td className="py-2.5 px-4">{priorityBadge(row.priority)}</td>
                <td className="py-2.5 px-4 text-neutral-600 dark:text-neutral-400">
                  {row.lead?.name || <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                </td>
                <td className="py-2.5 px-4 text-neutral-500 text-[11px]">
                  {row.target_date || <span className="text-neutral-300 dark:text-neutral-600">—</span>}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

export function TableConfigPanel({
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
          Límite de filas
        </label>
        <select
          value={config.limit || "10"}
          onChange={(e) => onChange({ ...config, limit: Number(e.target.value) })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="5">5 registros</option>
          <option value="10">10 registros</option>
          <option value="20">20 registros</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Ordenar por
        </label>
        <select
          value={config.sort_by || "created_at"}
          onChange={(e) => onChange({ ...config, sort_by: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="created_at">Fecha de creación</option>
          <option value="target_date">Fecha límite</option>
          <option value="priority">Prioridad</option>
        </select>
      </div>
    </div>
  );
}
