"use client";

import React, { useState, useMemo, useEffect } from "react";
import { createPortal } from "react-dom";
import type { DateRange } from "react-day-picker";
import { Milestone, Project, WorkItem, Release, Cycle } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Calendar } from "@/components/ui/calendar";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import {
  Flag,
  Rocket,
  RefreshCw,
  Clock,
  Calendar as CalendarIcon,
  Check,
  Zap,
  Maximize2,
  CheckSquare,
  Square,
  Layers,
  RotateCcw,
  Eye,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Skeleton } from "@/components/ui/skeleton";

interface ProjectBurnupChartProps {
  project?: Project | null;
  workItems: WorkItem[];
  milestones: Milestone[];
  releases?: Release[];
  cycles?: Cycle[];
  isLoading?: boolean;
}

interface TimelinePoint {
  date: string;
  fullDate: string;
  timestamp: number;
  scope: number;
  completed: number | null;
  pending: number | null;
  idealCompleted: number;
  idealRemaining: number;
  itemsResolvedInInterval: WorkItem[];
  intervalDays: number;
  intervalLabel: string;
  avgLeadTimeDays: number | null;
}

interface LayerVisibility {
  completedActual: boolean;
  idealLine: boolean;
  totalScope: boolean;
  milestones: boolean;
  releases: boolean;
  cycles: boolean;
}

interface TooltipPosition {
  screenX: number;
  screenY: number;
}

type TooltipState =
  | ({ kind: "point"; point: TimelinePoint } & TooltipPosition)
  | ({ kind: "milestone"; milestone: Milestone } & TooltipPosition)
  | ({ kind: "release"; release: Release } & TooltipPosition)
  | ({ kind: "cycle"; cycle: Cycle } & TooltipPosition);

