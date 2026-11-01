"use client";

import React, { useState } from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import {
  UserCheck,
  CheckCircle2,
  Bookmark,
  Layers,
  ArrowUpDown,
  Sparkles,
  BarChart3,
} from "lucide-react";

interface StateBreakdownItem {
  id: string;
  name: string;
  group: string;
  color: string;
  count: number;
  points: number;
}

interface MemberWorkloadItem {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  tasks_count: number;
  user_stories_count: number;
  bugs_count: number;
  total_items: number;
  total_points: number;
  completed_points: number;
  completion_percentage: number;
  states_breakdown: StateBreakdownItem[];
}

interface MemberWorkloadBreakdownBlockProps {
  block: ReportBlock;
  data?: {
    members?: MemberWorkloadItem[];
    summary?: {
      total_members: number;
      total_points: number;
      total_tasks: number;
      total_user_stories: number;
    };
  };
  isEditing?: boolean;
}

export function MemberWorkloadBreakdownBlock({
  block,
  data,
}: MemberWorkloadBreakdownBlockProps) {
  const [sortBy, setSortBy] = useState<"points" | "stories" | "tasks">("points");

  const members: MemberWorkloadItem[] = data?.members || [
    {
      id: "1",
      name: "Alejandro Gómez",
      email: "alejandro@ejemplo.com",
      tasks_count: 8,
      user_stories_count: 4,
      bugs_count: 2,
      total_items: 14,
      total_points: 38,
      completed_points: 24,
      completion_percentage: 63.2,
      states_breakdown: [
        { id: "1", name: "Backlog", group: "BACKLOG", color: "#64748b", count: 2, points: 5 },
        { id: "2", name: "En Progreso", group: "STARTED", color: "#3b82f6", count: 4, points: 9 },
        { id: "3", name: "Completado", group: "COMPLETED", color: "#10b981", count: 8, points: 24 },
      ],
    },
    {
      id: "2",
      name: "Mariana Silva",
      email: "mariana@ejemplo.com",
      tasks_count: 5,
      user_stories_count: 6,
      bugs_count: 1,
      total_items: 12,
      total_points: 29,
      completed_points: 18,
      completion_percentage: 62.1,
      states_breakdown: [
        { id: "1", name: "Por Hacer", group: "UNSTARTED", color: "#f59e0b", count: 3, points: 6 },
        { id: "2", name: "En Progreso", group: "STARTED", color: "#3b82f6", count: 3, points: 5 },
        { id: "3", name: "Completado", group: "COMPLETED", color: "#10b981", count: 6, points: 18 },
      ],
    },
  ];

  const summary = data?.summary || {
    total_members: members.length,
    total_points: members.reduce((acc, m) => acc + m.total_points, 0),
    total_tasks: members.reduce((acc, m) => acc + m.tasks_count, 0),
    total_user_stories: members.reduce((acc, m) => acc + m.user_stories_count, 0),
  };

  const sortedMembers = [...members].sort((a, b) => {
    if (sortBy === "stories") return b.user_stories_count - a.user_stories_count;
    if (sortBy === "tasks") return b.tasks_count - a.tasks_count;
    return b.total_points - a.total_points;
  });

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-4 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-emerald-50 dark:bg-emerald-950/50 text-emerald-600 dark:text-emerald-400">
            <UserCheck className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Métricas por Miembro: Tareas, Historias y Puntos"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Distribución de carga, estimaciones y desglose de estados por integrante
            </p>
          </div>
        </div>

        {/* Sort Controls */}
        <div className="flex items-center gap-1 text-xs">
          <span className="text-neutral-400 text-[11px] mr-1 hidden sm:inline">Ordenar:</span>
          <div className="flex items-center bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg">
            <button
              type="button"
              onClick={() => setSortBy("points")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sortBy === "points"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Puntos
            </button>
            <button
              type="button"
              onClick={() => setSortBy("stories")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sortBy === "stories"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Historias
            </button>
            <button
              type="button"
              onClick={() => setSortBy("tasks")}
              className={`px-2 py-1 rounded-md text-[11px] font-medium transition-colors ${
                sortBy === "tasks"
                  ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                  : "text-neutral-500 hover:text-neutral-900"
              }`}
            >
              Tareas
            </button>
          </div>
        </div>
      </div>

      {/* Summary KPI Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-2.5 mb-5">
        <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-medium text-neutral-500 block uppercase tracking-wider">
            Total Puntos
          </span>
          <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {summary.total_points} pts
          </span>
        </div>
        <div className="bg-indigo-50/50 dark:bg-indigo-950/20 border border-indigo-100/60 dark:border-indigo-900/40 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 block uppercase tracking-wider">
            Historias de Usuario
          </span>
          <span className="text-base font-bold text-indigo-700 dark:text-indigo-300">
            {summary.total_user_stories}
          </span>
        </div>
        <div className="bg-blue-50/50 dark:bg-blue-950/20 border border-blue-100/60 dark:border-blue-900/40 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-medium text-blue-600 dark:text-blue-400 block uppercase tracking-wider">
            Tareas Técnicas
          </span>
          <span className="text-base font-bold text-blue-700 dark:text-blue-300">
            {summary.total_tasks}
          </span>
        </div>
        <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 rounded-lg p-2.5 text-center">
          <span className="text-[10px] font-medium text-neutral-500 block uppercase tracking-wider">
            Miembros Activos
          </span>
          <span className="text-base font-bold text-neutral-900 dark:text-neutral-100">
            {summary.total_members}
          </span>
        </div>
      </div>

      {/* Members List with States Breakdown */}
      <div className="space-y-3.5">
        {sortedMembers.map((m) => {
          const initial = (m.name || "U").charAt(0).toUpperCase();

          return (
            <div
              key={m.id}
              className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-white dark:bg-neutral-900/60 hover:shadow-2xs transition-shadow"
            >
              {/* Member Top Row */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2.5 mb-3">
                <div className="flex items-center gap-2.5">
                  {m.avatar ? (
                    <img
                      src={m.avatar}
                      alt={m.name}
                      className="w-8 h-8 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                    />
                  ) : (
                    <div className="w-8 h-8 rounded-full bg-emerald-100 dark:bg-emerald-950 text-emerald-800 dark:text-emerald-300 font-bold flex items-center justify-center text-xs">
                      {initial}
                    </div>
                  )}
                  <div>
                    <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 block">
                      {m.name}
                    </span>
                    <span className="text-[11px] text-neutral-400 block">{m.email}</span>
                  </div>
                </div>

                {/* Metric Badges */}
                <div className="flex flex-wrap items-center gap-2 text-xs">
                  {/* User Stories */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-100 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300">
                    <Bookmark className="w-3 h-3" />
                    <span className="font-bold">{m.user_stories_count}</span>
                    <span className="text-[10px] opacity-80">historias</span>
                  </div>

                  {/* Tasks */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-blue-50 dark:bg-blue-950/40 border border-blue-100 dark:border-blue-800 text-blue-700 dark:text-blue-300">
                    <CheckCircle2 className="w-3 h-3" />
                    <span className="font-bold">{m.tasks_count}</span>
                    <span className="text-[10px] opacity-80">tareas</span>
                  </div>

                  {/* Story Points */}
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-amber-50 dark:bg-amber-950/40 border border-amber-100 dark:border-amber-800 text-amber-700 dark:text-amber-300">
                    <Sparkles className="w-3 h-3" />
                    <span className="font-bold">{m.completed_points} / {m.total_points}</span>
                    <span className="text-[10px] opacity-80">pts ({m.completion_percentage}%)</span>
                  </div>
                </div>
              </div>

              {/* Progress Stacked Bar */}
              <div className="w-full h-2 rounded-full bg-neutral-100 dark:bg-neutral-800 overflow-hidden flex mb-2.5">
                {m.states_breakdown.map((sb, idx) => {
                  const widthPct = m.total_items > 0 ? (sb.count / m.total_items) * 100 : 0;
                  return (
                    <div
                      key={sb.id || idx}
                      style={{ width: `${widthPct}%`, backgroundColor: sb.color }}
                      title={`${sb.name}: ${sb.count} tareas (${sb.points} pts)`}
                      className="h-full transition-all"
                    />
                  );
                })}
              </div>

              {/* States Badges Breakdown */}
              <div className="flex flex-wrap items-center gap-1.5 pt-1">
                {m.states_breakdown.map((sb) => (
                  <span
                    key={sb.id}
                    className="inline-flex items-center gap-1.5 text-[10px] font-medium px-2 py-0.5 rounded-full border border-neutral-200/70 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-800/40 text-neutral-600 dark:text-neutral-300"
                  >
                    <span
                      className="w-1.5 h-1.5 rounded-full shrink-0"
                      style={{ backgroundColor: sb.color }}
                    />
                    <span>{sb.name}:</span>
                    <strong className="text-neutral-800 dark:text-neutral-200">{sb.count}</strong>
                    <span className="text-neutral-400">({sb.points} pts)</span>
                  </span>
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

export function MemberWorkloadBreakdownConfigPanel({
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
          Límite de miembros a listar
        </label>
        <input
          type="number"
          min={1}
          max={100}
          value={config.limit || 50}
          onChange={(e) => onChange({ ...config, limit: parseInt(e.target.value) || 50 })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-3 py-2 text-neutral-800 dark:text-neutral-200"
        />
      </div>
    </div>
  );
}
