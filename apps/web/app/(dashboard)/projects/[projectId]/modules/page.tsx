"use client";

import React, { useState, useEffect, useCallback } from "react";
import { useParams } from "next/navigation";
import { moduleService } from "@/services/plane/moduleService";
import { projectService } from "@/services/plane/projectService";
import { Module, ModuleProgress, Project, State } from "@/types/plane-types";
import { ModuleWorkItemsSection } from "@/components/plane/modules/ModuleWorkItemsSection";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Boxes,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  ArrowRight,
  TrendingUp,
  Loader2,
  Layers,
  ChevronRight,
  ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";

const STATUS_CONFIG: Record<string, { label: string; color: string }> = {
  PLANNED: { label: "Planificado", color: "bg-slate-100 text-slate-700 border-slate-200" },
  IN_PROGRESS: { label: "En Curso", color: "bg-blue-50 text-blue-700 border-blue-200" },
  PAUSED: { label: "En Pausa", color: "bg-amber-50 text-amber-700 border-amber-200" },
  COMPLETED: { label: "Completado", color: "bg-emerald-50 text-emerald-700 border-emerald-200" },
  CANCELLED: { label: "Cancelado", color: "bg-red-50 text-red-700 border-red-200" },
};

export default function ModulesPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [modules, setModules] = useState<Module[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [selectedModule, setSelectedModule] = useState<Module | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useDocumentTitle(`Módulos - ${project?.name || "Proyecto"}`);

  // Create Modal
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [modName, setModName] = useState("");
  const [modDesc, setModDesc] = useState("");
  const [modStatus, setModStatus] = useState("PLANNED");
  const [targetDate, setTargetDate] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Progress Breakdown Modal
  const [openProgressModal, setOpenProgressModal] = useState(false);
  const [selectedProgress, setSelectedProgress] = useState<ModuleProgress | null>(null);
  const [isLoadingProgress, setIsLoadingProgress] = useState(false);

  const loadModules = useCallback(async () => {
    setIsLoading(true);
    try {
      const [projData, modulesData, statesData] = await Promise.all([
        projectService.get(projectId),
        moduleService.list(projectId),
        projectService.getStates(projectId).catch(() => []),
      ]);
      setProject(projData);
      setModules(modulesData);
      setStates(statesData);
    } catch {
      toast.error("Error al cargar los módulos");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadModules();
  }, [loadModules]);

  const handleCreateModule = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!modName.trim()) return;

    setIsSubmitting(true);
    try {
      await moduleService.create(projectId, {
        name: modName.trim(),
        description: modDesc.trim() || undefined,
        status: modStatus,
        target_date: targetDate || undefined,
      });
      toast.success("Módulo creado exitosamente");
      setModName("");
      setModDesc("");
      setModStatus("PLANNED");
      setTargetDate("");
      setOpenCreateModal(false);
      loadModules();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al crear el módulo");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleOpenProgress = async (module: Module) => {
    setIsLoadingProgress(true);
    setOpenProgressModal(true);
    try {
      const data = await moduleService.getProgress(module.id);
      setSelectedProgress(data);
    } catch {
      toast.error("Error al cargar desglose de progreso");
    } finally {
      setIsLoadingProgress(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando módulos...</p>
      </div>
    );
  }

  const isAdmin = project?.current_user_role === "ADMIN";

  if (selectedModule) {
    return (
      <div className="w-full">
        <ModuleWorkItemsSection
          module={selectedModule}
          projectId={projectId}
          project={project}
          states={states}
          onModuleUpdated={async () => {
            loadModules();
            try {
              const refreshed = await moduleService.get(selectedModule.id);
              setSelectedModule(refreshed);
            } catch {}
          }}
          onBack={() => setSelectedModule(null)}
        />
      </div>
    );
  }

  return (
    <div className="w-full space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <ProjectBreadcrumb
            projectId={projectId}
            projectName={project?.name || "Proyecto"}
            sectionTitle="Módulos"
          />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2">
            <Boxes className="size-6 text-indigo-600" />
            Módulos
          </h1>
          <p className="text-sm text-slate-500 mt-1">
            Agrupaciones temáticas de trabajo con métricas y porcentajes de avance agregado. Haz clic en un módulo para gestionar sus work items.
          </p>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setOpenCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
          >
            <Plus className="mr-2 size-4" />
            Nuevo Módulo
          </Button>
        )}
      </div>

      {/* Modules Grid */}
      {modules.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Boxes className="size-8 text-slate-400 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-900">No hay módulos creados</h3>
          <p className="text-sm text-slate-500 mt-1">
            Crea módulos para agrupar features, componentes o iniciativas de tu proyecto.
          </p>
          {isAdmin && (
            <Button
              onClick={() => setOpenCreateModal(true)}
              className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            >
              <Plus className="mr-2 size-4" />
              Crear Primer Módulo
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {modules.map((module) => {
            const statusCfg = STATUS_CONFIG[module.status] || STATUS_CONFIG.PLANNED;
            const progress = module.progress_percentage ?? 0;
            const total = module.total_items ?? 0;
            const completed = module.completed_items ?? 0;

            return (
              <Card
                key={module.id}
                onClick={() => setSelectedModule(module)}
                className="border-slate-200 bg-white hover:border-indigo-400 hover:shadow-md transition-all flex flex-col justify-between cursor-pointer group"
              >
                <CardHeader className="pb-3">
                  <div className="flex items-center justify-between gap-2 mb-2">
                    <span className={cn("text-xs font-semibold px-2 py-0.5 rounded-full border", statusCfg.color)}>
                      {statusCfg.label}
                    </span>
                    {module.target_date && (
                      <span className="text-xs text-slate-400 flex items-center gap-1">
                        <Calendar className="size-3" />
                        {module.target_date}
                      </span>
                    )}
                  </div>

                  <CardTitle className="text-lg font-semibold text-slate-900 line-clamp-1 group-hover:text-indigo-600 transition-colors">
                    {module.name}
                  </CardTitle>
                  <CardDescription className="text-xs text-slate-500 line-clamp-2 mt-1">
                    {module.description || "Sin descripción proporcionada."}
                  </CardDescription>
                </CardHeader>

                <CardContent className="space-y-2 py-2">
                  <div className="flex justify-between text-xs text-slate-600 font-medium">
                    <span>Progreso</span>
                    <span>{progress}% ({completed}/{total} items)</span>
                  </div>
                  <div className="w-full bg-slate-100 rounded-full h-2 overflow-hidden">
                    <div
                      className="bg-indigo-600 h-2 rounded-full transition-all duration-300"
                      style={{ width: `${progress}%` }}
                    />
                  </div>
                </CardContent>

                <CardFooter className="pt-2 border-t border-slate-100 flex items-center justify-between gap-2">
                  <Button
                    variant="default"
                    size="sm"
                    onClick={() => setSelectedModule(module)}
                    className="bg-indigo-50 hover:bg-indigo-100 text-indigo-700 text-xs font-semibold h-8 shadow-none gap-1.5"
                  >
                    <ListTodo className="size-3.5" />
                    <span>Work Items ({total})</span>
                  </Button>

                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleOpenProgress(module);
                    }}
                    className="text-slate-500 hover:text-slate-800 text-xs h-8"
                  >
                    <span>Desglose</span>
                    <ArrowRight className="size-3.5 ml-1 transition-transform group-hover:translate-x-1" />
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      {/* Modal Crear Módulo */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Boxes className="size-5 text-indigo-600" />
              Nuevo Módulo
            </DialogTitle>
            <DialogDescription>
              Agrupa tareas bajo una misma funcionalidad o componente.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateModule} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="mod-name">Nombre del Módulo *</Label>
              <Input
                id="mod-name"
                placeholder="Ej. Integración de Pagos"
                value={modName}
                onChange={(e) => setModName(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label>Estado</Label>
                <Select value={modStatus} onValueChange={setModStatus}>
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planificado</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Curso</SelectItem>
                    <SelectItem value="PAUSED">En Pausa</SelectItem>
                    <SelectItem value="COMPLETED">Completado</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="m-date">Fecha Objetivo</Label>
                <Input
                  id="m-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="mod-desc">Descripción (Opcional)</Label>
              <Textarea
                id="mod-desc"
                placeholder="Alcance y entregables del módulo..."
                value={modDesc}
                onChange={(e) => setModDesc(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Crear Módulo
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Desglose de Progreso */}
      <Dialog open={openProgressModal} onOpenChange={setOpenProgressModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <TrendingUp className="size-5 text-indigo-600" />
              Progreso: {selectedProgress?.name}
            </DialogTitle>
          </DialogHeader>

          {isLoadingProgress || !selectedProgress ? (
            <div className="py-12 flex justify-center">
              <Loader2 className="size-6 text-indigo-600 animate-spin" />
            </div>
          ) : (
            <div className="space-y-4 py-2">
              <div className="flex items-center justify-between p-3 rounded-xl bg-slate-50 border border-slate-100">
                <span className="text-xs text-slate-500 font-medium">Avance Total</span>
                <span className="text-xl font-bold text-indigo-600">
                  {selectedProgress.progress_percentage}%
                </span>
              </div>

              <div className="space-y-2">
                <Label className="text-xs text-slate-500">Desglose de Work Items por Estado</Label>
                <div className="space-y-1.5 text-xs">
                  <div className="flex justify-between p-2 rounded bg-emerald-50 text-emerald-800">
                    <span>Completados (Done)</span>
                    <span className="font-bold">{selectedProgress.breakdown.completed}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-amber-50 text-amber-800">
                    <span>En Curso (Started)</span>
                    <span className="font-bold">{selectedProgress.breakdown.started}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-100 text-slate-700">
                    <span>Por Iniciar (Unstarted)</span>
                    <span className="font-bold">{selectedProgress.breakdown.unstarted}</span>
                  </div>
                  <div className="flex justify-between p-2 rounded bg-slate-50 text-slate-500">
                    <span>Backlog</span>
                    <span className="font-bold">{selectedProgress.breakdown.backlog}</span>
                  </div>
                </div>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
}
