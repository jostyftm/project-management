"use client";

import React, { useState, useEffect } from "react";
import { Cycle, CycleAnalytics, Project, State } from "@/types/plane-types";
import { cycleService } from "@/services/plane/cycleService";
import { CycleProgressRing } from "./CycleProgressRing";
import { CycleBreakdownSidebar } from "./CycleBreakdownSidebar";
import { CycleBurndownChart } from "./CycleBurndownChart";
import { CycleWorkItemsSection } from "./CycleWorkItemsSection";
import {
  Calendar,
  Info,
  Bell,
  MoreHorizontal,
  Edit2,
  CheckCircle2,
  Trash2,
  Share2,
  ExternalLink,
  ChevronRight,
  TrendingUp,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CycleDetailViewProps {
  cycle?: Cycle | null;
  analytics?: CycleAnalytics | null;
  projectId?: string;
  project?: Project | null;
  states?: State[];
  activeTab?: "active" | "upcoming" | "completed";
  onTabChange?: (tab: "active" | "upcoming" | "completed") => void;
  onEditCycle?: (cycle: Cycle) => void;
  onEditDates?: (cycle: Cycle) => void;
  onCompleteCycle?: (cycle: Cycle) => void;
  onDeleteCycle?: (cycle: Cycle) => void;
  onCreateCycle?: () => void;
  onCycleUpdated?: () => void;
  upcomingContent?: React.ReactNode;
  completedContent?: React.ReactNode;
  className?: string;
}

export function CycleDetailView({
  cycle,
  analytics: initialAnalytics,
  projectId,
  project,
  states = [],
  activeTab = "active",
  onTabChange,
  onEditCycle,
  onEditDates,
  onCompleteCycle,
  onDeleteCycle,
  onCreateCycle,
  onCycleUpdated,
  upcomingContent,
  completedContent,
  className,
}: CycleDetailViewProps) {
  const [currentTab, setCurrentTab] = useState<"active" | "upcoming" | "completed">(activeTab);
  const [filterBy, setFilterBy] = useState<"work_items" | "estimates">("work_items");
  const [chartType, setChartType] = useState<"burndown" | "burnup">("burndown");
  const [analytics, setAnalytics] = useState<CycleAnalytics | null>(initialAnalytics || null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);
  const isAdmin = project?.current_user_role === "ADMIN";

  // Sync tab with external prop if provided
  useEffect(() => {
    if (activeTab) {
      setCurrentTab(activeTab);
    }
  }, [activeTab]);

  const handleTabClick = (tab: "active" | "upcoming" | "completed") => {
    setCurrentTab(tab);
    if (onTabChange) {
      onTabChange(tab);
    }
  };

  const reloadAnalytics = React.useCallback(async () => {
    if (!cycle?.id) return;
    try {
      const data = await cycleService.getAnalytics(cycle.id);
      setAnalytics(data);
    } catch {}
  }, [cycle?.id]);

  // Fetch fresh analytics when cycle changes
  useEffect(() => {
    if (initialAnalytics) {
      setAnalytics(initialAnalytics);
      return;
    }

    if (cycle?.id) {
      let isMounted = true;
      setIsLoadingAnalytics(true);
      cycleService
        .getAnalytics(cycle.id)
        .then((data) => {
          if (isMounted) setAnalytics(data);
        })
        .catch(() => {
          // fallback to defaults gracefully
        })
        .finally(() => {
          if (isMounted) setIsLoadingAnalytics(false);
        });

      return () => {
        isMounted = false;
      };
    }
  }, [cycle?.id, initialAnalytics]);

  // Sprint details fallback values matching spec
  const sprintTitle = cycle?.name || "Sprint Activo";
  const progressPercentage = analytics?.progress_percentage ?? 0;
  const startDateStr = cycle?.start_date ? formatDateLabel(cycle.start_date) : "Inicio";
  const endDateStr = cycle?.end_date ? formatDateLabel(cycle.end_date) : "Fin";
  const dateRangeLabel = `${startDateStr} - ${endDateStr}`;

  function formatDateLabel(dateVal: string) {
    try {
      const d = new Date(dateVal);
      if (isNaN(d.getTime())) return dateVal;
      return d.toLocaleDateString("en-US", { month: "short", day: "2-digit" });
    } catch {
      return dateVal;
    }
  }

  return (
    <div className={cn("w-full space-y-6", className)}>
      {/* 1. Cabecera superior (Tabs y acciones) */}
      <div className="flex items-center justify-between border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-8 -mb-px">
          <button
            type="button"
            onClick={() => handleTabClick("active")}
            className={cn(
              "pb-3.5 pt-1 text-sm font-semibold transition-all relative",
              currentTab === "active"
                ? "text-slate-900 dark:text-slate-50 border-b-2 border-slate-950 dark:border-white font-bold"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            Activo
          </button>
          <button
            type="button"
            onClick={() => handleTabClick("upcoming")}
            className={cn(
              "pb-3.5 pt-1 text-sm font-semibold transition-all relative",
              currentTab === "upcoming"
                ? "text-slate-900 dark:text-slate-50 border-b-2 border-slate-950 dark:border-white font-bold"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            Próximo
          </button>
          <button
            type="button"
            onClick={() => handleTabClick("completed")}
            className={cn(
              "pb-3.5 pt-1 text-sm font-semibold transition-all relative",
              currentTab === "completed"
                ? "text-slate-900 dark:text-slate-50 border-b-2 border-slate-950 dark:border-white font-bold"
                : "text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200"
            )}
          >
            Completado
          </button>
        </div>
      </div>

      {/* Content based on Tab */}
      {currentTab === "active" && (
        <>
          {/* 2. Cabecera del Sprint */}
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 py-2">
            {/* Left: Progress Ring + Title + Dates */}
            <div className="flex items-center gap-4">
              {/* Indicador circular de progreso SVG (36%) */}
              <CycleProgressRing progress={progressPercentage} size={46} strokeWidth={4} />

              <div className="space-y-1">
                {/* Título del sprint en negrita */}
                <h2 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-50">
                  {sprintTitle}
                </h2>

                {/* Rango de fechas con icono de calendario */}
                <div className="flex items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                  <Calendar className="size-3.5 shrink-0 text-slate-400" />
                  <span>{dateRangeLabel}</span>
                </div>
              </div>
            </div>

            {/* Right: Info, Notification Bell with red badge, More Options */}
            <div className="flex items-center gap-1.5 self-end sm:self-center">
              {/* Info Popover */}
              <Popover>
                <PopoverTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <Info className="size-4" />
                    <span className="sr-only">Información del ciclo</span>
                  </Button>
                </PopoverTrigger>
                <PopoverContent side="bottom" align="end" className="w-80 p-4 text-xs space-y-3">
                  <div className="space-y-1">
                    <h4 className="font-bold text-sm text-slate-900 dark:text-slate-100">
                      {sprintTitle}
                    </h4>
                    <p className="text-slate-500 dark:text-slate-400">
                      {cycle?.description || "Ciclo activo de desarrollo con seguimiento continuo de trabajo y estimaciones."}
                    </p>
                  </div>
                  <div className="grid grid-cols-2 gap-2 pt-2 border-t border-slate-100 dark:border-slate-800 text-[11px]">
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded">
                      <span className="text-slate-400">Progreso</span>
                      <p className="font-bold text-emerald-600 mt-0.5">{progressPercentage}%</p>
                    </div>
                    <div className="bg-slate-50 dark:bg-slate-800/60 p-2 rounded">
                      <span className="text-slate-400">Retraso actual</span>
                      <p className="font-bold text-red-500 mt-0.5">
                        {analytics?.breakdown?.trailing_count ?? 2} items
                      </p>
                    </div>
                  </div>
                </PopoverContent>
              </Popover>

              {/* Bell with red notification badge */}
              <div className="relative">
                <Button
                  variant="ghost"
                  size="icon"
                  className="size-8 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                >
                  <Bell className="size-4" />
                  <span className="sr-only">Notificaciones</span>
                </Button>
                {/* Red badge */}
                <span className="absolute top-1.5 right-1.5 size-2 rounded-full bg-red-500 ring-2 ring-white dark:ring-slate-950 animate-pulse" />
              </div>

              {/* Menú '...' (MoreHorizontal) */}
              <DropdownMenu>
                <DropdownMenuTrigger asChild>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="size-8 text-slate-500 hover:text-slate-800 dark:text-slate-400 dark:hover:text-slate-200 hover:bg-slate-100 dark:hover:bg-slate-800 rounded-lg"
                  >
                    <MoreHorizontal className="size-4" />
                    <span className="sr-only">Opciones del ciclo</span>
                  </Button>
                </DropdownMenuTrigger>
                <DropdownMenuContent align="end" className="w-52 text-xs">
                  {isAdmin && cycle && (
                    <>
                      {onEditCycle && (
                        <DropdownMenuItem onClick={() => onEditCycle(cycle)}>
                          <Edit2 className="size-3.5 mr-2 text-slate-500" />
                          <span>Editar ciclo</span>
                        </DropdownMenuItem>
                      )}
                      {onEditDates && (
                        <DropdownMenuItem onClick={() => onEditDates(cycle)}>
                          <Calendar className="size-3.5 mr-2 text-indigo-600" />
                          <span>Editar rango de fechas</span>
                        </DropdownMenuItem>
                      )}
                      {onCompleteCycle && (
                        <DropdownMenuItem onClick={() => onCompleteCycle(cycle)}>
                          <CheckCircle2 className="size-3.5 mr-2 text-emerald-600" />
                          <span>Completar ciclo</span>
                        </DropdownMenuItem>
                      )}
                      {onDeleteCycle && (
                        <>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => onDeleteCycle(cycle)}
                            className="text-red-600 focus:text-red-600 focus:bg-red-50 dark:focus:bg-red-950/50 cursor-pointer"
                          >
                            <Trash2 className="size-3.5 mr-2" />
                            <span>Eliminar ciclo</span>
                          </DropdownMenuItem>
                        </>
                      )}
                      <DropdownMenuSeparator />
                    </>
                  )}
                  <DropdownMenuItem
                    onClick={() => {
                      if (typeof window !== "undefined") {
                        navigator.clipboard.writeText(window.location.href);
                        toast.success("Enlace al sprint copiado al portapapeles");
                      }
                    }}
                    className="text-slate-600 dark:text-slate-400 cursor-pointer"
                  >
                    <Share2 className="size-3.5 mr-2" />
                    <span>Copiar enlace al sprint</span>
                  </DropdownMenuItem>
                </DropdownMenuContent>
              </DropdownMenu>
            </div>
          </div>

          {/* 3. Layout principal (Grid de 2 columnas) */}
          <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-2xs overflow-hidden">
            <div className="flex flex-col lg:flex-row min-h-[440px] p-5 lg:p-6 gap-6">
              {/* Columna izquierda (sidebar de desglose: ancho ~280px) */}
              <CycleBreakdownSidebar
                breakdown={analytics?.breakdown}
                filterBy={filterBy}
                className="w-full lg:w-[280px]"
              />

              {/* Columna derecha (gráfico Burn-down / Burn-up interactivo) */}
              <CycleBurndownChart
                timeline={analytics?.timeline}
                todayIndex={analytics?.today_index}
                todayDate={analytics?.today_date}
                filterBy={filterBy}
                onFilterByChange={setFilterBy}
                chartType={chartType}
                onChartTypeChange={setChartType}
                className="flex-1"
              />
            </div>
          </div>

          {/* 4. Sección interactiva de Work Items del Ciclo */}
          {cycle && projectId && (
            <CycleWorkItemsSection
              cycle={cycle}
              projectId={projectId}
              project={project || null}
              states={states}
              onStatsChanged={() => {
                reloadAnalytics();
                if (onCycleUpdated) onCycleUpdated();
              }}
            />
          )}
        </>
      )}

      {currentTab === "upcoming" && (
        <div className="w-full">
          {upcomingContent || (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
              No hay ciclos próximos programados.
            </div>
          )}
        </div>
      )}

      {currentTab === "completed" && (
        <div className="w-full">
          {completedContent || (
            <div className="rounded-xl border border-dashed border-slate-200 dark:border-slate-800 p-12 text-center text-slate-500 dark:text-slate-400">
              No hay ciclos completados aún.
            </div>
          )}
        </div>
      )}
    </div>
  );
}
