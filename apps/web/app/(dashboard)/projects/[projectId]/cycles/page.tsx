"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { cycleService } from "@/services/plane/cycleService";
import { projectService } from "@/services/plane/projectService";
import { Cycle, CycleAnalytics, Project, State } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CycleDetailView } from "@/components/plane/cycles/CycleDetailView";
import {
  Repeat,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  AlertTriangle,
  Play,
  Loader2,
  BarChart3,
  Undo2,
  MoreHorizontal,
  Edit2,
  Trash2,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function CyclesPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"current" | "upcoming" | "completed">("current");

  useDocumentTitle(`Ciclos (Sprints) - ${project?.name || "Proyecto"}`);

  // Create / Edit Cycle Modal
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [editingCycleId, setEditingCycleId] = useState<string | number | null>(null);
  const [cycleName, setCycleName] = useState("");
  const [cycleDesc, setCycleDesc] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Edit Date Range Modal
  const [openEditDatesModal, setOpenEditDatesModal] = useState(false);
  const [cycleToEditDates, setCycleToEditDates] = useState<Cycle | null>(null);
  const [datesStartDate, setDatesStartDate] = useState("");
  const [datesEndDate, setDatesEndDate] = useState("");
  const [isSavingDates, setIsSavingDates] = useState(false);

  // Complete Cycle Modal
  const [openCompleteModal, setOpenCompleteModal] = useState(false);
  const [cycleToComplete, setCycleToComplete] = useState<Cycle | null>(null);
  const [incompleteItemsCount, setIncompleteItemsCount] = useState<number>(0);
  const [nextCycleCandidate, setNextCycleCandidate] = useState<Cycle | null>(null);
  const [transferTarget, setTransferTarget] = useState<"BACKLOG" | "CYCLE">("BACKLOG");
  const [targetCycleId, setTargetCycleId] = useState<string>("");
  const [isLoadingCheck, setIsLoadingCheck] = useState(false);
  const [isCompleting, setIsCompleting] = useState(false);

  // Delete Cycle Modal
  const [openDeleteModal, setOpenDeleteModal] = useState(false);
  const [cycleToDelete, setCycleToDelete] = useState<Cycle | null>(null);
  const [isDeleting, setIsDeleting] = useState(false);

  // Analytics Modal
  const [openAnalyticsModal, setOpenAnalyticsModal] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState<CycleAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const loadCycles = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projData, cyclesData, statesData] = await Promise.all([
        projectService.get(projectId),
        cycleService.list(projectId),
        projectService.getStates(projectId),
      ]);
      setProject(projData);
      setCycles(cyclesData);
      setStates(statesData);
    } catch {
      toast.error("Error al cargar los ciclos");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadCycles();
  }, [loadCycles]);

  const currentCycles = cycles.filter((c) => c.status === "CURRENT");
  const upcomingCycles = cycles.filter((c) => c.status === "UPCOMING" || c.status === "DRAFT");
  const completedCycles = cycles.filter((c) => c.status === "COMPLETED");

  const handleCreateOrUpdateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleName.trim()) return;

    setIsSubmitting(true);
    try {
      if (editingCycleId) {
        await cycleService.update(editingCycleId, {
          name: cycleName.trim(),
          description: cycleDesc.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
        });
        toast.success("Ciclo actualizado exitosamente");
      } else {
        await cycleService.create(projectId, {
          name: cycleName.trim(),
          description: cycleDesc.trim() || undefined,
          start_date: startDate || undefined,
          end_date: endDate || undefined,
          status: currentCycles.length === 0 ? "CURRENT" : "UPCOMING",
        });
        toast.success("Ciclo creado exitosamente");
      }
      setEditingCycleId(null);
      setCycleName("");
      setCycleDesc("");
      setStartDate("");
      setEndDate("");
      setOpenCreateModal(false);
      loadCycles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al procesar el ciclo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleStartCycle = async (cycle: Cycle) => {
    try {
      await cycleService.update(cycle.id, { status: "CURRENT" });
      toast.success(`Ciclo "${cycle.name}" iniciado`);
      loadCycles();
    } catch {
      toast.error("No se pudo iniciar el ciclo");
    }
  };

  const handleOpenEditDates = (cycle: Cycle) => {
    setCycleToEditDates(cycle);
    setDatesStartDate(cycle.start_date || "");
    setDatesEndDate(cycle.end_date || "");
    setOpenEditDatesModal(true);
  };

  const handleSaveCycleDates = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleToEditDates) return;

    setIsSavingDates(true);
    try {
      await cycleService.update(cycleToEditDates.id, {
        start_date: datesStartDate || undefined,
        end_date: datesEndDate || undefined,
      });
      toast.success(`Rango de fechas de "${cycleToEditDates.name}" actualizado`);
      setOpenEditDatesModal(false);
      loadCycles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al actualizar las fechas");
    } finally {
      setIsSavingDates(false);
    }
  };

  const handleOpenCompleteModal = async (cycle: Cycle) => {
    setCycleToComplete(cycle);
    setIsLoadingCheck(true);
    setOpenCompleteModal(true);

    // Encontrar candidato al siguiente ciclo
    const next = upcomingCycles.find((c) => String(c.id) !== String(cycle.id)) || null;
    setNextCycleCandidate(next);
    if (next) {
      setTransferTarget("CYCLE");
      setTargetCycleId(String(next.id));
    } else {
      setTransferTarget("BACKLOG");
      setTargetCycleId("");
    }

    try {
      const detailed = await cycleService.get(cycle.id);
      const items = detailed.work_items || [];
      const incomplete = items.filter(
        (item) => item.state?.group !== "COMPLETED" && item.state?.group !== "CANCELLED"
      );
      setIncompleteItemsCount(incomplete.length);
    } catch {
      setIncompleteItemsCount(0);
    } finally {
      setIsLoadingCheck(false);
    }
  };

  const handleCompleteCycle = async () => {
    if (!cycleToComplete) return;
    setIsCompleting(true);
    try {
      await cycleService.complete(cycleToComplete.id, {
        transfer_target: transferTarget,
        target_cycle_id: transferTarget === "CYCLE" && targetCycleId ? targetCycleId : undefined,
      });
      if (incompleteItemsCount > 0) {
        if (transferTarget === "CYCLE" && nextCycleCandidate) {
          toast.success(
            `Ciclo "${cycleToComplete.name}" completado. ${incompleteItemsCount} tareas pendientes trasladadas a "${nextCycleCandidate.name}".`
          );
        } else {
          toast.success(
            `Ciclo "${cycleToComplete.name}" completado. ${incompleteItemsCount} tareas pendientes desvinculadas y regresadas al backlog.`
          );
        }
      } else {
        toast.success(`Ciclo "${cycleToComplete.name}" completado exitosamente.`);
      }
      setOpenCompleteModal(false);
      loadCycles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al finalizar el ciclo");
    } finally {
      setIsCompleting(false);
    }
  };

  const handleOpenDeleteModal = (cycle: Cycle) => {
    setCycleToDelete(cycle);
    setOpenDeleteModal(true);
  };

  const handleDeleteCycle = async () => {
    if (!cycleToDelete) return;
    setIsDeleting(true);
    try {
      await cycleService.delete(cycleToDelete.id);
      toast.success(`Ciclo "${cycleToDelete.name}" y sus work items asociados fueron eliminados.`);
      setOpenDeleteModal(false);
      loadCycles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al eliminar el ciclo");
    } finally {
      setIsDeleting(false);
    }
  };

  const handleOpenAnalytics = async (cycle: Cycle) => {
    setIsLoadingAnalytics(true);
    setOpenAnalyticsModal(true);
    try {
      const data = await cycleService.getAnalytics(cycle.id);
      setSelectedAnalytics(data);
    } catch {
      toast.error("Error al cargar analíticas");
    } finally {
      setIsLoadingAnalytics(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando ciclos...</p>
      </div>
    );
  }

  const isAdmin = project?.current_user_role === "ADMIN";

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <ProjectBreadcrumb
            projectId={projectId}
            projectName={project?.name || "Proyecto"}
            sectionTitle="Ciclos de Trabajo (Sprints)"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Repeat className="size-6 text-indigo-600" />
            Ciclos de Trabajo (Sprints)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Planifica iteraciones temporales, da seguimiento al burn-down y gestiona traspasos de trabajo.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setOpenCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
          >
            <Plus className="mr-2 size-4" />
            Nuevo Ciclo
          </Button>
        )}
      </div>

      {cycles.length === 0 ? (
        /* Empty state para crear el primer ciclo */
        <div className="rounded-2xl border border-dashed border-slate-300 dark:border-slate-800 bg-white/60 dark:bg-slate-900/60 p-8 sm:p-12 text-center max-w-2xl mx-auto space-y-6 shadow-xs">
          <div className="mx-auto size-20 rounded-3xl bg-indigo-50 dark:bg-indigo-950/60 border border-indigo-100 dark:border-indigo-900/50 flex items-center justify-center text-indigo-600 dark:text-indigo-400 shadow-xs">
            <Repeat className="size-10" />
          </div>

          <div className="space-y-2 max-w-md mx-auto">
            <h3 className="text-xl font-bold tracking-tight text-slate-900 dark:text-slate-100">
              Comienza con tu primer ciclo de trabajo
            </h3>
            <p className="text-sm text-slate-500 dark:text-slate-400 leading-relaxed">
              Los ciclos (o sprints) te permiten agrupar tareas por iteraciones temporales fijas (ej. 1 o 2 semanas), dar seguimiento a la velocidad de entrega y visualizar gráficos de burndown en tiempo real.
            </p>
          </div>

          {/* Value props */}
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 text-left max-w-lg mx-auto pt-1">
            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Clock className="size-3.5 text-indigo-500" />
                <span>Iteraciones</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Fechas de inicio y fin claras para focalizar el esfuerzo.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <TrendingUp className="size-3.5 text-emerald-500" />
                <span>Burndown</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Gráficos diarios para medir la velocidad de entrega.
              </p>
            </div>

            <div className="p-3.5 rounded-xl border border-slate-200/80 dark:border-slate-800 bg-slate-50/60 dark:bg-slate-950/50 space-y-1">
              <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-800 dark:text-slate-200">
                <Undo2 className="size-3.5 text-amber-500" />
                <span>Traspaso</span>
              </div>
              <p className="text-[11px] text-slate-500 dark:text-slate-400">
                Traspaso automático de pendientes al siguiente ciclo.
              </p>
            </div>
          </div>

          <div className="pt-2">
            {isAdmin ? (
              <Button
                onClick={() => {
                  setEditingCycleId(null);
                  setCycleName("");
                  setCycleDesc("");
                  setStartDate("");
                  setEndDate("");
                  setOpenCreateModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white font-medium px-6 py-2.5 shadow-md shadow-indigo-600/20 cursor-pointer"
              >
                <Plus className="mr-2 size-4" />
                Crear primer ciclo
              </Button>
            ) : (
              <p className="text-xs text-slate-400 italic">
                Solicita a un administrador del proyecto la creación del primer ciclo.
              </p>
            )}
          </div>
        </div>
      ) : (
        /* Cycle Detail View (Activo / Próximo / Completado) */
        <CycleDetailView
        cycle={currentCycles[0] || null}
        projectId={projectId}
        project={project}
        states={states}
        onCycleUpdated={loadCycles}
        activeTab={tab === "current" ? "active" : tab}
        onTabChange={(newTab) => setTab(newTab === "active" ? "current" : newTab)}
        onCompleteCycle={(c) => handleOpenCompleteModal(c)}
        onEditDates={(c) => handleOpenEditDates(c)}
        onDeleteCycle={(c) => handleOpenDeleteModal(c)}
        onEditCycle={(c) => {
          setEditingCycleId(c.id);
          setCycleName(c.name);
          setCycleDesc(c.description || "");
          setStartDate(c.start_date || "");
          setEndDate(c.end_date || "");
          setOpenCreateModal(true);
        }}
        upcomingContent={
          <div className="space-y-4">
            {upcomingCycles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-500">
                <Repeat className="size-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-800 dark:text-slate-200">No hay ciclos planificados próximos</p>
                <p className="text-xs text-slate-500 mt-1">Crea un nuevo ciclo para la siguiente iteración.</p>
                {isAdmin && (
                  <Button
                    onClick={() => {
                      setEditingCycleId(null);
                      setCycleName("");
                      setCycleDesc("");
                      setStartDate("");
                      setEndDate("");
                      setOpenCreateModal(true);
                    }}
                    variant="outline"
                    size="sm"
                    className="mt-4"
                  >
                    <Plus className="size-3.5 mr-1.5" />
                    Crear Próximo Ciclo
                  </Button>
                )}
              </div>
            ) : (
              upcomingCycles.map((cycle) => (
                <Card key={cycle.id} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">{cycle.name}</CardTitle>
                      <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                        <Calendar className="size-3.5" />
                        <span>{cycle.start_date || "Fecha por definir"} — {cycle.end_date || "Fecha por definir"}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      {isAdmin && (
                        <>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleStartCycle(cycle)}
                            className="border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50"
                          >
                            <Play className="size-3.5 mr-1.5" />
                            Iniciar Ciclo
                          </Button>

                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="size-8 text-slate-500 hover:text-slate-800"
                              >
                                <MoreHorizontal className="size-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end" className="w-48 text-xs">
                              <DropdownMenuItem
                                onClick={() => {
                                  setEditingCycleId(cycle.id);
                                  setCycleName(cycle.name);
                                  setCycleDesc(cycle.description || "");
                                  setStartDate(cycle.start_date || "");
                                  setEndDate(cycle.end_date || "");
                                  setOpenCreateModal(true);
                                }}
                              >
                                <Edit2 className="size-3.5 mr-2 text-slate-500" />
                                <span>Editar ciclo</span>
                              </DropdownMenuItem>
                              <DropdownMenuItem onClick={() => handleOpenEditDates(cycle)}>
                                <Calendar className="size-3.5 mr-2 text-indigo-600" />
                                <span>Editar rango de fechas</span>
                              </DropdownMenuItem>
                              <DropdownMenuSeparator />
                              <DropdownMenuItem
                                onClick={() => handleOpenDeleteModal(cycle)}
                                className="text-red-600 focus:text-red-600 focus:bg-red-50"
                              >
                                <Trash2 className="size-3.5 mr-2" />
                                <span>Eliminar ciclo</span>
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        }
        completedContent={
          <div className="space-y-4">
            {completedCycles.length === 0 ? (
              <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900 p-12 text-center text-slate-500">
                <CheckCircle2 className="size-8 text-slate-400 mx-auto mb-2" />
                <p className="font-medium text-slate-800 dark:text-slate-200">No hay ciclos completados aún</p>
                <p className="text-xs text-slate-500 mt-1">Los ciclos finalizados y sus métricas históricas aparecerán aquí.</p>
              </div>
            ) : (
              completedCycles.map((cycle) => (
                <Card key={cycle.id} className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold text-slate-900 dark:text-slate-100">{cycle.name}</CardTitle>
                        <span className="bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-300 text-xs px-2 py-0.5 rounded-full font-medium">
                          Completado
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {cycle.start_date} — {cycle.end_date}
                      </p>
                    </div>

                    <div className="flex items-center gap-2">
                      <Button
                        size="sm"
                        variant="outline"
                        onClick={() => handleOpenAnalytics(cycle)}
                        className="text-slate-600 dark:text-slate-400 hover:text-indigo-600 dark:hover:text-indigo-400"
                      >
                        <BarChart3 className="size-4 mr-1.5" />
                        Ver Estadísticas
                      </Button>

                      {isAdmin && (
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button
                              variant="ghost"
                              size="icon"
                              className="size-8 text-slate-500 hover:text-slate-800"
                            >
                              <MoreHorizontal className="size-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end" className="w-48 text-xs">
                            <DropdownMenuItem onClick={() => handleOpenEditDates(cycle)}>
                              <Calendar className="size-3.5 mr-2 text-indigo-600" />
                              <span>Editar rango de fechas</span>
                            </DropdownMenuItem>
                            <DropdownMenuSeparator />
                            <DropdownMenuItem
                              onClick={() => handleOpenDeleteModal(cycle)}
                              className="text-red-600 focus:text-red-600 focus:bg-red-50"
                            >
                              <Trash2 className="size-3.5 mr-2" />
                              <span>Eliminar ciclo</span>
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      )}
                    </div>
                  </CardHeader>
                </Card>
              ))
            )}
          </div>
        }
      />
    )}

      {/* Modal Crear / Editar Ciclo */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="size-5 text-indigo-600" />
              {editingCycleId ? "Editar Ciclo" : "Nuevo Ciclo (Sprint)"}
            </DialogTitle>
            <DialogDescription>
              {editingCycleId
                ? "Modifica el nombre, descripción y fechas del ciclo."
                : "Define el periodo de tiempo y los objetivos para este ciclo."}
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateOrUpdateCycle} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="cycle-name">Nombre del Ciclo *</Label>
              <Input
                id="cycle-name"
                placeholder="Ej. Sprint 1 - MVP"
                value={cycleName}
                onChange={(e) => setCycleName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="c-start">Fecha de Inicio</Label>
                <Input
                  id="c-start"
                  type="date"
                  value={startDate}
                  onChange={(e) => setStartDate(e.target.value)}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="c-end">Fecha de Fin</Label>
                <Input
                  id="c-end"
                  type="date"
                  value={endDate}
                  onChange={(e) => setEndDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="cycle-desc">Descripción (Opcional)</Label>
              <Textarea
                id="cycle-desc"
                placeholder="Objetivos clave de la iteración..."
                value={cycleDesc}
                onChange={(e) => setCycleDesc(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => {
                  setOpenCreateModal(false);
                  setEditingCycleId(null);
                }}
              >
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                {editingCycleId ? "Guardar Cambios" : "Crear Ciclo"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Editar Rango de Fechas */}
      <Dialog open={openEditDatesModal} onOpenChange={setOpenEditDatesModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Calendar className="size-5 text-indigo-600" />
              Editar Rango de Fechas
            </DialogTitle>
            <DialogDescription>
              Ajusta las fechas de inicio y fin para el ciclo &quot;{cycleToEditDates?.name}&quot;.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCycleDates} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="edit-dates-start">Fecha de Inicio</Label>
              <Input
                id="edit-dates-start"
                type="date"
                value={datesStartDate}
                onChange={(e) => setDatesStartDate(e.target.value)}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="edit-dates-end">Fecha de Fin</Label>
              <Input
                id="edit-dates-end"
                type="date"
                value={datesEndDate}
                onChange={(e) => setDatesEndDate(e.target.value)}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                onClick={() => setOpenEditDatesModal(false)}
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
                disabled={isSavingDates}
              >
                {isSavingDates ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Guardar Fechas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Completar Ciclo (con verificación de tareas pendientes) */}
      <Dialog open={openCompleteModal} onOpenChange={setOpenCompleteModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <CheckCircle2 className="size-5 text-indigo-600" />
              Finalizar Ciclo: {cycleToComplete?.name}
            </DialogTitle>
            <DialogDescription>
              Revisa el estado de las tareas antes de completar la iteración.
            </DialogDescription>
          </DialogHeader>

          {isLoadingCheck ? (
            <div className="py-10 flex flex-col items-center justify-center gap-2">
              <Loader2 className="size-6 text-indigo-600 animate-spin" />
              <p className="text-xs text-slate-500">Verificando tareas del ciclo...</p>
            </div>
          ) : (
            <div className="space-y-4 py-2">
              {incompleteItemsCount > 0 ? (
                <div className="rounded-lg bg-amber-50 border border-amber-200 p-4 space-y-2">
                  <div className="flex items-center gap-2 text-amber-900 font-semibold text-sm">
                    <AlertTriangle className="size-4 text-amber-600 shrink-0" />
                    <span>
                      Hay {incompleteItemsCount} {incompleteItemsCount === 1 ? "tarea pendiente" : "tareas pendientes"} sin completar
                    </span>
                  </div>

                  {nextCycleCandidate ? (
                    <div className="space-y-3 pt-1">
                      <p className="text-xs text-amber-800 leading-relaxed">
                        Al completar el ciclo, las tareas pendientes se <strong>trasladarán automáticamente al ciclo siguiente: &quot;{nextCycleCandidate.name}&quot;</strong>.
                      </p>

                      <div className="space-y-1.5 pt-1">
                        <Label className="text-xs font-semibold text-amber-900">Destino de las tareas pendientes:</Label>
                        <Select value={transferTarget} onValueChange={(v) => setTransferTarget(v as any)}>
                          <SelectTrigger className="bg-white border-amber-200 text-xs">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="CYCLE">
                              Trasladar al siguiente ciclo ({nextCycleCandidate.name})
                            </SelectItem>
                            <SelectItem value="BACKLOG">
                              Quitar del ciclo (regresar al Backlog del proyecto)
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>

                      {transferTarget === "CYCLE" && upcomingCycles.length > 1 && (
                        <div className="space-y-1.5">
                          <Label className="text-xs font-semibold text-amber-900">Seleccionar otro ciclo próximo:</Label>
                          <Select value={targetCycleId} onValueChange={setTargetCycleId}>
                            <SelectTrigger className="bg-white border-amber-200 text-xs">
                              <SelectValue placeholder="Elige un ciclo" />
                            </SelectTrigger>
                            <SelectContent>
                              {upcomingCycles.map((c) => (
                                <SelectItem key={c.id} value={String(c.id)}>
                                  {c.name}
                                </SelectItem>
                              ))}
                            </SelectContent>
                          </Select>
                        </div>
                      )}
                    </div>
                  ) : (
                    <p className="text-xs text-amber-800 leading-relaxed pt-1">
                      <strong>No existe un ciclo siguiente planificado.</strong> Al completar el ciclo, se <strong>quitará la relación del ciclo de estas tareas</strong> y regresarán al Backlog del proyecto.
                    </p>
                  )}
                </div>
              ) : (
                <div className="rounded-lg bg-emerald-50 border border-emerald-200 p-4 flex items-start gap-3">
                  <CheckCircle2 className="size-5 text-emerald-600 shrink-0 mt-0.5" />
                  <div className="text-xs text-emerald-900 space-y-1">
                    <p className="font-semibold text-sm">¡Todas las tareas están completadas!</p>
                    <p className="text-emerald-700 leading-relaxed">
                      Todas las tareas asignadas a este ciclo se encuentran finalizadas. Al completar el ciclo, se consolidarán las métricas y el historial de entrega.
                    </p>
                  </div>
                </div>
              )}
            </div>
          )}

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCompleteModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteCycle}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={isCompleting || isLoadingCheck || (transferTarget === "CYCLE" && !targetCycleId)}
            >
              {isCompleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Confirmar y Finalizar Ciclo
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Ciclo (con advertencia de eliminación de work items asociados) */}
      <Dialog open={openDeleteModal} onOpenChange={setOpenDeleteModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-red-600">
              <Trash2 className="size-5" />
              Eliminar Ciclo: {cycleToDelete?.name}
            </DialogTitle>
            <DialogDescription>
              Esta acción es permanente y afectará a los datos vinculados.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2">
            <div className="rounded-lg bg-red-50 border border-red-200 p-4 flex items-start gap-3">
              <AlertTriangle className="size-5 text-red-600 shrink-0 mt-0.5" />
              <div className="text-xs text-red-900 space-y-1.5">
                <p className="font-bold text-sm">
                  ¿Estás seguro de que deseas eliminar este ciclo?
                </p>
                <p className="text-red-700 leading-relaxed">
                  Al eliminar el ciclo <strong>&quot;{cycleToDelete?.name}&quot;</strong>, <strong>también se eliminarán todos los work items asociados a él</strong>.
                </p>
                <p className="font-semibold text-red-800">
                  Esta acción no se puede deshacer.
                </p>
              </div>
            </div>
          </div>

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenDeleteModal(false)}>
              Cancelar
            </Button>
            <Button
              variant="destructive"
              onClick={handleDeleteCycle}
              disabled={isDeleting}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              {isDeleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Eliminar Ciclo y Work Items
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Modal Analíticas & Burn-down */}
      <Dialog open={openAnalyticsModal} onOpenChange={setOpenAnalyticsModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-indigo-600" />
              Estadísticas del Ciclo: {selectedAnalytics?.name}
            </DialogTitle>
          </DialogHeader>

          {isLoadingAnalytics || !selectedAnalytics ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="size-6 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-500">Tasa de Efectividad</span>
                  <p className="text-2xl font-bold text-indigo-600 mt-1">
                    {selectedAnalytics.metrics.completion_rate}%
                  </p>
                </div>
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-center">
                  <span className="text-xs text-slate-500">Total Items Planificados</span>
                  <p className="text-2xl font-bold text-slate-800 mt-1">
                    {selectedAnalytics.metrics.total_items}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3">
                <div className="p-3 rounded-lg bg-emerald-50 border border-emerald-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-emerald-800">
                    <CheckCircle2 className="size-4 text-emerald-600" />
                    <span>Completados con éxito</span>
                  </div>
                  <p className="text-xl font-bold text-emerald-700 mt-1">
                    {selectedAnalytics.metrics.completed_items} items
                  </p>
                </div>

                <div className="p-3 rounded-lg bg-amber-50 border border-amber-100">
                  <div className="flex items-center gap-1.5 text-xs font-semibold text-amber-800">
                    <Undo2 className="size-4 text-amber-600" />
                    <span>No completados (Backlog)</span>
                  </div>
                  <p className="text-xl font-bold text-amber-700 mt-1">
                    {selectedAnalytics.metrics.incomplete_items} items
                  </p>
                </div>
              </div>

              {selectedAnalytics.metrics.total_points > 0 && (
                <div className="p-3 rounded-lg bg-slate-50 border border-slate-100 text-xs text-slate-600 flex justify-between">
                  <span>Puntos de estimación completados:</span>
                  <span className="font-semibold text-slate-900">
                    {selectedAnalytics.metrics.completed_points} / {selectedAnalytics.metrics.total_points} pts
                  </span>
                </div>
              )}
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
