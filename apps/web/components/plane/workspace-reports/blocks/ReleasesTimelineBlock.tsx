"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Tag, Calendar, CheckCircle2, Rocket, Clock } from "lucide-react";

interface ReleaseItem {
  id: string;
  name: string;
  version: string;
  description?: string;
  status: string;
  published_at?: string;
  created_at?: string;
  items_count: number;
}

interface ReleasesTimelineBlockProps {
  block: ReportBlock;
  data?: {
    releases?: ReleaseItem[];
    total?: number;
    status?: string;
  };
}

export function ReleasesTimelineBlock({ block, data }: ReleasesTimelineBlockProps) {
  const releases = data?.releases || [
    {
      id: "1",
      name: "Q3 Release Candidate",
      version: "v2.4.0",
      description: "Nuevas integraciones y módulos de reportes",
      status: "RELEASED",
      published_at: "2026-09-20T10:00:00Z",
      items_count: 24,
    },
    {
      id: "2",
      name: "Performance & Security Patch",
      version: "v2.4.1",
      description: "Optimización de consultas y caché Redis",
      status: "PLANNED",
      created_at: "2026-09-28T14:30:00Z",
      items_count: 8,
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <Rocket className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Línea de Tiempo de Releases"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {releases.length} versiones registradas
            </p>
          </div>
        </div>
      </div>

      {releases.length === 0 ? (
        <div className="text-center py-6 text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
          No hay releases registrados en el período seleccionado.
        </div>
      ) : (
        <div className="relative pl-6 space-y-5 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-neutral-200 dark:before:bg-neutral-800">
          {releases.map((rel) => {
            const isReleased = rel.status?.toUpperCase() === "RELEASED";
            const dateStr = rel.published_at || rel.created_at;

            return (
              <div key={rel.id} className="relative group">
                {/* Node icon on line */}
                <div
                  className={`absolute -left-[23px] top-1 w-3.5 h-3.5 rounded-full border-2 bg-white dark:bg-neutral-900 transition-colors ${
                    isReleased
                      ? "border-emerald-500"
                      : "border-indigo-500"
                  }`}
                />

                <div className="p-3.5 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30">
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-neutral-900 dark:text-neutral-100">
                        {rel.version || rel.name}
                      </span>
                      {rel.name && rel.name !== rel.version && (
                        <span className="text-xs text-neutral-500 dark:text-neutral-400 font-medium">
                          • {rel.name}
                        </span>
                      )}
                    </div>

                    <span
                      className={`px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                        isReleased
                          ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800"
                          : "bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-300"
                      }`}
                    >
                      {isReleased ? "Publicado" : rel.status || "Planificado"}
                    </span>
                  </div>

                  {rel.description && (
                    <p className="text-xs text-neutral-600 dark:text-neutral-300 mt-1 leading-relaxed">
                      {rel.description}
                    </p>
                  )}

                  <div className="flex items-center gap-4 text-[10px] text-neutral-400 mt-2.5 pt-2 border-t border-neutral-100 dark:border-neutral-800">
                    <div className="flex items-center gap-1">
                      <Tag className="w-3 h-3 text-neutral-400" />
                      <span>{rel.items_count} tareas entregadas</span>
                    </div>

                    {dateStr && (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3 h-3 text-neutral-400" />
                        <span>
                          {new Date(dateStr).toLocaleDateString("es-ES", {
                            month: "short",
                            day: "numeric",
                            year: "numeric",
                          })}
                        </span>
                      </div>
                    )}
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

export function ReleasesTimelineConfigPanel({
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
          Estado de Releases
        </label>
        <select
          value={config.status || "all"}
          onChange={(e) => onChange({ ...config, status: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        >
          <option value="all">Todas las versiones</option>
          <option value="RELEASED">Solo Publicadas</option>
          <option value="PLANNED">Solo Planificadas</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Límite de versiones
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
