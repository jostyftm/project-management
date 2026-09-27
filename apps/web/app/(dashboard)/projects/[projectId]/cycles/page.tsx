"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { cycleService } from "@/services/plane/cycleService";
import { projectService } from "@/services/plane/projectService";
import { Cycle, CycleAnalytics, Project } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function CyclesPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [tab, setTab] = useState<"current" | "upcoming" | "completed">("current");

  // Create Cycle Modal
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [cycleName, setCycleName] = useState("");
  const [cycleDesc, setCycleDesc] = useState("");
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Complete Cycle Modal
  const [openCompleteModal, setOpenCompleteModal] = useState(false);
  const [cycleToComplete, setCycleToComplete] = useState<Cycle | null>(null);
  const [transferTarget, setTransferTarget] = useState<"BACKLOG" | "CYCLE">("BACKLOG");
  const [targetCycleId, setTargetCycleId] = useState<string>("");
  const [isCompleting, setIsCompleting] = useState(false);

  // Analytics Modal
  const [openAnalyticsModal, setOpenAnalyticsModal] = useState(false);
  const [selectedAnalytics, setSelectedAnalytics] = useState<CycleAnalytics | null>(null);
  const [isLoadingAnalytics, setIsLoadingAnalytics] = useState(false);

  const loadCycles = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projData, cyclesData] = await Promise.all([
        projectService.get(projectId),
        cycleService.list(projectId),
      ]);
      setProject(projData);
      setCycles(cyclesData);
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

  const handleCreateCycle = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!cycleName.trim()) return;

    setIsSubmitting(true);
    try {
      await cycleService.create(projectId, {
        name: cycleName.trim(),
        description: cycleDesc.trim() || undefined,
        start_date: startDate || undefined,
        end_date: endDate || undefined,
        status: currentCycles.length === 0 ? "CURRENT" : "UPCOMING",
      });
      toast.success("Ciclo creado exitosamente");
      setCycleName("");
      setCycleDesc("");
      setStartDate("");
      setEndDate("");
      setOpenCreateModal(false);
      loadCycles();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al crear el ciclo");
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

  const handleOpenCompleteModal = (cycle: Cycle) => {
    setCycleToComplete(cycle);
    setTransferTarget("BACKLOG");
    setTargetCycleId("");
    setOpenCompleteModal(true);
  };

  const handleCompleteCycle = async () => {
    if (!cycleToComplete) return;
    setIsCompleting(true);
    try {
      await cycleService.complete(cycleToComplete.id, {
        transfer_target: transferTarget,
        target_cycle_id: transferTarget === "CYCLE" && targetCycleId ? targetCycleId : undefined,
      });
      toast.success(`Ciclo "${cycleToComplete.name}" completado. Items pendientes regresados al backlog.`);
      setOpenCompleteModal(false);
      loadCycles();
    } catch (err: any) {
      toast.error("Error al finalizar el ciclo");
    } finally {
      setIsCompleting(false);
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

  return (
    <div className="max-w-6xl mx-auto space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Repeat className="size-6 text-indigo-600" />
            Ciclos de Trabajo (Sprints)
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Planifica iteraciones temporales, da seguimiento al burn-down y gestiona traspasos de trabajo.
          </p>
        </div>

        <Button
          onClick={() => setOpenCreateModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
        >
          <Plus className="mr-2 size-4" />
          Nuevo Ciclo
        </Button>
      </div>

      {/* Tabs */}
      <Tabs value={tab} onValueChange={(v) => setTab(v as any)} className="w-full">
        <TabsList className="bg-slate-100 p-1 rounded-xl">
          <TabsTrigger value="current" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 font-medium">
            En Curso ({currentCycles.length})
          </TabsTrigger>
          <TabsTrigger value="upcoming" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 font-medium">
            Próximos ({upcomingCycles.length})
          </TabsTrigger>
          <TabsTrigger value="completed" className="data-[state=active]:bg-white data-[state=active]:text-indigo-600 font-medium">
            Completados ({completedCycles.length})
          </TabsTrigger>
        </TabsList>

        {/* Current Cycle Tab */}
        <TabsContent value="current" className="mt-6 space-y-4">
          {currentCycles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
              <Repeat className="size-8 text-slate-400 mx-auto mb-2" />
              <h3 className="font-semibold text-slate-900">No hay ningún ciclo activo</h3>
              <p className="text-sm text-slate-500 mt-1">
                Puedes iniciar uno de tus ciclos planificados o crear uno nuevo.
              </p>
              {upcomingCycles.length > 0 && (
                <Button
                  onClick={() => setTab("upcoming")}
                  variant="outline"
                  className="mt-4"
                >
                  Ver ciclos próximos
                </Button>
              )}
            </div>
          ) : (
            currentCycles.map((cycle) => {
              const total = cycle.total_items ?? 0;
              const completed = cycle.completed_items ?? 0;
              const progress = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <Card key={cycle.id} className="border-indigo-200 bg-white shadow-sm">
                  <CardHeader className="pb-3">
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                      <div className="flex items-center gap-2">
                        <span className="size-2.5 rounded-full bg-emerald-500 animate-pulse" />
                        <CardTitle className="text-xl text-slate-900">{cycle.name}</CardTitle>
                        <span className="bg-emerald-50 text-emerald-700 text-xs font-semibold px-2 py-0.5 rounded-full border border-emerald-200">
                          Activo
                        </span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-slate-500">
                        <Calendar className="size-3.5" />
                        <span>{cycle.start_date || "Inicio"} — {cycle.end_date || "Fin"}</span>
                      </div>
                    </div>
                    {cycle.description && (
                      <CardDescription className="mt-1 text-slate-600">{cycle.description}</CardDescription>
                    )}
                  </CardHeader>

                  <CardContent className="space-y-4">
                    {/* Progress bar */}
                    <div>
                      <div className="flex justify-between text-xs font-semibold text-slate-600 mb-1.5">
                        <span>Progreso del ciclo</span>
                        <span>{progress}% ({completed} de {total} items completados)</span>
                      </div>
                      <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
                        <div
                          className="bg-indigo-600 h-2.5 rounded-full transition-all duration-500"
                          style={{ width: `${progress}%` }}
                        />
                      </div>
                    </div>
                  </CardContent>

                  <CardFooter className="border-t border-slate-100 pt-3 flex items-center justify-between">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenAnalytics(cycle)}
                      className="text-slate-600 hover:text-indigo-600"
                    >
                      <BarChart3 className="size-4 mr-1.5" />
                      Analíticas y Burn-down
                    </Button>

                    <Button
                      size="sm"
                      onClick={() => handleOpenCompleteModal(cycle)}
                      className="bg-indigo-600 hover:bg-indigo-500 text-white"
                    >
                      <CheckCircle2 className="size-4 mr-1.5" />
                      Completar Ciclo
                    </Button>
                  </CardFooter>
                </Card>
              );
            })
          )}
        </TabsContent>

        {/* Upcoming Cycles Tab */}
        <TabsContent value="upcoming" className="mt-6 space-y-4">
          {upcomingCycles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              No hay ciclos planificados próximos.
            </div>
          ) : (
            upcomingCycles.map((cycle) => (
              <Card key={cycle.id} className="border-slate-200 bg-white">
                <CardHeader className="pb-3 flex flex-row items-center justify-between">
                  <div>
                    <CardTitle className="text-base font-semibold text-slate-900">{cycle.name}</CardTitle>
                    <div className="flex items-center gap-2 text-xs text-slate-400 mt-1">
                      <Calendar className="size-3.5" />
                      <span>{cycle.start_date || "Fecha por definir"} — {cycle.end_date || "Fecha por definir"}</span>
                    </div>
                  </div>

                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => handleStartCycle(cycle)}
                    className="border-indigo-200 text-indigo-700 hover:bg-indigo-50"
                  >
                    <Play className="size-3.5 mr-1.5" />
                    Iniciar Ciclo
                  </Button>
                </CardHeader>
              </Card>
            ))
          )}
        </TabsContent>

        {/* Completed Cycles Tab */}
        <TabsContent value="completed" className="mt-6 space-y-4">
          {completedCycles.length === 0 ? (
            <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center text-slate-500">
              No hay ciclos completados aún.
            </div>
          ) : (
            completedCycles.map((cycle) => {
              const total = cycle.total_items ?? 0;
              const completed = cycle.completed_items ?? 0;
              const rate = total > 0 ? Math.round((completed / total) * 100) : 0;

              return (
                <Card key={cycle.id} className="border-slate-200 bg-white">
                  <CardHeader className="pb-3 flex flex-row items-center justify-between">
                    <div>
                      <div className="flex items-center gap-2">
                        <CardTitle className="text-base font-semibold text-slate-900">{cycle.name}</CardTitle>
                        <span className="bg-slate-100 text-slate-600 text-xs px-2 py-0.5 rounded-full font-medium">
                          Completado
                        </span>
                      </div>
                      <p className="text-xs text-slate-400 mt-1">
                        {cycle.start_date} — {cycle.end_date}
                      </p>
                    </div>

                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleOpenAnalytics(cycle)}
                      className="text-slate-600 hover:text-indigo-600"
                    >
                      <BarChart3 className="size-4 mr-1.5" />
                      Ver Estadísticas
                    </Button>
                  </CardHeader>
                </Card>
              );
            })
          )}
        </TabsContent>
      </Tabs>

      {/* Modal Crear Ciclo */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Repeat className="size-5 text-indigo-600" />
              Nuevo Ciclo (Sprint)
            </DialogTitle>
            <DialogDescription>
              Define el periodo de tiempo y los objetivos para este ciclo.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateCycle} className="space-y-4 py-2">
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
              <Button type="button" variant="outline" onClick={() => setOpenCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Crear Ciclo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Completar Ciclo (Regla de negocio acordada con el usuario) */}
      <Dialog open={openCompleteModal} onOpenChange={setOpenCompleteModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <CheckCircle2 className="size-5 text-indigo-600" />
              Finalizar {cycleToComplete?.name}
            </DialogTitle>
            <DialogDescription>
              Al completar este ciclo, los work items pendientes se transferirán de acuerdo con la política seleccionada.
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-4 py-2">
            <div className="rounded-lg bg-amber-50 border border-amber-200 p-3.5 flex items-start gap-3">
              <AlertTriangle className="size-5 text-amber-600 shrink-0 mt-0.5" />
              <div className="text-xs text-amber-800">
                <p className="font-semibold">Política de preservación de estadísticas:</p>
                <p className="mt-0.5">
                  Los items no completados quedarán registrados históricamente con estado <code>TRANSFERRED_TO_BACKLOG</code> para que las analíticas y gráficas de burn-down reflejen el trabajo inconcluso.
                </p>
              </div>
            </div>

            <div className="space-y-2">
              <Label>Destino de los Work Items pendientes</Label>
              <Select value={transferTarget} onValueChange={(v) => setTransferTarget(v as any)}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="BACKLOG">
                    Regresar al Backlog (Por defecto)
                  </SelectItem>
                  {upcomingCycles.length > 0 && (
                    <SelectItem value="CYCLE">
                      Transferir a otro ciclo próximo
                    </SelectItem>
                  )}
                </SelectContent>
              </Select>
            </div>

            {transferTarget === "CYCLE" && (
              <div className="space-y-2">
                <Label>Selecciona el ciclo de destino</Label>
                <Select value={targetCycleId} onValueChange={setTargetCycleId}>
                  <SelectTrigger>
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

          <DialogFooter>
            <Button variant="outline" onClick={() => setOpenCompleteModal(false)}>
              Cancelar
            </Button>
            <Button
              onClick={handleCompleteCycle}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
              disabled={isCompleting || (transferTarget === "CYCLE" && !targetCycleId)}
            >
              {isCompleting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Confirmar y Cerrar Ciclo
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