export function ProjectBurnupChart({
  project,
  workItems = [],
  milestones = [],
  releases = [],
  cycles = [],
  isLoading,
}: ProjectBurnupChartProps) {
  const [chartType, setChartType] = useState<"burnup" | "burndown">("burnup");
  const [activeTooltip, setActiveTooltip] = useState<TooltipState | null>(null);
  const [hoveredPointIndex, setHoveredPointIndex] = useState<number | null>(null);
  const [isExpanded, setIsExpanded] = useState(false);
  const [density, setDensity] = useState<"1x" | "1.5x" | "2x">("1x");
  const [isMounted, setIsMounted] = useState(false);

  // Filtro de rango de fechas con Calendar de Shadcn
  const [dateRange, setDateRange] = useState<DateRange | undefined>(undefined);

  // Visibilidad de capas
  const [layers, setLayers] = useState<LayerVisibility>({
    completedActual: true,
    idealLine: true,
    totalScope: true,
    milestones: true,
    releases: true,
    cycles: true,
  });

  useEffect(() => {
    setIsMounted(true);
  }, []);

  const allLayersActive =
    layers.completedActual &&
    layers.idealLine &&
    layers.totalScope &&
    layers.milestones &&
    layers.releases &&
    layers.cycles;

  const resetLayers = () => {
    setLayers({
      completedActual: true,
      idealLine: true,
      totalScope: true,
      milestones: true,
      releases: true,
      cycles: true,
    });
  };

  // Límites temporales efectivos considerando el filtro de rango
  const effectiveDates = useMemo(() => {
    let startDate = project?.start_date
      ? new Date(project.start_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let targetDate = project?.target_date
      ? new Date(project.target_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (targetDate <= startDate) {
      targetDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    if (dateRange?.from) {
      const fromD = new Date(dateRange.from);
      fromD.setHours(0, 0, 0, 0);
      startDate = fromD;

      if (dateRange.to) {
        const toD = new Date(dateRange.to);
        toD.setHours(23, 59, 59, 999);
        targetDate = toD;
      }
    }

    return { startDate, targetDate };
  }, [project, dateRange]);

  // Duración en días y puntos de muestreo adaptativos
  const projectDurationDays = useMemo(() => {
    const s = effectiveDates.startDate.getTime();
    const t = effectiveDates.targetDate.getTime();
    return Math.max(1, Math.round((t - s) / (1000 * 60 * 60 * 24)));
  }, [effectiveDates]);

  const pointsCount = useMemo(() => {
    if (projectDurationDays > 180) return 22;
    if (projectDurationDays > 90) return 18;
    if (projectDurationDays > 45) return 14;
    return 10;
  }, [projectDurationDays]);

  // Estadísticas del período seleccionado
  const rangeStats = useMemo(() => {
    if (!dateRange?.from) return null;
    const fromTime = new Date(dateRange.from).setHours(0, 0, 0, 0);
    const toTime = dateRange.to
      ? new Date(dateRange.to).setHours(23, 59, 59, 999)
      : Date.now();

    const itemsCompletedInRange = workItems.filter((w) => {
      if (w.state?.group !== "COMPLETED") return false;
      const cDate = w.completed_at || w.updated_at;
      if (!cDate) return false;
      const t = new Date(cDate).getTime();
      return t >= fromTime && t <= toTime;
    });

    const itemsCreatedInRange = workItems.filter((w) => {
      if (!w.created_at) return false;
      const t = new Date(w.created_at).getTime();
      return t >= fromTime && t <= toTime;
    });

    const totalCompletedUntilEnd = workItems.filter((w) => {
      if (w.state?.group !== "COMPLETED") return false;
      const cDate = w.completed_at || w.updated_at;
      if (!cDate) return false;
      return new Date(cDate).getTime() <= toTime;
    }).length;

    const milestonesInRange = milestones.filter((m) => {
      const t = m.target_date ? new Date(m.target_date).getTime() : null;
      return t && t >= fromTime && t <= toTime;
    });

    const releasesInRange = releases.filter((r) => {
      const d = r.published_at || (r as any).created_at;
      const t = d ? new Date(d).getTime() : null;
      return t && t >= fromTime && t <= toTime;
    });

    return {
      itemsCompletedInRange,
      itemsCreatedInRange,
      totalCompletedUntilEnd,
      milestonesInRange,
      releasesInRange,
      fromFormatted: dateRange.from.toLocaleDateString("es-ES", {
        day: "numeric",
        month: "short",
        year: "numeric",
      }),
      toFormatted: dateRange.to
        ? dateRange.to.toLocaleDateString("es-ES", {
            day: "numeric",
            month: "short",
            year: "numeric",
          })
        : "Hoy",
    };
  }, [dateRange, workItems, milestones, releases]);

  // Generar timeline de puntos equidistantes
  const timelineData: TimelinePoint[] = useMemo(() => {
    const totalScope = Math.max(1, workItems.length);
    const completedItems = workItems.filter((w) => w.state?.group === "COMPLETED");

    const { startDate, targetDate } = effectiveDates;
    const intervalMs = (targetDate.getTime() - startDate.getTime()) / (pointsCount - 1);
    const now = Date.now();

    const points: TimelinePoint[] = [];
    for (let i = 0; i < pointsCount; i++) {
      const pointDate = new Date(startDate.getTime() + i * intervalMs);
      const isPastOrToday = pointDate.getTime() <= now;

      const prevPointDate = i > 0 ? new Date(startDate.getTime() + (i - 1) * intervalMs) : null;
      const intervalDays = prevPointDate
        ? Math.max(1, Math.round((pointDate.getTime() - prevPointDate.getTime()) / (1000 * 60 * 60 * 24)))
        : 0;

      const completedUntilThen = completedItems.filter((w) => {
        const cDate = w.completed_at || w.updated_at;
        return cDate && new Date(cDate).getTime() <= pointDate.getTime();
      }).length;

      const itemsResolvedInInterval = isPastOrToday
        ? completedItems.filter((w) => {
            const cDate = w.completed_at || w.updated_at;
            if (!cDate) return false;
            const t = new Date(cDate).getTime();
            if (i === 0) return t <= pointDate.getTime();
            return t > (prevPointDate ? prevPointDate.getTime() : 0) && t <= pointDate.getTime();
          })
        : [];

      const avgLeadTimeDays =
        itemsResolvedInInterval.length > 0
          ? Math.round(
              itemsResolvedInInterval.reduce((acc, curr) => {
                const start = curr.created_at
                  ? new Date(curr.created_at).getTime()
                  : pointDate.getTime();
                const end = curr.completed_at
                  ? new Date(curr.completed_at).getTime()
                  : pointDate.getTime();
                return acc + Math.max(0, (end - start) / (1000 * 60 * 60 * 24));
              }, 0) / itemsResolvedInInterval.length
            )
          : null;

      const idealCompleted = Math.round((i / (pointsCount - 1)) * totalScope);
      const idealRemaining = totalScope - idealCompleted;

      const label = pointDate.toLocaleDateString("es-ES", { month: "short", day: "numeric" });
      const fullDate = pointDate.toLocaleDateString("es-ES", {
        weekday: "short",
        day: "numeric",
        month: "short",
        year: "numeric",
      });

      points.push({
        date: label,
        fullDate,
        timestamp: pointDate.getTime(),
        scope: totalScope,
        completed: isPastOrToday ? completedUntilThen : null,
        pending: isPastOrToday ? Math.max(0, totalScope - completedUntilThen) : null,
        idealCompleted,
        idealRemaining,
        itemsResolvedInInterval,
        intervalDays,
        intervalLabel: i === 0 ? "al inicio del seguimiento" : `en los últimos ${intervalDays} días`,
        avgLeadTimeDays,
      });
    }

    return points;
  }, [workItems, pointsCount, effectiveDates]);

  const maxVal = Math.max(1, workItems.length);

  // Formateador de texto para el botón del Calendar
  const formatDateRangeLabel = (range: DateRange | undefined) => {
    if (!range?.from) return "Filtrar por rango de fechas";
    const fromStr = range.from.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
    });
    if (!range.to) return `Desde: ${fromStr}`;
    const toStr = range.to.toLocaleDateString("es-ES", {
      day: "numeric",
      month: "short",
      year: "numeric",
    });
    return `${fromStr} - ${toStr}`;
  };

  // Renderizado del tooltip flotante mediante React Portal en document.body (nunca recortado)
  const renderPortalTooltip = () => {
    if (!isMounted || !activeTooltip) return null;

    const tooltipWidth = 340;
    let clampedLeft = activeTooltip.screenX - tooltipWidth / 2;
    if (clampedLeft < 16) clampedLeft = 16;
    if (clampedLeft + tooltipWidth > window.innerWidth - 16) {
      clampedLeft = window.innerWidth - tooltipWidth - 16;
    }

    const placeAbove = activeTooltip.screenY - 260 > 16;
    const clampedTop = placeAbove ? activeTooltip.screenY - 12 : activeTooltip.screenY + 16;

    // Buscar si hay hitos o releases que coinciden con este punto temporal
    const matchingMilestones =
      activeTooltip.kind === "point"
        ? milestones.filter((m) => {
            if (!m.target_date) return false;
            const t = new Date(m.target_date).getTime();
            const ptTime = activeTooltip.point.timestamp;
            return Math.abs(t - ptTime) <= 86400000 * 2;
          })
        : [];

    const matchingReleases =
      activeTooltip.kind === "point"
        ? releases.filter((r) => {
            const d = r.published_at || (r as any).created_at;
            if (!d) return false;
            const t = new Date(d).getTime();
            const ptTime = activeTooltip.point.timestamp;
            return Math.abs(t - ptTime) <= 86400000 * 2;
          })
        : [];

    return createPortal(
      <div
        className={cn(
          "fixed z-[99999] pointer-events-none transition-transform duration-75 p-3.5 rounded-xl border shadow-2xl text-xs max-w-xs sm:max-w-sm backdrop-blur-md",
          "bg-white/95 dark:bg-slate-900/95 border-slate-200/90 dark:border-slate-800"
        )}
        style={{
          left: `${clampedLeft}px`,
          top: `${clampedTop}px`,
          transform: placeAbove ? "translateY(-100%)" : "translateY(0)",
        }}
      >
        {activeTooltip.kind === "point" && (
          <div className="space-y-2.5">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <div className="flex items-center gap-1.5 text-slate-800 dark:text-slate-200 font-bold">
                <CalendarIcon className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>{activeTooltip.point.fullDate}</span>
              </div>
              <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400">
                Alcance: {activeTooltip.point.scope}
              </span>
            </div>

            <div className="grid grid-cols-2 gap-2 text-[11px]">
              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  {chartType === "burnup" ? "Completadas Reales" : "Pendientes Reales"}
                </span>
                <span className="text-sm font-bold text-slate-900 dark:text-slate-100">
                  {chartType === "burnup"
                    ? activeTooltip.point.completed !== null
                      ? `${activeTooltip.point.completed} / ${activeTooltip.point.scope}`
                      : "Pendiente"
                    : activeTooltip.point.pending !== null
                    ? `${activeTooltip.point.pending} / ${activeTooltip.point.scope}`
                    : "Pendiente"}
                </span>
              </div>

              <div className="p-2 rounded-lg bg-slate-50 dark:bg-slate-800/60 border border-slate-100 dark:border-slate-800">
                <span className="text-slate-400 block text-[10px] uppercase font-semibold">
                  Ritmo Ideal
                </span>
                <span className="text-sm font-bold text-slate-600 dark:text-slate-300">
                  {chartType === "burnup"
                    ? `${activeTooltip.point.idealCompleted} tareas`
                    : `${activeTooltip.point.idealRemaining} tareas`}
                </span>
              </div>
            </div>

            {/* Resumen de Work Items resueltos en este tiempo */}
            <div className="p-2.5 rounded-lg bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 space-y-1.5">
              <div className="flex items-center justify-between text-indigo-950 dark:text-indigo-200">
                <span className="font-semibold flex items-center gap-1.5">
                  <Zap className="size-3.5 text-indigo-600 dark:text-indigo-400" />
                  <span>
                    {activeTooltip.point.itemsResolvedInInterval.length}{" "}
                    {activeTooltip.point.itemsResolvedInInterval.length === 1
                      ? "tarea resuelta"
                      : "tareas resueltas"}
                  </span>
                </span>
                <span className="text-[10px] text-indigo-700/80 dark:text-indigo-300/80">
                  {activeTooltip.point.intervalLabel}
                </span>
              </div>

              {activeTooltip.point.avgLeadTimeDays !== null && (
                <div className="text-[10px] text-slate-500 dark:text-slate-400 flex items-center gap-1">
                  <Clock className="size-3 text-slate-400" />
                  <span>
                    Tiempo medio de resolución: {activeTooltip.point.avgLeadTimeDays}{" "}
                    {activeTooltip.point.avgLeadTimeDays === 1 ? "día" : "días"}
                  </span>
                </div>
              )}

              {activeTooltip.point.itemsResolvedInInterval.length > 0 && (
                <div className="pt-1 border-t border-indigo-100/60 dark:border-indigo-900/40 space-y-1">
                  {activeTooltip.point.itemsResolvedInInterval.slice(0, 3).map((item) => (
                    <div
                      key={item.id}
                      className="flex items-center gap-1.5 text-[11px] text-slate-700 dark:text-slate-300 truncate"
                    >
                      <span className="font-mono text-[10px] font-bold text-indigo-600 dark:text-indigo-400 shrink-0">
                        {item.identifier || `#${item.sequence_id}`}
                      </span>
                      <span className="truncate">{item.title}</span>
                    </div>
                  ))}
                  {activeTooltip.point.itemsResolvedInInterval.length > 3 && (
                    <span className="text-[10px] font-medium text-indigo-600 dark:text-indigo-400 block pt-0.5">
                      + {activeTooltip.point.itemsResolvedInInterval.length - 3} tareas más en este lapso
                    </span>
                  )}
                </div>
              )}
            </div>

            {/* Hitos coincidentes en esta fecha */}
            {matchingMilestones.length > 0 && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                {matchingMilestones.map((m) => (
                  <div key={m.id} className="flex items-center gap-1.5 text-[11px] text-rose-600 dark:text-rose-400 font-semibold">
                    <Flag className="size-3 shrink-0" />
                    <span>Hito objetivo: {m.title}</span>
                  </div>
                ))}
              </div>
            )}

            {/* Releases coincidentes en esta fecha */}
            {matchingReleases.length > 0 && (
              <div className="pt-1 border-t border-slate-100 dark:border-slate-800 space-y-1">
                {matchingReleases.map((r) => (
                  <div key={r.id} className="flex items-center gap-1.5 text-[11px] text-violet-600 dark:text-violet-400 font-semibold">
                    <Rocket className="size-3 shrink-0" />
                    <span>Versión: {r.name} ({r.version})</span>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {activeTooltip.kind === "milestone" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <span className="inline-flex items-center gap-1.5 text-rose-600 font-bold uppercase text-[10px] tracking-wider">
                <Flag className="size-3.5" />
                Hito del Proyecto
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  activeTooltip.milestone.status === "COMPLETED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-blue-50 text-blue-700 border-blue-200"
                )}
              >
                {activeTooltip.milestone.status === "COMPLETED" ? "Completado" : "Pendiente"}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {activeTooltip.milestone.title}
              </h4>
              {activeTooltip.milestone.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                  {activeTooltip.milestone.description}
                </p>
              )}
            </div>

            <div className="space-y-1.5 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-400">
                  <CalendarIcon className="size-3" />
                  <span>Fecha objetivo:</span>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeTooltip.milestone.target_date
                    ? new Date(activeTooltip.milestone.target_date).toLocaleDateString("es-ES", {
                        day: "numeric",
                        month: "long",
                        year: "numeric",
                      })
                    : "Sin fecha fijada"}
                </span>
              </div>

              {activeTooltip.milestone.completed_at && (
                <div className="flex items-center justify-between text-emerald-600">
                  <span className="flex items-center gap-1">
                    <Check className="size-3" />
                    <span>Completado el:</span>
                  </span>
                  <span>{new Date(activeTooltip.milestone.completed_at).toLocaleDateString("es-ES")}</span>
                </div>
              )}

              <div className="pt-1.5 border-t border-slate-100 dark:border-slate-800">
                <div className="flex items-center justify-between font-semibold mb-1">
                  <span>Progreso de tareas</span>
                  <span>
                    {activeTooltip.milestone.completed_work_items || 0} /{" "}
                    {activeTooltip.milestone.total_work_items || 0} (
                    {activeTooltip.milestone.progress_percentage || 0}%)
                  </span>
                </div>
                <div className="w-full bg-slate-100 dark:bg-slate-800 h-1.5 rounded-full overflow-hidden">
                  <div
                    className="bg-rose-500 h-full rounded-full transition-all"
                    style={{ width: `${activeTooltip.milestone.progress_percentage || 0}%` }}
                  />
                </div>
              </div>
            </div>
          </div>
        )}

        {activeTooltip.kind === "release" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <span className="inline-flex items-center gap-1.5 text-violet-600 font-bold uppercase text-[10px] tracking-wider">
                <Rocket className="size-3.5" />
                Versión / Release
              </span>
              <span
                className={cn(
                  "text-[10px] font-bold px-2 py-0.5 rounded-full border",
                  activeTooltip.release.status === "PUBLISHED"
                    ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                    : "bg-amber-50 text-amber-700 border-amber-200"
                )}
              >
                {activeTooltip.release.status === "PUBLISHED" ? "Publicado" : "Borrador"}
              </span>
            </div>

            <div>
              <div className="flex items-center gap-2">
                <span className="font-mono text-xs font-bold px-1.5 py-0.5 rounded bg-violet-50 text-violet-700 border border-violet-100">
                  {activeTooltip.release.version}
                </span>
                <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100 truncate">
                  {activeTooltip.release.name}
                </h4>
              </div>
              {activeTooltip.release.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-3 leading-relaxed">
                  {activeTooltip.release.description}
                </p>
              )}
            </div>

            <div className="space-y-1 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span className="flex items-center gap-1 text-slate-400">
                  <CalendarIcon className="size-3" />
                  <span>Fecha:</span>
                </span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {new Date(
                    activeTooltip.release.published_at || (activeTooltip.release as any).created_at
                  ).toLocaleDateString("es-ES", {
                    day: "numeric",
                    month: "long",
                    year: "numeric",
                  })}
                </span>
              </div>

              <div className="flex items-center justify-between pt-1">
                <span className="text-slate-400">Work items incluidos:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {Array.isArray(activeTooltip.release.work_items)
                    ? activeTooltip.release.work_items.length
                    : 0}{" "}
                  items
                </span>
              </div>
            </div>
          </div>
        )}

        {activeTooltip.kind === "cycle" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between gap-2 border-b border-slate-100 dark:border-slate-800 pb-1.5">
              <span className="inline-flex items-center gap-1.5 text-emerald-600 font-bold uppercase text-[10px] tracking-wider">
                <RefreshCw className="size-3.5" />
                Ciclo / Sprint
              </span>
              <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200">
                {activeTooltip.cycle.status}
              </span>
            </div>

            <div>
              <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                {activeTooltip.cycle.name}
              </h4>
              {activeTooltip.cycle.description && (
                <p className="text-xs text-slate-500 mt-1 line-clamp-2">
                  {activeTooltip.cycle.description}
                </p>
              )}
            </div>

            <div className="space-y-1 pt-1 text-[11px] text-slate-600 dark:text-slate-400">
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Período:</span>
                <span className="font-semibold text-slate-800 dark:text-slate-200">
                  {activeTooltip.cycle.start_date || "Inicio"} → {activeTooltip.cycle.end_date || "Fin"}
                </span>
              </div>
              <div className="flex items-center justify-between">
                <span className="text-slate-400">Tareas del ciclo:</span>
                <span className="font-bold text-slate-800 dark:text-slate-200">
                  {(activeTooltip.cycle as any).total_items ||
                    (activeTooltip.cycle as any).total_work_items ||
                    0}{" "}
                  tareas
                </span>
              </div>
            </div>
          </div>
        )}
      </div>,
      document.body
    );
  };

  // Función para renderizar el SVG del gráfico
  const renderSvgChart = (expanded: boolean) => {
    const densityFactor = density === "2x" ? 2 : density === "1.5x" ? 1.5 : 1;
    const baseWidth = expanded ? 1400 : 560;
    const chartWidth = Math.round(baseWidth * densityFactor);
    const chartHeight = expanded ? 400 : 200;

    const paddingLeft = expanded ? 45 : 35;
    const paddingRight = expanded ? 30 : 20;
    const paddingTop = expanded ? 35 : 25;
    const paddingBottom = expanded ? 35 : 30;

    const innerWidth = chartWidth - paddingLeft - paddingRight;
    const innerHeight = chartHeight - paddingTop - paddingBottom;

    const getX = (index: number) =>
      paddingLeft + (index / (timelineData.length - 1)) * innerWidth;
    const getY = (val: number) =>
      paddingTop + innerHeight - (val / maxVal) * innerHeight;

    const firstTime = timelineData[0]?.timestamp || 0;
    const lastTime = timelineData[timelineData.length - 1]?.timestamp || 1;

    // Build SVG Paths
    const idealPath = timelineData
      .map((p, i) => {
        const val = chartType === "burnup" ? p.idealCompleted : p.idealRemaining;
        const x = getX(i);
        const y = getY(val);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");

    // Curva de avance real corregida: SIEMPRE arranca con 'M' en el primer punto válido
    const validActualPoints = timelineData
      .map((p, index) => ({ p, index }))
      .filter(({ p }) => (chartType === "burnup" ? p.completed !== null : p.pending !== null));

    const actualPath =
      validActualPoints.length > 0
        ? validActualPoints
            .map(({ p, index }, i) => {
              const val = chartType === "burnup" ? p.completed! : p.pending!;
              const x = getX(index);
              const y = getY(val);
              return `${i === 0 ? "M" : "L"} ${x} ${y}`;
            })
            .join(" ")
        : "";

    // Área sombreada bajo la curva
    const actualAreaPath =
      validActualPoints.length > 1
        ? (() => {
            const firstP = validActualPoints[0];
            const lastP = validActualPoints[validActualPoints.length - 1];
            const startX = getX(firstP.index);
            const endX = getX(lastP.index);
            const bottomY = getY(0);
            return `${actualPath} L ${endX} ${bottomY} L ${startX} ${bottomY} Z`;
          })()
        : "";

    const scopePath = `M ${paddingLeft} ${getY(maxVal)} L ${paddingLeft + innerWidth} ${getY(maxVal)}`;

    // Manejador centralizado de movimiento sobre la superficie del SVG
    const handleSvgMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
      // Si el usuario está sobre un pin de hito o release, no sobreescribir el tooltip
      if (activeTooltip && activeTooltip.kind !== "point") return;

      const svgRect = e.currentTarget.getBoundingClientRect();
      const clientX = e.clientX - svgRect.left;
      const svgX = (clientX / svgRect.width) * chartWidth;

      if (svgX < paddingLeft || svgX > paddingLeft + innerWidth) {
        setHoveredPointIndex(null);
        if (activeTooltip?.kind === "point") setActiveTooltip(null);
        return;
      }

      const stepWidth = innerWidth / (timelineData.length - 1);
      const index = Math.round((svgX - paddingLeft) / stepWidth);
      const clampedIndex = Math.max(0, Math.min(timelineData.length - 1, index));

      setHoveredPointIndex(clampedIndex);
      const p = timelineData[clampedIndex];
      if (p) {
        const pX = paddingLeft + (clampedIndex / (timelineData.length - 1)) * innerWidth;
        const screenX = svgRect.left + (pX / chartWidth) * svgRect.width;
        const val = chartType === "burnup" ? p.completed : p.pending;
        const pY = val !== null ? getY(val) : paddingTop + innerHeight / 2;
        const screenY = svgRect.top + (pY / chartHeight) * svgRect.height;

        setActiveTooltip({
          kind: "point",
          point: p,
          screenX,
          screenY,
        });
      }
    };

    const handleSvgMouseLeave = () => {
      setHoveredPointIndex(null);
      if (activeTooltip?.kind === "point") setActiveTooltip(null);
    };

    return (
      <div className="relative w-full overflow-x-auto select-none">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          style={{ width: expanded && density === "1x" ? "100%" : `${chartWidth}px` }}
          className="h-auto overflow-visible select-none min-w-full cursor-crosshair"
          onMouseMove={handleSvgMouseMove}
          onMouseLeave={handleSvgMouseLeave}
        >
          {/* DEFINICIONES: Degradados para áreas */}
          <defs>
            <linearGradient id="actualGradient" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor={chartType === "burnup" ? "#6366f1" : "#f59e0b"} stopOpacity="0.18" />
              <stop offset="100%" stopColor={chartType === "burnup" ? "#6366f1" : "#f59e0b"} stopOpacity="0.0" />
            </linearGradient>
          </defs>

          {/* CAPA 1: Rejilla y Eje Y */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + innerHeight - pct * innerHeight;
            const val = Math.round(pct * maxVal);
            return (
              <g key={`grid-${idx}`}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="2,2"
                  className="dark:stroke-slate-800"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono pointer-events-none select-none"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* CAPA 2: Línea de Alcance Total */}
          {layers.totalScope && (
            <path
              d={scopePath}
              stroke="#94a3b8"
              strokeWidth="1.5"
              strokeDasharray="4,4"
              fill="none"
              className="pointer-events-none"
            />
          )}

          {/* CAPA 3: Línea Ideal Proyectada */}
          {layers.idealLine && (
            <path
              d={idealPath}
              stroke="#cbd5e1"
              strokeWidth="2"
              strokeDasharray="4,4"
              fill="none"
              className="dark:stroke-slate-700 pointer-events-none"
            />
          )}

          {/* CAPA 4: Área sombreada bajo la curva de avance real */}
          {layers.completedActual && actualAreaPath && (
            <path d={actualAreaPath} fill="url(#actualGradient)" className="pointer-events-none" />
          )}

          {/* CAPA 5: Curva de Avance Real */}
          {layers.completedActual && actualPath && (
            <path
              d={actualPath}
              stroke={chartType === "burnup" ? "#6366f1" : "#f59e0b"}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
              className="pointer-events-none"
            />
          )}

          {/* CAPA 6: Línea guía Crosshair al pasar el ratón */}
          {hoveredPointIndex !== null && (
            <line
              x1={getX(hoveredPointIndex)}
              y1={paddingTop}
              x2={getX(hoveredPointIndex)}
              y2={paddingTop + innerHeight}
              stroke="#818cf8"
              strokeWidth="1.5"
              strokeDasharray="3,3"
              className="pointer-events-none"
            />
          )}

          {/* CAPA 7: Puntos de datos en la curva (Radio dinámico sin CSS scale) */}
          {layers.completedActual &&
            timelineData.map((p, idx) => {
              const val = chartType === "burnup" ? p.completed : p.pending;
              if (val === null) return null;
              const x = getX(idx);
              const y = getY(val);
              const isHovered = hoveredPointIndex === idx;

              return (
                <circle
                  key={`pt-${idx}`}
                  cx={x}
                  cy={y}
                  r={isHovered ? (expanded ? 7 : 6) : expanded ? 5 : 4}
                  fill={chartType === "burnup" ? "#6366f1" : "#f59e0b"}
                  stroke="#ffffff"
                  strokeWidth={isHovered ? 2.5 : 1.5}
                  className="transition-all duration-75 pointer-events-none"
                />
              );
            })}

          {/* CAPA 8: Líneas y Pines de Ciclos (Sprint) */}
          {layers.cycles &&
            cycles.map((c, cIdx) => {
              if (!c.end_date) return null;
              const cTime = new Date(c.end_date).getTime();
              if (cTime < firstTime || cTime > lastTime) return null;

              const ratio = (cTime - firstTime) / (lastTime - firstTime);
              const cX = paddingLeft + ratio * innerWidth;

              return (
                <g
                  key={`cycle-${c.id || cIdx}`}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    const targetRect = e.currentTarget.getBoundingClientRect();
                    setActiveTooltip({
                      kind: "cycle",
                      cycle: c,
                      screenX: targetRect.left + targetRect.width / 2,
                      screenY: targetRect.top,
                    });
                  }}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <line
                    x1={cX}
                    y1={paddingTop}
                    x2={cX}
                    y2={paddingTop + innerHeight}
                    stroke="#10b981"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                  {/* Zona táctil invisible de 24px para hover infalible */}
                  <circle cx={cX} cy={paddingTop + 5} r="12" fill="transparent" />
                  <circle
                    cx={cX}
                    cy={paddingTop + 5}
                    r="4.5"
                    fill="#10b981"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

          {/* CAPA 9: Líneas y Pines de Releases (Versiones) */}
          {layers.releases &&
            releases.map((rel, rIdx) => {
              const relDateStr = rel.published_at || (rel as any).created_at;
              if (!relDateStr) return null;
              const rTime = new Date(relDateStr).getTime();
              if (rTime < firstTime || rTime > lastTime) return null;

              const ratio = (rTime - firstTime) / (lastTime - firstTime);
              const rX = paddingLeft + ratio * innerWidth;

              return (
                <g
                  key={`rel-${rel.id || rIdx}`}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    const targetRect = e.currentTarget.getBoundingClientRect();
                    setActiveTooltip({
                      kind: "release",
                      release: rel,
                      screenX: targetRect.left + targetRect.width / 2,
                      screenY: targetRect.top,
                    });
                  }}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <line
                    x1={rX}
                    y1={paddingTop}
                    x2={rX}
                    y2={paddingTop + innerHeight}
                    stroke="#8b5cf6"
                    strokeWidth="1.5"
                    strokeDasharray="3,3"
                  />
                  {/* Zona táctil invisible de 24px */}
                  <circle cx={rX} cy={paddingTop + 5} r="12" fill="transparent" />
                  <circle
                    cx={rX}
                    cy={paddingTop + 5}
                    r="4.5"
                    fill="#8b5cf6"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

          {/* CAPA 10: Líneas y Pines de Hitos (Milestones) */}
          {layers.milestones &&
            milestones.map((m, mIdx) => {
              if (!m.target_date) return null;
              const mTime = new Date(m.target_date).getTime();
              if (mTime < firstTime || mTime > lastTime) return null;

              const ratio = (mTime - firstTime) / (lastTime - firstTime);
              const mX = paddingLeft + ratio * innerWidth;

              return (
                <g
                  key={`m-${m.id || mIdx}`}
                  className="cursor-pointer"
                  onMouseEnter={(e) => {
                    e.stopPropagation();
                    const targetRect = e.currentTarget.getBoundingClientRect();
                    setActiveTooltip({
                      kind: "milestone",
                      milestone: m,
                      screenX: targetRect.left + targetRect.width / 2,
                      screenY: targetRect.top,
                    });
                  }}
                  onMouseLeave={() => setActiveTooltip(null)}
                >
                  <line
                    x1={mX}
                    y1={paddingTop}
                    x2={mX}
                    y2={paddingTop + innerHeight}
                    stroke="#ef4444"
                    strokeWidth="1.5"
                    strokeDasharray="2,2"
                  />
                  {/* Zona táctil invisible de 24px */}
                  <circle cx={mX} cy={paddingTop + 5} r="12" fill="transparent" />
                  <circle
                    cx={mX}
                    cy={paddingTop + 5}
                    r="5"
                    fill="#ef4444"
                    stroke="#ffffff"
                    strokeWidth="1.5"
                  />
                </g>
              );
            })}

          {/* CAPA 11: Etiquetas de Fecha del Eje X */}
          {timelineData.map((p, idx) => {
            const shouldSkip =
              !expanded && density === "1x" && idx % 2 !== 0 && idx !== timelineData.length - 1;
            if (shouldSkip) return null;
            const x = getX(idx);
            return (
              <text
                key={`label-${idx}`}
                x={x}
                y={paddingTop + innerHeight + 16}
                textAnchor="middle"
                className="fill-slate-400 text-[10px] select-none font-mono pointer-events-none"
              >
                {p.date}
              </text>
            );
          })}
        </svg>
      </div>
    );
  };

  // Barra de herramientas de capas (Checkboxes)
  const renderLayersToolbar = () => (
    <div className="flex flex-wrap items-center gap-1.5 py-1 text-xs">
      <span className="text-[11px] font-semibold text-slate-500 flex items-center gap-1 mr-1">
        <Layers className="size-3.5" />
        <span>Capas:</span>
      </span>

      <button
        type="button"
        onClick={() => setLayers((prev) => ({ ...prev, completedActual: !prev.completedActual }))}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
          layers.completedActual
            ? "bg-indigo-50/80 dark:bg-indigo-950/40 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300"
            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
        )}
      >
        {layers.completedActual ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
        <span>{chartType === "burnup" ? "Avance real" : "Restante real"}</span>
      </button>

      <button
        type="button"
        onClick={() => setLayers((prev) => ({ ...prev, idealLine: !prev.idealLine }))}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
          layers.idealLine
            ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
        )}
      >
        {layers.idealLine ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
        <span>Línea ideal</span>
      </button>

      <button
        type="button"
        onClick={() => setLayers((prev) => ({ ...prev, totalScope: !prev.totalScope }))}
        className={cn(
          "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
          layers.totalScope
            ? "bg-slate-100 dark:bg-slate-800 border-slate-300 dark:border-slate-700 text-slate-700 dark:text-slate-200"
            : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
        )}
      >
        {layers.totalScope ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
        <span>Alcance ({maxVal})</span>
      </button>

      {milestones.length > 0 && (
        <button
          type="button"
          onClick={() => setLayers((prev) => ({ ...prev, milestones: !prev.milestones }))}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
            layers.milestones
              ? "bg-rose-50/80 dark:bg-rose-950/40 border-rose-200 dark:border-rose-800 text-rose-700 dark:text-rose-300"
              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
          )}
        >
          {layers.milestones ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
          <Flag className="size-3 text-rose-500" />
          <span>Hitos ({milestones.length})</span>
        </button>
      )}

      {releases.length > 0 && (
        <button
          type="button"
          onClick={() => setLayers((prev) => ({ ...prev, releases: !prev.releases }))}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
            layers.releases
              ? "bg-violet-50/80 dark:bg-violet-950/40 border-violet-200 dark:border-violet-800 text-violet-700 dark:text-violet-300"
              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
          )}
        >
          {layers.releases ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
          <Rocket className="size-3 text-violet-500" />
          <span>Releases ({releases.length})</span>
        </button>
      )}

      {cycles.length > 0 && (
        <button
          type="button"
          onClick={() => setLayers((prev) => ({ ...prev, cycles: !prev.cycles }))}
          className={cn(
            "inline-flex items-center gap-1.5 px-2 py-1 rounded text-[11px] font-medium border transition-colors cursor-pointer",
            layers.cycles
              ? "bg-emerald-50/80 dark:bg-emerald-950/40 border-emerald-200 dark:border-emerald-800 text-emerald-700 dark:text-emerald-300"
              : "bg-slate-50 dark:bg-slate-800/40 border-slate-200 dark:border-slate-800 text-slate-400 opacity-60"
          )}
        >
          {layers.cycles ? <CheckSquare className="size-3" /> : <Square className="size-3" />}
          <RefreshCw className="size-3 text-emerald-500" />
          <span>Ciclos ({cycles.length})</span>
        </button>
      )}

      {!allLayersActive && (
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetLayers}
          className="h-6 px-1.5 text-[10px] text-slate-500 hover:text-indigo-600"
        >
          <Eye className="size-3 mr-1" />
          Mostrar todas
        </Button>
      )}
    </div>
  );

  // Selector de filtro de rango de fechas con Calendar de Shadcn
  const renderDateControls = () => (
    <div className="flex flex-wrap items-center justify-between gap-2 py-1.5 border-t border-slate-100 dark:border-slate-800/80">
      <div className="flex flex-wrap items-center gap-2">
        <div className="flex items-center gap-1.5 text-xs text-slate-500 font-medium shrink-0">
          <CalendarIcon className="size-3.5 text-slate-400" />
          <span>Filtro de fechas:</span>
        </div>

        {/* Popover con Calendar de Shadcn en modo range */}
        <Popover>
          <PopoverTrigger asChild>
            <Button
              variant="outline"
              size="sm"
              className={cn(
                "h-7 px-2.5 text-xs font-normal justify-start text-left border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-900 shadow-2xs",
                !dateRange?.from && "text-slate-600 dark:text-slate-400"
              )}
            >
              <CalendarIcon className="mr-1.5 size-3.5 text-indigo-600 dark:text-indigo-400 shrink-0" />
              <span>{formatDateRangeLabel(dateRange)}</span>
            </Button>
          </PopoverTrigger>
          <PopoverContent
            className="w-auto p-0 z-[120] bg-white dark:bg-slate-900 shadow-xl border-slate-200 dark:border-slate-800"
            align="start"
          >
            <div className="p-3 border-b border-slate-100 dark:border-slate-800 flex items-center justify-between gap-2">
              <span className="text-xs font-semibold text-slate-800 dark:text-slate-200">
                Seleccionar rango de fechas
              </span>
              {dateRange?.from && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => setDateRange(undefined)}
                  className="h-6 px-1.5 text-[11px] text-rose-600 hover:text-rose-700 hover:bg-rose-50"
                >
                  <RotateCcw className="size-2.5 mr-1" />
                  Limpiar
                </Button>
              )}
            </div>
            <Calendar
              mode="range"
              defaultMonth={dateRange?.from || effectiveDates.startDate}
              selected={dateRange}
              onSelect={setDateRange}
              numberOfMonths={2}
              className="p-3"
            />
          </PopoverContent>
        </Popover>

        {/* Presets rápidos */}
        <div className="flex items-center gap-1">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDateRange(undefined)}
            className={cn(
              "h-6 px-2 text-[11px] font-medium rounded",
              dateRange === undefined
                ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-100 font-semibold"
                : "text-slate-500 hover:text-slate-700"
            )}
          >
            Todo
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const to = new Date();
              const from = new Date();
              from.setDate(to.getDate() - 30);
              setDateRange({ from, to });
            }}
            className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-700"
          >
            30 días
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const to = new Date();
              const from = new Date();
              from.setDate(to.getDate() - 90);
              setDateRange({ from, to });
            }}
            className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-700"
          >
            90 días
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => {
              const from = project?.start_date
                ? new Date(project.start_date)
                : new Date(Date.now() - 30 * 86400000);
              const to = new Date();
              setDateRange({ from, to });
            }}
            className="h-6 px-2 text-[11px] text-slate-500 hover:text-slate-700"
          >
            Hasta hoy
          </Button>
        </div>

        {dateRange?.from && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setDateRange(undefined)}
            className="h-6 px-1.5 text-[10px] text-slate-400 hover:text-rose-600"
            title="Restablecer a todo el proyecto"
          >
            <RotateCcw className="size-3 mr-0.5" />
            Restablecer
          </Button>
        )}
      </div>

      {/* Selector de densidad / ancho horizontal */}
      <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md text-xs shrink-0">
        <span className="text-[10px] font-semibold text-slate-400 px-1 uppercase">Ancho:</span>
        {(["1x", "1.5x", "2x"] as const).map((d) => (
          <button
            key={d}
            type="button"
            onClick={() => setDensity(d)}
            className={cn(
              "h-5 px-1.5 text-[10px] font-medium rounded transition-colors",
              density === d
                ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            )}
            title={`Densidad de ancho ${d}`}
          >
            {d === "1x" ? "Normal" : d === "1.5x" ? "Amplio" : "Extendido"}
          </button>
        ))}
      </div>
    </div>
  );

  // Tarjeta de snapshot al seleccionar un rango de fechas
  const renderRangeBanner = () => {
    if (!rangeStats) return null;
    return (
      <div className="p-3 rounded-xl bg-indigo-50/70 dark:bg-indigo-950/30 border border-indigo-100 dark:border-indigo-900/50 mb-3 space-y-2 animate-in fade-in duration-200">
        <div className="flex items-center justify-between gap-2 border-b border-indigo-100 dark:border-indigo-900/40 pb-1.5">
          <div className="flex items-center gap-1.5 text-indigo-950 dark:text-indigo-200 font-bold text-xs">
            <CalendarIcon className="size-3.5 text-indigo-600 dark:text-indigo-400" />
            <span>
              Período seleccionado: {rangeStats.fromFormatted} → {rangeStats.toFormatted}
            </span>
          </div>
          <button
            type="button"
            onClick={() => setDateRange(undefined)}
            className="text-[10px] text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
          >
            <RotateCcw className="size-2.5" />
            Ver todo el proyecto
          </button>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-[11px]">
          <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-950 shadow-2xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Completadas en Rango
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {rangeStats.itemsCompletedInRange.length}
              </span>
              <span className="text-slate-400 text-xs">
                (Acum: {rangeStats.totalCompletedUntilEnd})
              </span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-950 shadow-2xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Creadas en Rango
            </span>
            <div className="flex items-baseline gap-1 mt-0.5">
              <span className="text-base font-bold text-slate-900 dark:text-slate-100">
                {rangeStats.itemsCreatedInRange.length}
              </span>
              <span className="text-slate-400 text-xs">tareas</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-950 shadow-2xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Hitos en Período
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 font-bold text-slate-900 dark:text-slate-100">
              <span className="text-base">{rangeStats.milestonesInRange.length}</span>
              <span className="text-slate-400 text-xs">/ {milestones.length}</span>
            </div>
          </div>

          <div className="p-2 rounded-lg bg-white/90 dark:bg-slate-900/90 border border-indigo-100 dark:border-indigo-950 shadow-2xs">
            <span className="text-slate-400 block text-[10px] uppercase font-semibold">
              Releases en Período
            </span>
            <div className="flex items-baseline gap-1 mt-0.5 font-bold text-slate-900 dark:text-slate-100">
              <span className="text-base">{rangeStats.releasesInRange.length}</span>
              <span className="text-slate-400 text-xs">/ {releases.length}</span>
            </div>
          </div>
        </div>
      </div>
    );
  };

  // Leyenda de componentes
  const renderLegend = () => (
    <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 pt-3 border-t border-slate-100 dark:border-slate-800">
      {layers.completedActual && (
        <div className="flex items-center gap-1.5">
          <div
            className="size-2.5 rounded-full"
            style={{ backgroundColor: chartType === "burnup" ? "#6366f1" : "#f59e0b" }}
          />
          <span>{chartType === "burnup" ? "Completado real" : "Restante real"}</span>
        </div>
      )}
      {layers.idealLine && (
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-slate-300 dark:border-slate-700" />
          <span>Línea ideal</span>
        </div>
      )}
      {layers.totalScope && (
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-slate-400 dark:border-slate-600" />
          <span>Alcance total ({maxVal})</span>
        </div>
      )}
      {layers.milestones && milestones.length > 0 && (
        <div className="flex items-center gap-1.5 text-rose-600 dark:text-rose-400 font-medium">
          <Flag className="size-3" />
          <span>Hitos ({milestones.length})</span>
        </div>
      )}
      {layers.releases && releases.length > 0 && (
        <div className="flex items-center gap-1.5 text-violet-600 dark:text-violet-400 font-medium">
          <Rocket className="size-3" />
          <span>Releases ({releases.length})</span>
        </div>
      )}
      {layers.cycles && cycles.length > 0 && (
        <div className="flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
          <RefreshCw className="size-3" />
          <span>Ciclos ({cycles.length})</span>
        </div>
      )}
    </div>
  );

  if (isLoading || !project) {
    return (
      <WidgetCard
        title="Progreso del Proyecto"
        description="Alcance total vs. entregas reales y ritmo ideal proyectado"
      >
        <div className="space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-3 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center gap-2">
              <Skeleton className="h-8 w-28 rounded-md" />
              <Skeleton className="h-8 w-36 rounded-md" />
            </div>
            <div className="flex items-center gap-2">
              <Skeleton className="h-7 w-20 rounded-md" />
              <Skeleton className="h-7 w-20 rounded-md" />
            </div>
          </div>
          <Skeleton className="w-full h-[320px] rounded-xl" />
          <div className="flex items-center justify-center gap-6 pt-2">
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
            <Skeleton className="h-4 w-24" />
          </div>
        </div>
      </WidgetCard>
    );
  }

  return (
    <>
      <WidgetCard
        title={`Progreso del Proyecto (${chartType === "burnup" ? "Burn-up" : "Burn-down"})`}
        description="Alcance total vs. entregas reales y ritmo ideal proyectado (Pasa el cursor para ver detalles)"
        exportFilename={`grafico-${chartType}-proyecto`}
        actions={
          <div className="flex items-center gap-1.5">
            <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setChartType("burnup")}
                className={cn(
                  "h-6 px-2 text-[11px] font-medium rounded",
                  chartType === "burnup"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                Burn-up
              </Button>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => setChartType("burndown")}
                className={cn(
                  "h-6 px-2 text-[11px] font-medium rounded",
                  chartType === "burndown"
                    ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                    : "text-slate-500 hover:text-slate-800 dark:hover:text-slate-200"
                )}
              >
                Burn-down
              </Button>
            </div>

            {/* Botón para expandir gráfica a pantalla completa */}
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(true)}
              className="h-7 w-7 p-0 text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              title="Expandir gráfica a pantalla completa"
            >
              <Maximize2 className="size-3.5" />
            </Button>
          </div>
        }
      >
        <div className="space-y-2">
          {/* Barra de Filtro de Fechas (Shadcn Calendar mode='range') */}
          {renderDateControls()}

          {/* Banner de Snapshot del Período */}
          {renderRangeBanner()}

          {/* Barra de Capas (Checkboxes) */}
          {renderLayersToolbar()}

          {/* Gráfico SVG estándar */}
          {renderSvgChart(false)}

          {/* Leyenda */}
          {renderLegend()}
        </div>
      </WidgetCard>

      {/* Modal Panorámico / Pantalla Completa */}
      <Dialog open={isExpanded} onOpenChange={setIsExpanded}>
        <DialogContent
          className="w-[90vw] max-w-[90vw] sm:w-[90vw] sm:max-w-[90vw] md:w-[90vw] md:max-w-[90vw] lg:w-[90vw] lg:max-w-[90vw] xl:w-[90vw] xl:max-w-[90vw] max-h-[92vh] flex flex-col p-6 overflow-hidden bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-800 shadow-2xl z-[80]"
          overlayClassName="z-[75]"
        >
          <DialogHeader className="shrink-0 pb-3 border-b border-slate-100 dark:border-slate-800">
            <div className="flex items-center justify-between pr-8">
              <div>
                <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2">
                  <span>
                    Progreso del Proyecto ({chartType === "burnup" ? "Burn-up" : "Burn-down"})
                  </span>
                  <Badge variant="outline" className="text-[11px] font-mono">
                    {project.identifier}
                  </Badge>
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500 mt-0.5">
                  Vista panorámica de alta definición • Desplázate horizontalmente para explorar meses anteriores
                </DialogDescription>
              </div>

              <div className="flex items-center gap-2">
                <div className="flex items-center gap-1 bg-slate-100 dark:bg-slate-800 p-0.5 rounded-md">
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setChartType("burnup")}
                    className={cn(
                      "h-6 px-2.5 text-xs font-medium rounded",
                      chartType === "burnup"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Burn-up
                  </Button>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => setChartType("burndown")}
                    className={cn(
                      "h-6 px-2.5 text-xs font-medium rounded",
                      chartType === "burndown"
                        ? "bg-white dark:bg-slate-900 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                        : "text-slate-500 hover:text-slate-800"
                    )}
                  >
                    Burn-down
                  </Button>
                </div>
              </div>
            </div>
          </DialogHeader>

          <div className="flex-1 overflow-y-auto space-y-4 pt-3 pr-1">
            {renderDateControls()}
            {renderRangeBanner()}
            {renderLayersToolbar()}

            <div className="border rounded-2xl p-4 bg-slate-50/50 dark:bg-slate-950/40 border-slate-200 dark:border-slate-800 shadow-inner">
              {renderSvgChart(true)}
            </div>

            {renderLegend()}
          </div>
        </DialogContent>
      </Dialog>

      {/* Tooltip renderizado por portal en document.body (nunca recortado) */}
      {renderPortalTooltip()}
    </>
  );
}
