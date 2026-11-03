"use client";

import React, { useEffect, useState, useRef } from "react";
import { Filter, Calendar, Folder, Repeat, Hash, Check, X, SlidersHorizontal } from "lucide-react";
import { projectService } from "@/services/plane/projectService";
import { cycleService } from "@/services/plane/cycleService";
import { Project, Cycle } from "@/types/plane-types";
import { ReportBlock } from "@/types/workspace-report-types";

interface BlockFilterPopoverProps {
  block: ReportBlock;
  onApplyFilter: (blockId: string, updatedConfig: Record<string, any>) => void;
  align?: "left" | "right";
}

export function BlockFilterPopover({
  block,
  onApplyFilter,
  align = "right",
}: BlockFilterPopoverProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoadingCycles, setIsLoadingCycles] = useState(false);

  const config = block.config || {};
  const currentProjectId = config.project_ids?.[0] || config.project_id || "";
  const currentCycleId = config.cycle_ids?.[0] || config.cycle_id || "";
  const currentStartDate = config.start_date || config.date_from || "";
  const currentEndDate = config.end_date || config.date_to || "";
  const currentLimit = config.limit !== undefined && config.limit !== null ? String(config.limit) : "";

  const [projectId, setProjectId] = useState<string>(currentProjectId);
  const [cycleId, setCycleId] = useState<string>(currentCycleId);
  const [startDate, setStartDate] = useState<string>(currentStartDate);
  const [endDate, setEndDate] = useState<string>(currentEndDate);
  const [limit, setLimit] = useState<string>(currentLimit);
  const [showAll, setShowAll] = useState<boolean>(!currentLimit || currentLimit === "0" || currentLimit === "all");

  const popoverRef = useRef<HTMLDivElement>(null);

  // Sync internal state when block config changes
  useEffect(() => {
    setProjectId(currentProjectId);
    setCycleId(currentCycleId);
    setStartDate(currentStartDate);
    setEndDate(currentEndDate);
    setLimit(currentLimit);
    setShowAll(!currentLimit || currentLimit === "0" || currentLimit === "all");
  }, [currentProjectId, currentCycleId, currentStartDate, currentEndDate, currentLimit]);

  // Load projects list
  useEffect(() => {
    if (!isOpen) return;
    projectService
      .list()
      .then((data: any) => setProjects(data || []))
      .catch((err) => console.error("Error loading projects:", err));
  }, [isOpen]);

  // Load cycles when projectId changes
  useEffect(() => {
    if (!projectId) {
      setCycles([]);
      return;
    }
    setIsLoadingCycles(true);
    cycleService
      .list(projectId)
      .then((data: any) => setCycles(data || []))
      .catch((err) => console.error("Error loading cycles:", err))
      .finally(() => setIsLoadingCycles(false));
  }, [projectId]);

  // Close on outside click
  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (popoverRef.current && !popoverRef.current.contains(e.target as Node)) {
        setIsOpen(false);
      }
    };
    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
    }
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, [isOpen]);

  const hasActiveFilters = Boolean(
    projectId || cycleId || startDate || endDate || (!showAll && limit)
  );

  const handleApply = () => {
    const newConfig: Record<string, any> = { ...config };

    if (projectId) {
      newConfig.project_ids = [projectId];
      newConfig.project_id = projectId;
    } else {
      delete newConfig.project_ids;
      delete newConfig.project_id;
    }

    if (cycleId) {
      newConfig.cycle_ids = [cycleId];
      newConfig.cycle_id = cycleId;
    } else {
      delete newConfig.cycle_ids;
      delete newConfig.cycle_id;
    }

    if (startDate) {
      newConfig.start_date = startDate;
      newConfig.date_from = startDate;
    } else {
      delete newConfig.start_date;
      delete newConfig.date_from;
    }

    if (endDate) {
      newConfig.end_date = endDate;
      newConfig.date_to = endDate;
    } else {
      delete newConfig.end_date;
      delete newConfig.date_to;
    }

    if (showAll) {
      newConfig.limit = null;
    } else if (limit && parseInt(limit) > 0) {
      newConfig.limit = parseInt(limit);
    } else {
      delete newConfig.limit;
    }

    onApplyFilter(block.id, newConfig);
    setIsOpen(false);
  };

  const handleClear = () => {
    const newConfig = { ...config };
    delete newConfig.project_ids;
    delete newConfig.project_id;
    delete newConfig.cycle_ids;
    delete newConfig.cycle_id;
    delete newConfig.start_date;
    delete newConfig.date_from;
    delete newConfig.end_date;
    delete newConfig.date_to;
    delete newConfig.limit;

    setProjectId("");
    setCycleId("");
    setStartDate("");
    setEndDate("");
    setLimit("");
    setShowAll(true);

    onApplyFilter(block.id, newConfig);
    setIsOpen(false);
  };

  return (
    <div className="relative inline-block" ref={popoverRef}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        className={`flex items-center gap-1.5 px-2 py-1 rounded-md text-[11px] font-medium transition-all ${
          hasActiveFilters
            ? "bg-indigo-50 dark:bg-indigo-950/60 text-indigo-600 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800"
            : "text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800"
        }`}
        title="Filtrar este widget"
      >
        <SlidersHorizontal className="w-3.5 h-3.5" />
        <span className="hidden sm:inline">Filtros</span>
        {hasActiveFilters && (
          <span className="w-1.5 h-1.5 rounded-full bg-indigo-600 dark:bg-indigo-400" />
        )}
      </button>

      {isOpen && (
        <div
          onClick={(e) => e.stopPropagation()}
          className={`absolute top-full mt-1.5 z-40 w-72 sm:w-80 p-3.5 bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl shadow-xl space-y-3 ${
            align === "right" ? "right-0" : "left-0"
          }`}
        >
          <div className="flex items-center justify-between pb-2 border-b border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center gap-1.5 text-xs font-bold text-neutral-800 dark:text-neutral-200">
              <Filter className="w-3.5 h-3.5 text-indigo-600" />
              <span>Filtros del Widget</span>
            </div>
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded"
            >
              <X className="w-3.5 h-3.5" />
            </button>
          </div>

          {/* Proyecto */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              <Folder className="w-3 h-3 text-neutral-400" />
              <span>Proyecto</span>
            </label>
            <select
              value={projectId}
              onChange={(e) => {
                setProjectId(e.target.value);
                setCycleId(""); // reset cycle when project changes
              }}
              className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">Todos los proyectos del workspace</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} ({p.identifier})
                </option>
              ))}
            </select>
          </div>

          {/* Ciclo */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              <Repeat className="w-3 h-3 text-neutral-400" />
              <span>Ciclo / Sprint</span>
            </label>
            <select
              value={cycleId}
              disabled={!projectId || isLoadingCycles}
              onChange={(e) => setCycleId(e.target.value)}
              className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 disabled:opacity-50 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            >
              <option value="">
                {!projectId
                  ? "Selecciona un proyecto primero"
                  : isLoadingCycles
                  ? "Cargando ciclos..."
                  : "Todos los ciclos"}
              </option>
              {cycles.map((c) => (
                <option key={c.id} value={c.id}>
                  {c.name} ({c.status})
                </option>
              ))}
            </select>
          </div>

          {/* Fechas */}
          <div>
            <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
              <Calendar className="w-3 h-3 text-neutral-400" />
              <span>Rango de Fechas</span>
            </label>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">Desde</span>
                <input
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-neutral-800 dark:text-neutral-200"
                />
              </div>
              <div>
                <span className="text-[10px] text-neutral-400 block mb-0.5">Hasta</span>
                <input
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                  className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2 py-1 text-neutral-800 dark:text-neutral-200"
                />
              </div>
            </div>
          </div>

          {/* Límite de Registros */}
          <div className="pt-2 border-t border-neutral-100 dark:border-neutral-800">
            <div className="flex items-center justify-between mb-1">
              <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400">
                <Hash className="w-3 h-3 text-neutral-400" />
                <span>Límite de registros</span>
              </label>
              <label className="flex items-center gap-1.5 text-[10px] font-medium text-neutral-500 cursor-pointer">
                <input
                  type="checkbox"
                  checked={showAll}
                  onChange={(e) => setShowAll(e.target.checked)}
                  className="rounded text-indigo-600 focus:ring-indigo-500 h-3.5 w-3.5"
                />
                <span>Mostrar todos</span>
              </label>
            </div>
            {!showAll && (
              <input
                type="number"
                min="1"
                max="500"
                placeholder="Ej. 10, 25, 50..."
                value={limit}
                onChange={(e) => setLimit(e.target.value)}
                className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-2.5 py-1 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            )}
          </div>

          {/* Botones de acción */}
          <div className="pt-2 flex items-center justify-between border-t border-neutral-100 dark:border-neutral-800">
            <button
              type="button"
              onClick={handleClear}
              className="text-[11px] text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-300 font-medium"
            >
              Restablecer
            </button>
            <button
              type="button"
              onClick={handleApply}
              className="inline-flex items-center gap-1 px-3 py-1.5 bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg text-xs font-semibold shadow-xs transition-colors"
            >
              <Check className="w-3 h-3" />
              <span>Aplicar</span>
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
