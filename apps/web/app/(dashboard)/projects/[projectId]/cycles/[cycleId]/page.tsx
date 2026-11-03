"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { cycleService } from "@/services/plane/cycleService";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import {
  Cycle,
  CycleAnalytics,
  Project,
  State,
  WorkItem,
  CycleClassifiedItem,
} from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { CycleProgressRing } from "@/components/plane/cycles/CycleProgressRing";
import { CycleBreakdownSidebar } from "@/components/plane/cycles/CycleBreakdownSidebar";
import { CycleBurndownChart } from "@/components/plane/cycles/CycleBurndownChart";
import { WorkItemDetailSheet } from "@/components/plane/WorkItemDetailSheet";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import {
  Calendar,
  Layers,
  ArrowLeft,
  TrendingDown,
  TrendingUp,
  AlertTriangle,
  CheckCircle2,
  Clock,
  Plus,
  Trash2,
  Sparkles,
  Search,
  Filter,
  Check,
  Paperclip,
  Activity,
  FileText,
  HelpCircle,
  Loader2,
  MoreHorizontal,
  Edit2,
  Share2,
  Target,
} from "lucide-react";
import { SprintGoalCard } from "@/components/plane/agile/SprintGoalCard";
import { copyToClipboard } from "@/lib/clipboard";

