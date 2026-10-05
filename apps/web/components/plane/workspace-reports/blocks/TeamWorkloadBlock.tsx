"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Users, CheckCircle2, AlertTriangle, ShieldAlert } from "lucide-react";

interface TeamMemberWorkload {
  id: string;
  name: string;
  email?: string;
  total_assigned: number;
  active_items: number;
  completed_items: number;
  load_status: "light" | "balanced" | "heavy" | "overloaded";
}

interface TeamWorkloadBlockProps {
  block: ReportBlock;
  data?: {
    members?: TeamMemberWorkload[];
    total_members?: number;
    total_assigned?: number;
    total_active?: number;
  };
}

export function TeamWorkloadBlock({ block, data }: TeamWorkloadBlockProps) {
  const members = data?.members || [
    {
      id: "1",
      name: "Alejandro Gómez",
      email: "alejandro@ejemplo.com",
      total_assigned: 14,
      active_items: 8,
      completed_items: 6,
      load_status: "heavy" as const,
    },
    {
      id: "2",
      name: "Mariana Silva",
      email: "mariana@ejemplo.com",
      total_assigned: 10,
      active_items: 4,
      completed_items: 6,
      load_status: "balanced" as const,
    },
    {
      id: "3",
      name: "Carlos Reyes",
      email: "carlos@ejemplo.com",
      total_assigned: 6,
      active_items: 2,
      completed_items: 4,
      load_status: "light" as const,
    },
  ];

  const getLoadBadge = (status: string) => {
    switch (status) {
      case "overloaded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <ShieldAlert className="w-3 h-3" />
            Sobrecarga
          </span>
        );
      case "heavy":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="w-3 h-3" />
            Carga Alta
          </span>
        );
      case "balanced":
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            Equilibrada
          </span>
        );
      default:
        return (
          <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
            Disponible
          </span>
        );
    }
  };

  const maxActive = Math.max(...members.map((m) => m.active_items), 1);

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      <div className="flex items-center justify-between mb-4">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-blue-50 dark:bg-blue-950/50 text-blue-600 dark:text-blue-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Carga de Trabajo del Equipo"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {members.length} miembros activos • {data?.total_active ?? 14} tareas en curso
            </p>
          </div>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="text-center py-6 text-xs text-neutral-400 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-lg">
          No hay asignaciones registradas para el equipo.
        </div>
      ) : (
        <div className="space-y-3">
          {members.map((m) => {
            const pct = Math.min((m.active_items / maxActive) * 100, 100);

            return (
              <div
                key={m.id}
                className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-2"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-2.5">
                    <div className="w-7 h-7 rounded-full bg-neutral-200 dark:bg-neutral-700 flex items-center justify-center text-xs font-bold text-neutral-700 dark:text-neutral-200 uppercase">
                      {m.name.charAt(0)}
                    </div>
                    <div>
                      <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block">
                        {m.name}
                      </span>
                      {m.email && (
                        <span className="text-[10px] text-neutral-400 block -mt-0.5">
                          {m.email}
                        </span>
                      )}
                    </div>
                  </div>

                  {getLoadBadge(m.load_status)}
                </div>

                {/* Progress bar */}
                <div className="space-y-1 pt-1">
                  <div className="flex items-center justify-between text-[11px] text-neutral-500 dark:text-neutral-400">
                    <span>
                      {m.active_items} activas • {m.completed_items} listas
                    </span>
                    <span className="font-semibold text-neutral-700 dark:text-neutral-300">
                      Total: {m.total_assigned}
                    </span>
                  </div>
                  <div className="w-full h-1.5 bg-neutral-200 dark:bg-neutral-700 rounded-full overflow-hidden">
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        m.load_status === "overloaded"
                          ? "bg-rose-500"
                          : m.load_status === "heavy"
                          ? "bg-amber-500"
                          : "bg-blue-600"
                      }`}
                      style={{ width: `${pct}%` }}
                    />
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

export function TeamWorkloadConfigPanel({
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
          Límite de miembros
        </label>
        <input
          type="number"
          min={1}
          max={30}
          value={config.limit || 10}
          onChange={(e) => onChange({ ...config, limit: parseInt(e.target.value, 10) || 10 })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        />
      </div>
    </div>
  );
}
