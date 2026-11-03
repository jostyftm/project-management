"use client";

import React, { useState, useEffect } from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { CycleDayData } from "@/types/plane-types";
import { CycleBurndownChart } from "@/components/plane/cycles/CycleBurndownChart";
import { cycleService } from "@/services/plane/cycleService";
import {
  Flame,
  ChevronDown,
  Loader2,
  Calendar,
  Layers,
  Sparkles,
  ListTodo,
} from "lucide-react";

interface CycleSummary {
  id: string;
  project_id: string;
  name: string;
  description?: string;
  sprint_goal?: string;
  status: string;
  start_date?: string;
  end_date?: string;
  capacity_points: number;
}

interface AvailableCycleOption {
  id: string;
  name: string;
  status: string;
  start_date?: string;
  end_date?: string;
}

interface SprintBurndownBlockProps {
  block: ReportBlock;
  data?: {
    selected_cycle?: CycleSummary | null;
    available_cycles?: AvailableCycleOption[];
    timeline?: {
      dates: string[];
      work_items: CycleDayData[];
      estimates: CycleDayData[];
    };
    today_index?: number;
    today_date?: string;
    chart_type?: "burndown" | "burnup";
    filter_by?: "work_items" | "estimates";
    metrics?: {
      scope: number;
      completed: number;
      pending: number;
      started: number;
      completion_rate: number;
      total_points?: number;
      completed_points?: number;
    };
    message?: string;
  };
  isEditing?: boolean;
  onUpdateConfig?: (cfg: Record<string, any>) => void;
}