export default function CycleDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params.projectId);
  const cycleId = String(params.cycleId);

  const [project, setProject] = useState<Project | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);
  const [analytics, setAnalytics] = useState<CycleAnalytics | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Chart controls
  const [chartType, setChartType] = useState<"burndown" | "burnup">("burndown");
  const [filterBy, setFilterBy] = useState<"work_items" | "estimates">("work_items");

  // Filter tabs for cycle items: "all" | "stories" | "unresolved" | "added" | "modified" | "completed"
  const [itemCategoryFilter, setItemCategoryFilter] = useState<
    "all" | "stories" | "unresolved" | "added" | "modified" | "completed"
  >("all");
  const [itemSearchQuery, setItemSearchQuery] = useState("");

  // Work item detail modal
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | number | null>(null);

  // Link work items modal
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<WorkItem[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<(string | number)[]>([]);
  const [linkSearchQuery, setLinkSearchQuery] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  useDocumentTitle(`${cycle?.name || "Detalle del Ciclo"} - ${project?.name || "Proyecto"}`);

  const loadData = useCallback(async (silent = false) => {
    if (!silent) setIsLoading(true);
    try {
      const [projData, cycleData, analyticsData, statesData] = await Promise.all([
        projectService.get(projectId),
        cycleService.get(cycleId),
        cycleService.getAnalytics(cycleId),
        projectService.getStates(projectId),
      ]);

      setProject(projData);
      setCycle(cycleData);
      setAnalytics(analyticsData);
      setStates(statesData || []);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al cargar los datos del ciclo");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [projectId, cycleId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const isAdmin = project?.current_user_role === "ADMIN";

  // Cycle work items from analytics or cycle
  const classifiedItems: CycleClassifiedItem[] = useMemo(() => {
    if (analytics?.work_items && analytics.work_items.length > 0) {
      return analytics.work_items;
    }
    const rawItems = (cycle as any)?.work_items || [];
    return rawItems.map((item: any) => ({
      id: item.id,
      sequence_id: item.sequence_id,
      identifier: item.identifier || `#${item.sequence_id}`,
      title: item.title,
      priority: item.priority || "NONE",
      estimate_points: item.estimate_points,
      state: item.state,
      type: item.type,
      assignees: item.assignees || [],
      is_added_mid_cycle: false,
      is_modified: false,
      is_unresolved: item.state?.group !== "COMPLETED" && item.state?.group !== "CANCELLED",
      is_transferred: false,
      deliverables_count: item.deliverables_count || 0,
      approved_deliverables_count: item.approved_deliverables_count || 0,
    }));
  }, [analytics?.work_items, cycle]);

  // Filtered items
  const filteredItems = useMemo(() => {
    return classifiedItems.filter((item) => {
      const q = itemSearchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q);

      if (!matchSearch) return false;

      switch (itemCategoryFilter) {
        case "stories":
          return (
            item.type?.name?.toLowerCase().includes("historia") ||
            item.type?.name?.toLowerCase().includes("story") ||
            item.identifier.startsWith("HU-") ||
            item.identifier.includes("STORY")
          );
        case "unresolved":
          return item.is_unresolved;
        case "added":
          return item.is_added_mid_cycle;
        case "modified":
          return item.is_modified;
        case "completed":
          return item.state?.group === "COMPLETED";
        case "all":
        default:
          return true;
      }
    });
  }, [classifiedItems, itemCategoryFilter, itemSearchQuery]);

  const handleStateChange = async (itemId: string | number, newStateId: string | number) => {
    try {
      await workItemService.update(itemId, { state_id: newStateId });
      toast.success("Estado de la tarea actualizado");
      loadData(true);
    } catch {
      toast.error("Error al actualizar estado");
    }
  };

  const handleRemoveWorkItem = async (itemId: string | number) => {
    if (!confirm("¿Deseas remover esta tarea del ciclo?")) return;
    try {
      await cycleService.removeWorkItem(cycleId, itemId);
      toast.success("Tarea removida del ciclo");
      loadData();
    } catch {
      toast.error("Error al remover la tarea");
    }
  };

  const handleOpenLinkModal = async () => {
    setIsLinkModalOpen(true);
    setIsLoadingAvailable(true);
    try {
      const allItems = await workItemService.list(projectId);
      const currentIds = new Set(classifiedItems.map((i) => String(i.id)));
      const candidates = allItems.filter((item) => !currentIds.has(String(item.id)));
      setAvailableItems(candidates);
      setSelectedItemIds([]);
    } catch {
      toast.error("Error al cargar tareas disponibles");
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleConfirmLink = async () => {
    if (selectedItemIds.length === 0) return;
    setIsLinking(true);
    try {
      await cycleService.addWorkItems(cycleId, selectedItemIds);
      toast.success(`${selectedItemIds.length} tareas vinculadas al ciclo`);
      setIsLinkModalOpen(false);
      loadData();
    } catch {
      toast.error("Error al vincular tareas");
    } finally {
      setIsLinking(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando métricas y detalle del ciclo...</p>
      </div>
    );
  }

  if (!cycle) {
    return (
      <div className="space-y-4">
        <ProjectBreadcrumb
          projectId={projectId}
          projectName={project?.name}
          sectionTitle="Ciclos"
          sectionHref={`/projects/${projectId}/cycles`}
        />
        <div className="p-12 text-center border rounded-xl bg-white space-y-3">
          <p className="text-base font-semibold text-slate-800">Ciclo no encontrado</p>
          <Button onClick={() => router.push(`/projects/${projectId}/cycles`)}>
            <ArrowLeft className="size-4 mr-2" />
            Volver a Ciclos
          </Button>
        </div>
      </div>
    );
  }

  const scopeBreakdown = analytics?.scope_breakdown || {
    initial_planned_count: classifiedItems.filter((i) => !i.is_added_mid_cycle).length,
    added_mid_cycle_count: classifiedItems.filter((i) => i.is_added_mid_cycle).length,
    modified_count: classifiedItems.filter((i) => i.is_modified).length,
    unresolved_count: classifiedItems.filter((i) => i.is_unresolved).length,
    transferred_count: classifiedItems.filter((i) => i.is_transferred).length,
    completed_count: classifiedItems.filter((i) => i.state?.group === "COMPLETED").length,
  };

  const impact = analytics?.impact_analysis;
  const progressPct = analytics?.progress_percentage ?? 0;

  return (
    <div className="flex-1 space-y-6 w-full pb-16">
      {/* 1. Header & Navigation */}
      <div className="flex flex-col gap-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <Link
              href={`/projects/${projectId}/cycles`}
              className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-600 hover:text-slate-900 bg-white border border-slate-200 px-2.5 py-1.5 rounded-lg shadow-2xs transition-colors"
            >
              <ArrowLeft className="size-3.5" />
              <span>Volver a Ciclos</span>
            </Link>
            <ProjectBreadcrumb
              projectId={projectId}
              projectName={project?.name}
              sectionTitle="Ciclos"
              sectionHref={`/projects/${projectId}/cycles`}
              itemTitle={cycle.name}
            />
          </div>

          <div className="flex items-center gap-2">
            <span
              className={cn(
                "px-2.5 py-1 rounded-full text-[11px] font-bold border",
                cycle.status === "CURRENT"
                  ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                  : cycle.status === "COMPLETED"
                  ? "bg-purple-50 text-purple-700 border-purple-200"
                  : "bg-blue-50 text-blue-700 border-blue-200"
              )}
            >
              {cycle.status === "CURRENT"
                ? "Ciclo Activo"
                : cycle.status === "COMPLETED"
                ? "Ciclo Completado"
                : "Ciclo Próximo"}
            </span>

            <Link href={`/projects/${projectId}/cycles/${cycleId}/planning`}>
              <Button
                variant="outline"
                size="sm"
                className="text-xs h-8 gap-1.5 border-indigo-200 text-indigo-700 hover:bg-indigo-50"
              >
                <Target className="size-3.5 text-indigo-600" />
                <span>Planificar Sprint</span>
              </Button>
            </Link>

            <Button
              variant="outline"
              size="sm"
              onClick={async () => {
                if (typeof window !== "undefined") {
                  await copyToClipboard(window.location.href);
                  toast.success("Enlace al ciclo copiado al portapapeles");
                }
              }}
              className="text-xs h-8 gap-1.5"
            >
              <Share2 className="size-3.5 text-slate-500" />
              <span>Compartir</span>
            </Button>
          </div>
        </div>

        {/* Sprint Goal Card */}
        <SprintGoalCard
          sprintGoal={cycle.sprint_goal}
          cycleId={cycle.id}
          canEdit={isAdmin}
          onUpdateGoal={async (newGoal) => {
            await cycleService.update(cycle.id, { sprint_goal: newGoal });
            setCycle({ ...cycle, sprint_goal: newGoal });
          }}
        />

        {/* Main Cycle Banner */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 p-5 rounded-2xl bg-white border border-slate-200 shadow-xs">
          <div className="flex items-center gap-4">
            <CycleProgressRing progress={progressPct} size={56} strokeWidth={5} />
            <div className="space-y-1">
              <h1 className="text-2xl font-bold tracking-tight text-slate-900">
                {cycle.name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-slate-500 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-400" />
                  {cycle.start_date || "Inicio sin definir"} — {cycle.end_date || "Fin sin definir"}
                </span>
                {cycle.description && (
                  <span className="text-slate-400 truncate max-w-md hidden sm:inline">
                    • {cycle.description}
                  </span>
                )}
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {isAdmin && (
              <Button
                onClick={handleOpenLinkModal}
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 gap-1.5"
              >
                <Plus className="size-3.5" />
                Vincular Tareas / Historias
              </Button>
            )}
          </div>
        </div>
      </div>

      {/* 2. Scope & Dynamics Diagnosis Cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3.5">
        {/* Card 1: Alcance Inicial */}
        <div className="p-4 rounded-xl bg-white border border-slate-200 shadow-2xs space-y-1">
          <span className="text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
            Alcance Inicial
          </span>
          <p className="text-2xl font-bold text-slate-800">
            {scopeBreakdown.initial_planned_count}
          </p>
          <p className="text-[11px] text-slate-400">Planificadas al inicio</p>
        </div>

        {/* Card 2: Agregadas en el Ciclo (Scope Creep) */}
        <div className="p-4 rounded-xl bg-white border border-indigo-200 shadow-2xs space-y-1 bg-indigo-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-indigo-700 uppercase tracking-wider">
              Agregadas (+Creep)
            </span>
            <span className="text-[10px] font-bold text-indigo-700 bg-indigo-100 px-1.5 py-0.2 rounded-full">
              +{scopeBreakdown.added_mid_cycle_count}
            </span>
          </div>
          <p className="text-2xl font-bold text-indigo-600">
            {scopeBreakdown.added_mid_cycle_count}
          </p>
          <p className="text-[11px] text-indigo-600/80">
            {scopeBreakdown.added_points ? `+${scopeBreakdown.added_points} pts tras inicio` : "Sumadas durante el sprint"}
          </p>
        </div>

        {/* Card 3: Cambiadas / Modificadas */}
        <div className="p-4 rounded-xl bg-white border border-amber-200 shadow-2xs space-y-1 bg-amber-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-amber-700 uppercase tracking-wider">
              Modificadas
            </span>
            <Activity className="size-3.5 text-amber-500" />
          </div>
          <p className="text-2xl font-bold text-amber-600">
            {scopeBreakdown.modified_count}
          </p>
          <p className="text-[11px] text-amber-600/80">Cambios de alcance/estimación</p>
        </div>

        {/* Card 4: Sin Resolver / Transferidas */}
        <div className="p-4 rounded-xl bg-white border border-rose-200 shadow-2xs space-y-1 bg-rose-50/20">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-rose-700 uppercase tracking-wider">
              Sin Resolver
            </span>
            <AlertTriangle className="size-3.5 text-rose-500" />
          </div>
          <p className="text-2xl font-bold text-rose-600">
            {scopeBreakdown.unresolved_count}
          </p>
          <p className="text-[11px] text-rose-600/80">
            {scopeBreakdown.transferred_count > 0
              ? `${scopeBreakdown.transferred_count} transferidas al backlog`
              : "Pendientes al cierre"}
          </p>
        </div>

        {/* Card 5: Completadas */}
        <div className="p-4 rounded-xl bg-white border border-emerald-200 shadow-2xs space-y-1 bg-emerald-50/20 col-span-2 sm:col-span-1">
          <div className="flex items-center justify-between">
            <span className="text-[11px] font-semibold text-emerald-700 uppercase tracking-wider">
              Completadas
            </span>
            <CheckCircle2 className="size-3.5 text-emerald-500" />
          </div>
          <p className="text-2xl font-bold text-emerald-600">
            {scopeBreakdown.completed_count}
          </p>
          <p className="text-[11px] text-emerald-600/80">Finalizadas con éxito</p>
        </div>
      </div>

      {/* 3. Panel de Impacto en Gráficas (Scope, Avance Ideal, Burn-down, Burn-up) */}
      <Card className="border-slate-200 bg-white shadow-2xs overflow-hidden">
        <CardHeader className="pb-3 border-b border-slate-100 bg-slate-50/50">
          <div className="flex items-center gap-2">
            <Sparkles className="size-4 text-indigo-600" />
            <CardTitle className="text-sm font-bold text-slate-900">
              Impacto de Acciones del Ciclo en las Gráficas
            </CardTitle>
          </div>
          <CardDescription className="text-xs">
            Comprende cómo las adiciones de alcance, modificaciones y tareas sin resolver influyen directamente en la trayectoria de cada gráfica.
          </CardDescription>
        </CardHeader>
        <CardContent className="p-4 sm:p-5">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4">
            {/* Impacto 1: Scope */}
            <div className="p-3.5 rounded-xl border border-slate-200 bg-slate-50/40 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-slate-800">
                <span className="size-2.5 rounded-full bg-slate-900" />
                <span>Impacto en Scope</span>
              </div>
              <p className="text-xs text-slate-600 leading-relaxed">
                {impact?.scope_impact ||
                  "Las tareas agregadas después del inicio elevan la línea de Scope escalonadamente, reflejando el alcance total vigente en cada fecha."}
              </p>
            </div>

            {/* Impacto 2: Avance Ideal */}
            <div className="p-3.5 rounded-xl border border-blue-200 bg-blue-50/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-blue-900">
                <span className="size-2.5 rounded-full bg-blue-500" />
                <span>Impacto en Avance Ideal</span>
              </div>
              <p className="text-xs text-blue-950/80 leading-relaxed">
                {impact?.ideal_impact ||
                  "La línea discontinua de Avance Ideal traza la velocidad requerida. Si el alcance aumenta, la pendiente se torna más empinada para cumplir la entrega."}
              </p>
            </div>

            {/* Impacto 3: Burn-down */}
            <div className="p-3.5 rounded-xl border border-emerald-200 bg-emerald-50/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-emerald-900">
                <TrendingDown className="size-3.5 text-emerald-600" />
                <span>Impacto en Burn-down</span>
              </div>
              <p className="text-xs text-emerald-950/80 leading-relaxed">
                {impact?.burndown_impact ||
                  "Mide el trabajo pendiente. Las tareas sumadas elevan los pendientes, y las tareas sin resolver impiden que la curva descienda a cero al finalizar."}
              </p>
            </div>

            {/* Impacto 4: Burn-up */}
            <div className="p-3.5 rounded-xl border border-purple-200 bg-purple-50/30 space-y-1.5">
              <div className="flex items-center gap-2 text-xs font-bold text-purple-900">
                <TrendingUp className="size-3.5 text-purple-600" />
                <span>Impacto en Burn-up</span>
              </div>
              <p className="text-xs text-purple-950/80 leading-relaxed">
                {impact?.burnup_impact ||
                  "Contrasta el trabajo completado frente al techo de alcance. Al sumarse tareas, la meta se distancia aumentando la brecha que el equipo debe recorrer."}
              </p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* 4. Interactive Burn-down / Burn-up Chart + Breakdown Sidebar */}
      <div className="rounded-2xl border border-slate-200 bg-white shadow-2xs overflow-hidden">
        <div className="flex flex-col lg:flex-row min-h-[440px] p-5 lg:p-6 gap-6">
          <CycleBreakdownSidebar
            breakdown={analytics?.breakdown}
            filterBy={filterBy}
            className="w-full lg:w-[280px]"
          />

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

      {/* 5. Complete Stories & Work Items Section with Dynamic Cycle Badges & Evidences */}
      <div className="space-y-4">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h3 className="text-lg font-bold text-slate-900">
              Historias y Tareas del Ciclo ({classifiedItems.length})
            </h3>
            <p className="text-xs text-slate-500">
              Supervisa las historias de usuario, evidencias registradas y estado de resolución de cada ítem.
            </p>
          </div>

          {/* Quick Category Filters */}
          <div className="flex items-center gap-1.5 flex-wrap bg-slate-100 p-1 rounded-lg border border-slate-200">
            <button
              type="button"
              onClick={() => setItemCategoryFilter("all")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                itemCategoryFilter === "all"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Todas ({classifiedItems.length})
            </button>
            <button
              type="button"
              onClick={() => setItemCategoryFilter("stories")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                itemCategoryFilter === "stories"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Historias de Usuario
            </button>
            <button
              type="button"
              onClick={() => setItemCategoryFilter("unresolved")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                itemCategoryFilter === "unresolved"
                  ? "bg-white text-rose-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Sin Resolver ({scopeBreakdown.unresolved_count})
            </button>
            <button
              type="button"
              onClick={() => setItemCategoryFilter("added")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                itemCategoryFilter === "added"
                  ? "bg-white text-indigo-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Agregadas (+{scopeBreakdown.added_mid_cycle_count})
            </button>
            <button
              type="button"
              onClick={() => setItemCategoryFilter("modified")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                itemCategoryFilter === "modified"
                  ? "bg-white text-amber-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Modificadas ({scopeBreakdown.modified_count})
            </button>
            <button
              type="button"
              onClick={() => setItemCategoryFilter("completed")}
              className={cn(
                "px-2.5 py-1 rounded text-xs font-semibold transition-all",
                itemCategoryFilter === "completed"
                  ? "bg-white text-emerald-700 shadow-2xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              Completadas ({scopeBreakdown.completed_count})
            </button>
          </div>
        </div>

        {/* Search bar inside cycle */}
        <div className="relative">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            placeholder="Buscar tarea o historia por título o ID..."
            value={itemSearchQuery}
            onChange={(e) => setItemSearchQuery(e.target.value)}
            className="pl-9 h-9 text-xs bg-white border-slate-200"
          />
        </div>

        {/* List of Items */}
        <div className="rounded-xl border border-slate-200 bg-white overflow-hidden shadow-2xs divide-y divide-slate-100">
          {filteredItems.length === 0 ? (
            <div className="p-12 text-center text-slate-400 text-xs">
              No hay tareas que coincidan con la categoría o búsqueda seleccionada.
            </div>
          ) : (
            filteredItems.map((item) => (
              <div
                key={item.id}
                onClick={() => setSelectedWorkItemId(item.id)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3.5 sm:px-4 gap-3 hover:bg-slate-50/80 cursor-pointer transition-colors"
              >
                {/* Left: Identifier, Type, Title, Flow Badges & Evidences */}
                <div className="flex items-center gap-2.5 min-w-0 flex-1 flex-wrap">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                    {item.identifier}
                  </span>

                  {item.type && (
                    <span
                      className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0"
                      style={{
                        backgroundColor: `${item.type.color}15`,
                        color: item.type.color,
                      }}
                    >
                      {item.type.name}
                    </span>
                  )}

                  <span className="text-xs sm:text-sm font-medium text-slate-900 truncate group-hover:text-indigo-600 transition-colors">
                    {item.title}
                  </span>

                  {/* Flow Badges */}
                  {item.is_added_mid_cycle && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-50 text-indigo-700 border border-indigo-200 shrink-0">
                      + Agregada en ciclo
                    </span>
                  )}

                  {item.is_modified && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-amber-50 text-amber-700 border border-amber-200 shrink-0">
                      ~ Modificada
                    </span>
                  )}

                  {item.is_unresolved && item.state?.group !== "COMPLETED" && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-rose-50 text-rose-700 border border-rose-200 shrink-0">
                      ! Sin resolver
                    </span>
                  )}

                  {item.is_transferred && (
                    <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200 shrink-0">
                      → Transferida al backlog
                    </span>
                  )}

                  {/* Evidencias Badge */}
                  {((item.deliverables_count && item.deliverables_count > 0) || (item.deliverables && item.deliverables.length > 0)) && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0",
                        item.approved_deliverables_count && item.approved_deliverables_count > 0
                          ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                          : "bg-indigo-50 text-indigo-700 border-indigo-200"
                      )}
                      title={`${item.deliverables_count || item.deliverables?.length} evidencias adjuntas`}
                    >
                      <Paperclip className="size-3" />
                      <span>
                        {item.deliverables_count || item.deliverables?.length}{" "}
                        {Number(item.deliverables_count || item.deliverables?.length) === 1 ? "evidencia" : "evidencias"}
                      </span>
                    </span>
                  )}
                </div>

                {/* Right: State Selector, Priority, Estimate points & Remove */}
                <div
                  className="flex items-center flex-wrap gap-2.5 shrink-0 self-end sm:self-center"
                  onClick={(e) => e.stopPropagation()}
                >
                  <Select
                    value={item.state ? String(item.state.id) : ""}
                    disabled={!isAdmin}
                    onValueChange={(val) => handleStateChange(item.id, val)}
                  >
                    <SelectTrigger className="h-7 text-xs px-2.5 py-0 w-36 bg-white border-slate-200 shadow-2xs">
                      <div className="flex items-center gap-1.5 truncate">
                        <span
                          className="size-2 rounded-full shrink-0"
                          style={{ backgroundColor: item.state?.color || "#94a3b8" }}
                        />
                        <span className="truncate">{item.state?.name || "Sin estado"}</span>
                      </div>
                    </SelectTrigger>
                    <SelectContent align="end" className="text-xs">
                      {states.map((st) => (
                        <SelectItem key={st.id} value={String(st.id)}>
                          <div className="flex items-center gap-2">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: st.color }}
                            />
                            <span>{st.name}</span>
                          </div>
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>

                  <span className="text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0 bg-slate-50 text-slate-700 border-slate-200">
                    {item.priority}
                  </span>

                  {item.estimate_points !== null && item.estimate_points !== undefined && (
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 text-slate-700 shrink-0">
                      {item.estimate_points} pts
                    </span>
                  )}

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleRemoveWorkItem(item.id)}
                      className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-md"
                      title="Remover tarea del ciclo"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {/* Link Work Items Modal */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base">
              <Layers className="size-5 text-indigo-600" />
              Vincular Tareas / Historias a {cycle.name}
            </DialogTitle>
            <DialogDescription className="text-xs">
              Selecciona las tareas del proyecto que formarán parte de este ciclo.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                placeholder="Buscar por título o ID..."
                value={linkSearchQuery}
                onChange={(e) => setLinkSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>
          </div>

          <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[340px] border border-slate-200 rounded-lg divide-y divide-slate-100">
            {isLoadingAvailable ? (
              <div className="py-12 flex justify-center items-center text-slate-400">
                <Loader2 className="size-6 animate-spin text-indigo-600" />
              </div>
            ) : availableItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                No hay más tareas disponibles en este proyecto para vincular.
              </div>
            ) : (
              availableItems
                .filter(
                  (it) =>
                    !linkSearchQuery.trim() ||
                    it.title.toLowerCase().includes(linkSearchQuery.toLowerCase()) ||
                    it.identifier.toLowerCase().includes(linkSearchQuery.toLowerCase())
                )
                .map((item) => {
                  const isSelected = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() =>
                        setSelectedItemIds((prev) =>
                          prev.includes(item.id)
                            ? prev.filter((id) => id !== item.id)
                            : [...prev, item.id]
                        )
                      }
                      className={cn(
                        "flex items-center justify-between p-3 gap-3 cursor-pointer text-xs transition-colors",
                        isSelected ? "bg-indigo-50/70" : "hover:bg-slate-50"
                      )}
                    >
                      <div className="flex items-center gap-2.5 min-w-0 flex-1">
                        <div
                          className={cn(
                            "size-4 rounded border flex items-center justify-center transition-colors shrink-0",
                            isSelected
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300 bg-white"
                          )}
                        >
                          {isSelected && <Check className="size-3" />}
                        </div>
                        <span className="font-mono text-[11px] font-semibold text-slate-500 shrink-0">
                          {item.identifier}
                        </span>
                        <span className="font-medium text-slate-900 truncate">
                          {item.title}
                        </span>
                      </div>
                      <div className="flex items-center gap-2 shrink-0">
                        {item.state && (
                          <div className="flex items-center gap-1.5 text-[11px] text-slate-600">
                            <span
                              className="size-2 rounded-full shrink-0"
                              style={{ backgroundColor: item.state.color }}
                            />
                            <span>{item.state.name}</span>
                          </div>
                        )}
                      </div>
                    </div>
                  );
                })
            )}
          </div>

          <DialogFooter className="pt-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setIsLinkModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmLink}
              disabled={isLinking || selectedItemIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs"
            >
              {isLinking ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Vincular {selectedItemIds.length > 0 ? `(${selectedItemIds.length})` : ""}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Work Item Detail Sheet */}
      {selectedWorkItemId && (
        <WorkItemDetailSheet
          workItemId={selectedWorkItemId}
          project={project}
          states={states}
          open={!!selectedWorkItemId}
          onOpenChange={(open) => {
            if (!open) setSelectedWorkItemId(null);
          }}
          onUpdated={(updatedItem?: WorkItem) => {
            if (updatedItem) {
              setCycle((prev: any) => {
                if (!prev) return prev;
                return {
                  ...prev,
                  work_items: prev.work_items?.map((w: any) =>
                    String(w.id) === String(updatedItem.id) ? { ...w, ...updatedItem } : w
                  ),
                };
              });
            }
            loadData(true);
          }}
        />
      )}
    </div>
  );
}
