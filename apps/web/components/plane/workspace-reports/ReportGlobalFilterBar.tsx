"use client";

import React, { useEffect, useState } from "react";
import { GlobalReportFilters } from "@/types/workspace-report-types";
import { projectService } from "@/services/plane/projectService";
import { cycleService } from "@/services/plane/cycleService";
import { Project, Cycle } from "@/types/plane-types";
import {
  Filter,
  Calendar,
  Layers,
  FolderGit2,
  X,
  RotateCcw,
  Check,
  ChevronDown,
} from "lucide-react";

interface ReportGlobalFilterBarProps {
  filters: GlobalReportFilters;
  onChange: (filters: GlobalReportFilters) => void;
  onSaveDefaults?: () => void;
  isSavingDefaults?: boolean;
  className?: string;
}

export function ReportGlobalFilterBar({
  filters,
  onChange,
  onSaveDefaults,
  isSavingDefaults,
  className = "",
}: ReportGlobalFilterBarProps) {
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = useState(false);
  const [isLoadingCycles, setIsLoadingCycles] = useState(false);

  // Load Projects on mount
  useEffect(() => {
    let isMounted = true;
    setIsLoadingProjects(true);
    projectService
      .list()
      .then((data) => {
        if (isMounted) setProjects(data as any);
      })
      .catch((err) => console.error("Error loading projects for report filters:", err))
      .finally(() => {
        if (isMounted) setIsLoadingProjects(false);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  // Load Cycles when project_ids change
  useEffect(() => {
    let isMounted = true;
    const selectedProjId = filters.project_ids?.[0];

    if (!selectedProjId && projects.length > 0) {
      // If no project selected, try loading cycles for first project or all
      const firstId = projects[0]?.id;
      if (firstId) {
        setIsLoadingCycles(true);
        cycleService
          .list(firstId)
          .then((data) => {
            if (isMounted) setCycles(data as any);
          })
          .catch((err) => console.error("Error loading cycles:", err))
          .finally(() => {
            if (isMounted) setIsLoadingCycles(false);
          });
      }
      return;
    }

    if (selectedProjId) {
      setIsLoadingCycles(true);
      cycleService
        .list(selectedProjId)
        .then((data) => {
          if (isMounted) setCycles(data as any);
        })
        .catch((err) => console.error("Error loading cycles for project:", err))
        .finally(() => {
          if (isMounted) setIsLoadingCycles(false);
        });
    }

    return () => {
      isMounted = false;
    };
  }, [filters.project_ids, projects]);

  const activeFiltersCount =
    (filters.project_ids?.length ? 1 : 0) +
    (filters.cycle_ids?.length ? 1 : 0) +
    (filters.start_date || filters.end_date ? 1 : 0);

  const handleProjectChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange({
      ...filters,
      project_ids: val ? [val] : undefined,
      cycle_ids: undefined, // Reset cycle when project changes
    });
  };

  const handleCycleChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const val = e.target.value;
    onChange({
      ...filters,
      cycle_ids: val ? [val] : undefined,
    });
  };

  const handleDatePreset = (preset: "last7" | "last14" | "last30" | "current_month" | "clear") => {
    if (preset === "clear") {
      onChange({ ...filters, start_date: undefined, end_date: undefined });
      return;
    }

    const today = new Date();
    const toIso = (d: Date) => d.toISOString().split("T")[0];
    const endStr = toIso(today);
    let startStr = endStr;

    if (preset === "last7") {
      const d = new Date();
      d.setDate(d.getDate() - 7);
      startStr = toIso(d);
    } else if (preset === "last14") {
      const d = new Date();
      d.setDate(d.getDate() - 14);
      startStr = toIso(d);
    } else if (preset === "last30") {
      const d = new Date();
      d.setDate(d.getDate() - 30);
      startStr = toIso(d);
    } else if (preset === "current_month") {
      const d = new Date(today.getFullYear(), today.getMonth(), 1);
      startStr = toIso(d);
    }

    onChange({
      ...filters,
      start_date: startStr,
      end_date: endStr,
    });
  };

  const handleResetAll = () => {
    onChange({});
  };

  return (
    <div
      className={`w-full bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-xl p-3 shadow-xs mb-5 flex flex-col md:flex-row md:items-center justify-between gap-3 ${className}`}
    >
      <div className="flex flex-wrap items-center gap-2.5">
        <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider mr-1">
          <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
          <span>Filtros Globales</span>
          {activeFiltersCount > 0 && (
            <span className="w-5 h-5 rounded-full bg-indigo-600 text-white text-[10px] flex items-center justify-center font-bold">
              {activeFiltersCount}
            </span>
          )}
        </div>

        {/* Project Selector */}
        <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-lg px-2.5 py-1 text-xs">
          <FolderGit2 className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={filters.project_ids?.[0] || ""}
            onChange={handleProjectChange}
            className="bg-transparent font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none pr-2 cursor-pointer"
          >
            <option value="">Todos los Proyectos</option>
            {projects.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name} ({p.identifier})
              </option>
            ))}
          </select>
        </div>

        {/* Cycle / Sprint Selector */}
        <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-lg px-2.5 py-1 text-xs">
          <Layers className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={filters.cycle_ids?.[0] || ""}
            onChange={handleCycleChange}
            disabled={cycles.length === 0}
            className="bg-transparent font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none pr-2 cursor-pointer disabled:opacity-50"
          >
            <option value="">Todos los Ciclos / Sprints</option>
            {cycles.map((c) => (
              <option key={c.id} value={c.id}>
                {c.name} ({c.status})
              </option>
            ))}
          </select>
        </div>

        {/* Date Range Inputs */}
        <div className="flex items-center gap-1.5 bg-neutral-50 dark:bg-neutral-800/60 border border-neutral-200 dark:border-neutral-700/80 rounded-lg px-2 py-1 text-xs">
          <Calendar className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
          <input
            type="date"
            value={filters.start_date || ""}
            onChange={(e) => onChange({ ...filters, start_date: e.target.value || undefined })}
            className="bg-transparent text-[11px] font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none"
            placeholder="Desde"
          />
          <span className="text-neutral-400 text-[10px]">a</span>
          <input
            type="date"
            value={filters.end_date || ""}
            onChange={(e) => onChange({ ...filters, end_date: e.target.value || undefined })}
            className="bg-transparent text-[11px] font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none"
            placeholder="Hasta"
          />
        </div>

        {/* Quick Date Presets */}
        <div className="hidden lg:flex items-center gap-1 text-[11px]">
          <button
            type="button"
            onClick={() => handleDatePreset("last14")}
            className="px-2 py-1 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Últimos 14d
          </button>
          <button
            type="button"
            onClick={() => handleDatePreset("last30")}
            className="px-2 py-1 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Últimos 30d
          </button>
          <button
            type="button"
            onClick={() => handleDatePreset("current_month")}
            className="px-2 py-1 rounded-md text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            Este mes
          </button>
        </div>
      </div>

      {/* Right Controls: Reset & Save Default */}
      <div className="flex items-center gap-2 self-end md:self-auto">
        {activeFiltersCount > 0 && (
          <button
            type="button"
            onClick={handleResetAll}
            className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-neutral-500 hover:text-rose-600 transition-colors"
          >
            <RotateCcw className="w-3 h-3" />
            Limpiar
          </button>
        )}

        {onSaveDefaults && (
          <button
            type="button"
            onClick={onSaveDefaults}
            disabled={isSavingDefaults}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-indigo-50 dark:bg-indigo-950/40 border border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 text-xs font-semibold hover:bg-indigo-100 transition-colors"
          >
            <Check className="w-3.5 h-3.5" />
            Guardar como Predeterminado
          </button>
        )}
      </div>
    </div>
  );
}