export function SprintBurndownBlock({
  block,
  data,
  onUpdateConfig,
}: SprintBurndownBlockProps) {
  // Config state
  const [chartType, setChartType] = useState<"burndown" | "burnup">(
    (block.config?.chart_type as "burndown" | "burnup") ||
      data?.chart_type ||
      "burndown"
  );
  const [filterBy, setFilterBy] = useState<"work_items" | "estimates">(
    (block.config?.filter_by as "work_items" | "estimates") ||
      data?.filter_by ||
      "estimates"
  );
  const [selectedCycleId, setSelectedCycleId] = useState<string>(
    block.config?.cycle_id || data?.selected_cycle?.id || ""
  );

  // Dynamic cycle data state (reactive to cycle switching)
  const [currentCycle, setCurrentCycle] = useState<CycleSummary | null>(
    data?.selected_cycle || null
  );
  const [currentTimeline, setCurrentTimeline] = useState(data?.timeline);
  const [currentTodayIndex, setCurrentTodayIndex] = useState(data?.today_index);
  const [currentTodayDate, setCurrentTodayDate] = useState(data?.today_date);
  const [currentMetrics, setCurrentMetrics] = useState(data?.metrics);
  const [isLoading, setIsLoading] = useState(false);

  const availableCycles = data?.available_cycles || [];

  // Synchronize when parent data updates
  useEffect(() => {
    if (data?.selected_cycle) {
      setCurrentCycle(data.selected_cycle);
      setSelectedCycleId(data.selected_cycle.id);
    }
    if (data?.timeline) {
      setCurrentTimeline(data.timeline);
    }
    if (typeof data?.today_index === "number") {
      setCurrentTodayIndex(data.today_index);
    }
    if (data?.today_date) {
      setCurrentTodayDate(data.today_date);
    }
    if (data?.metrics) {
      setCurrentMetrics(data.metrics);
    }
    if (data?.chart_type && !block.config?.chart_type) {
      setChartType(data.chart_type);
    }
    if (data?.filter_by && !block.config?.filter_by) {
      setFilterBy(data.filter_by);
    }
  }, [data, block.config]);

  // Handle cycle switching dynamically
  const handleCycleSelect = async (id: string) => {
    setSelectedCycleId(id);
    const found = availableCycles.find((c) => c.id === id);
    if (found) {
      setCurrentCycle({
        id: found.id,
        project_id: data?.selected_cycle?.project_id || "",
        name: found.name,
        status: found.status,
        start_date: found.start_date,
        end_date: found.end_date,
        capacity_points: 0,
      });
    }

    if (onUpdateConfig) {
      onUpdateConfig({ ...block.config, cycle_id: id });
    }

    try {
      setIsLoading(true);
      const analytics = await cycleService.getAnalytics(id);
      if (analytics) {
        if (analytics.timeline) setCurrentTimeline(analytics.timeline);
        if (typeof analytics.today_index === "number")
          setCurrentTodayIndex(analytics.today_index);
        if (analytics.today_date) setCurrentTodayDate(analytics.today_date);
        if (analytics.metrics) {
          setCurrentMetrics({
            scope: analytics.metrics.total_items ?? 0,
            completed: analytics.metrics.completed_items ?? 0,
            pending: analytics.metrics.incomplete_items ?? 0,
            started: 0,
            completion_rate: analytics.metrics.completion_rate ?? 0,
            total_points: analytics.metrics.total_points ?? 0,
            completed_points: analytics.metrics.completed_points ?? 0,
          });
        }
      }
    } catch (err) {
      console.error("Error al cargar analítica del ciclo seleccionado:", err);
    } finally {
      setIsLoading(false);
    }
  };

  const isEstimates = filterBy === "estimates";
  const metrics = currentMetrics || {
    scope: 0,
    completed: 0,
    pending: 0,
    started: 0,
    completion_rate: 0,
    total_points: 0,
    completed_points: 0,
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      {/* Top Header & Controls - Distribuido en 3 Filas */}
      <div className="flex flex-col gap-2.5 mb-5 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
        {/* Fila 1: Título del widget */}
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <div className="p-1.5 rounded-lg bg-rose-50 dark:bg-rose-950/50 text-rose-600 dark:text-rose-400">
              <Flame className="w-4 h-4" />
            </div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Sprint Burndown & Burnup"}
            </h4>
          </div>
          {isLoading && (
            <Loader2 className="w-3.5 h-3.5 text-indigo-500 animate-spin" />
          )}
        </div>

        {/* Fila 2: Detalles del ciclo actual */}
        <div className="flex flex-wrap items-center gap-2 text-xs text-neutral-500 dark:text-neutral-400 min-w-0">
          {currentCycle ? (
            <>
              <span className="font-medium text-neutral-800 dark:text-neutral-200 truncate max-w-full">
                {currentCycle.name}
              </span>
              <span className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800 shrink-0">
                {currentCycle.status}
              </span>
              {(currentCycle.start_date || currentCycle.end_date) && (
                <span className="text-neutral-400 dark:text-neutral-500 text-[11px] shrink-0">
                  • {currentCycle.start_date || ""} al {currentCycle.end_date || ""}
                </span>
              )}
            </>
          ) : (
            <span>Visualización oficial y dinámica de iteraciones</span>
          )}
        </div>

        {/* Fila 3: Selector de Sprint */}
        {availableCycles.length > 0 && (
          <div className="flex flex-col sm:flex-row sm:items-center gap-2 w-full pt-1">
            <label className="text-xs text-neutral-500 dark:text-neutral-400 font-medium shrink-0">
              Sprint:
            </label>
            <div className="relative w-full">
              <select
                value={selectedCycleId || currentCycle?.id || ""}
                onChange={(e) => handleCycleSelect(e.target.value)}
                disabled={isLoading}
                aria-label="Seleccionar sprint para gráfico de burndown"
                className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 font-medium text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500 pr-8 disabled:opacity-50 truncate shadow-2xs"
              >
                {availableCycles.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name} ({c.status})
                  </option>
                ))}
              </select>
            </div>
          </div>
        )}
      </div>

      {/* KPI Cards Strip */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-5">
        <div className="bg-neutral-50/70 dark:bg-neutral-800/40 border border-neutral-100 dark:border-neutral-800 rounded-xl p-3">
          <span className="text-[10px] font-medium text-neutral-500 block uppercase">
            Alcance {isEstimates ? "Puntos" : "Tareas"}
          </span>
          <span className="text-lg font-bold text-neutral-900 dark:text-neutral-100">
            {isEstimates
              ? `${metrics.total_points ?? metrics.scope * 3} pts`
              : `${metrics.scope} tareas`}
          </span>
        </div>
        <div className="bg-emerald-50/40 dark:bg-emerald-950/20 border border-emerald-100 dark:border-emerald-900/30 rounded-xl p-3">
          <span className="text-[10px] font-medium text-emerald-600 dark:text-emerald-400 block uppercase">
            Completadas
          </span>
          <span className="text-lg font-bold text-emerald-700 dark:text-emerald-300">
            {isEstimates
              ? `${metrics.completed_points ?? metrics.completed * 3} pts`
              : `${metrics.completed} tareas`}
          </span>
        </div>
        <div className="bg-amber-50/40 dark:bg-amber-950/20 border border-amber-100 dark:border-amber-900/30 rounded-xl p-3">
          <span className="text-[10px] font-medium text-amber-600 dark:text-amber-400 block uppercase">
            Pendientes
          </span>
          <span className="text-lg font-bold text-amber-700 dark:text-amber-300">
            {isEstimates
              ? `${Math.max(
                  0,
                  (metrics.total_points ?? metrics.scope * 3) -
                    (metrics.completed_points ?? metrics.completed * 3)
                )} pts`
              : `${metrics.pending} tareas`}
          </span>
        </div>
        <div className="bg-indigo-50/40 dark:bg-indigo-950/20 border border-indigo-100 dark:border-indigo-900/30 rounded-xl p-3">
          <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 block uppercase">
            % de Cumplimiento
          </span>
          <span className="text-lg font-bold text-indigo-700 dark:text-indigo-300">
            {metrics.completion_rate}%
          </span>
        </div>
      </div>

      {/* Componente oficial de Burndown/Burnup reutilizado directamente */}
      <div className="w-full rounded-xl border border-neutral-100 dark:border-neutral-800 bg-neutral-50/30 dark:bg-neutral-950/20 p-2 sm:p-4">
        <CycleBurndownChart
          timeline={currentTimeline}
          todayIndex={currentTodayIndex}
          todayDate={currentTodayDate}
          filterBy={filterBy}
          onFilterByChange={(val) => {
            setFilterBy(val);
            if (onUpdateConfig)
              onUpdateConfig({ ...block.config, filter_by: val });
          }}
          chartType={chartType}
          onChartTypeChange={(val) => {
            setChartType(val);
            if (onUpdateConfig)
              onUpdateConfig({ ...block.config, chart_type: val });
          }}
          className="w-full border-none p-0 shadow-none bg-transparent dark:bg-transparent"
        />
      </div>
    </div>
  );
}

export function SprintBurndownConfigPanel({
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
          Tipo de Gráfico Predeterminado
        </label>
        <select
          value={config.chart_type || "burndown"}
          onChange={(e) => onChange({ ...config, chart_type: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-2 text-neutral-800 dark:text-neutral-200"
        >
          <option value="burndown">Burn-down (Trabajo Pendiente Descendente)</option>
          <option value="burnup">Burn-up (Trabajo Completado Ascendente)</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Métrica Principal
        </label>
        <select
          value={config.filter_by || "estimates"}
          onChange={(e) => onChange({ ...config, filter_by: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-2 text-neutral-800 dark:text-neutral-200"
        >
          <option value="estimates">Story Points (Estimaciones)</option>
          <option value="work_items">Cantidad de Tareas</option>
        </select>
      </div>
    </div>
  );
}
