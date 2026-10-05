"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { AlertTriangle, Clock, Flame, ShieldAlert, ArrowUpRight } from "lucide-react";

interface RiskItem {
  id: string;
  identifier: string;
  title: string;
  priority: string;
  target_date?: string;
  state_name?: string;
  state_color?: string;
  severity: "high" | "medium";
  risk_reasons: string[];
  project_name?: string;
}

interface RisksBlockersBlockProps {
  block: ReportBlock;
  data?: {
    risks?: RiskItem[];
    summary?: {
      overdue_count: number;
      stagnant_count: number;
      urgent_count: number;
      total_critical: number;
    };
  };
}

export function RisksBlockersBlock({ block, data }: RisksBlockersBlockProps) {
  const summary = data?.summary || {
    overdue_count: 3,
    stagnant_count: 5,
    urgent_count: 2,
    total_critical: 5,
  };

  const risks = data?.risks || [
    {
      id: "1",
      identifier: "PRJ-45",
      title: "Migración de base de datos a PostgreSQL 16",
      priority: "URGENT",
      target_date: "2026-09-20",
      state_name: "En Progreso",
      state_color: "#3b82f6",
      severity: "high" as const,
      risk_reasons: ["Vencida (hace 9 días)", "Prioridad Urgente"],
      project_name: "Infraestructura",
    },
    {
      id: "2",
      identifier: "PRJ-58",
      title: "Configuración de webhooks para Slack",
      priority: "HIGH",
      state_name: "Sin Iniciar",
      state_color: "#6b7280",
      severity: "medium" as const,
      risk_reasons: ["Sin avance (hace 8 días)"],
      project_name: "Notificaciones",
    },
  ];

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
            <AlertTriangle className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Riesgos y Bloqueos"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Detección automática de tareas vencidas y estancadas
            </p>
          </div>
        </div>
      </div>

      {/* KPI Counters */}
      <div className="grid grid-cols-3 gap-2">
        <div className="p-3 rounded-lg border border-rose-100 dark:border-rose-900/40 bg-rose-50/40 dark:bg-rose-950/20 text-center">
          <span className="text-[11px] font-medium text-rose-700 dark:text-rose-400 block">
            Vencidas
          </span>
          <span className="text-lg font-bold text-rose-600 dark:text-rose-400">
            {summary.overdue_count}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-amber-100 dark:border-amber-900/40 bg-amber-50/40 dark:bg-amber-950/20 text-center">
          <span className="text-[11px] font-medium text-amber-700 dark:text-amber-400 block">
            Estancadas
          </span>
          <span className="text-lg font-bold text-amber-600 dark:text-amber-400">
            {summary.stagnant_count}
          </span>
        </div>

        <div className="p-3 rounded-lg border border-red-100 dark:border-red-900/40 bg-red-50/40 dark:bg-red-950/20 text-center">
          <span className="text-[11px] font-medium text-red-700 dark:text-red-400 block">
            Urgentes
          </span>
          <span className="text-lg font-bold text-red-600 dark:text-red-400">
            {summary.urgent_count}
          </span>
        </div>
      </div>

      {/* Risky Items List */}
      {risks.length === 0 ? (
        <div className="text-center py-5 text-xs text-emerald-600 dark:text-emerald-400 border border-emerald-100 dark:border-emerald-950 rounded-lg bg-emerald-50/30">
          No hay riesgos críticos detectados en el proyecto.
        </div>
      ) : (
        <div className="space-y-2.5">
          {risks.map((item) => (
            <div
              key={item.id}
              className="p-3 rounded-lg border border-neutral-100 dark:border-neutral-800/80 bg-neutral-50/50 dark:bg-neutral-800/30 space-y-1.5"
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold text-neutral-500 dark:text-neutral-400">
                    {item.identifier}
                  </span>
                  <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 line-clamp-1">
                    {item.title}
                  </span>
                </div>

                <span
                  className={`text-[9px] font-bold uppercase tracking-wider px-2 py-0.5 rounded-full shrink-0 ${
                    item.severity === "high"
                      ? "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300"
                      : "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300"
                  }`}
                >
                  {item.severity === "high" ? "Crítico" : "Medio"}
                </span>
              </div>

              {/* Reasons */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {item.risk_reasons.map((reason, idx) => (
                  <span
                    key={idx}
                    className="inline-flex items-center gap-1 text-[10px] px-2 py-0.5 rounded-md bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 text-neutral-600 dark:text-neutral-300"
                  >
                    <AlertTriangle className="w-2.5 h-2.5 text-amber-500" />
                    {reason}
                  </span>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export function RisksBlockersConfigPanel({
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
          Días para considerar estancada
        </label>
        <input
          type="number"
          min={3}
          max={30}
          value={config.days_stagnant || 7}
          onChange={(e) => onChange({ ...config, days_stagnant: parseInt(e.target.value, 10) || 7 })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        />
        <p className="text-[11px] text-neutral-400 mt-1">
          Tareas sin actualización en estos días se marcarán como estancadas.
        </p>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Límite de ítems a listar
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
