"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Milestone, Project, WorkItem, State } from "@/types/plane-types";
import { milestoneService } from "@/services/plane/milestoneService";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { WorkItemDetailSheet } from "@/components/plane/WorkItemDetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Flag,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  ChevronRight,
  ChevronDown,
  Check,
  Maximize2,
  GitBranch,
  ListTodo,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function ProjectMilestonesPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [availableItems, setAvailableItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Expanded work items state per milestone
  const [expandedMilestones, setExpandedMilestones] = useState<Record<string, boolean>>({});
  const [milestoneItemsMap, setMilestoneItemsMap] = useState<Record<string, WorkItem[]>>({});
  const [loadingItemsMap, setLoadingItemsMap] = useState<Record<string, boolean>>({});
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | number | null>(null);

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projData, milestonesData, itemsData, statesData] = await Promise.all([
        projectService.get(projectId),
        milestoneService.list(projectId),
        workItemService.list(projectId),
        projectService.getStates(projectId).catch(() => []),
      ]);
      setProject(projData);
      setMilestones(milestonesData);
      setAvailableItems(itemsData);
      setStates(statesData);
    } catch (err) {
      console.error("Error loading milestones:", err);
    } finally {
      setLoading(false);
    }
  };

  const toggleMilestoneExpand = async (milestone: Milestone) => {
    const mId = String(milestone.id);
    const isCurrentlyExpanded = expandedMilestones[mId];
    setExpandedMilestones((prev) => ({ ...prev, [mId]: !isCurrentlyExpanded }));

    if (!isCurrentlyExpanded) {
      setLoadingItemsMap((prev) => ({ ...prev, [mId]: true }));
      try {
        const items = await workItemService.list(projectId, { milestone_id: milestone.id });
        setMilestoneItemsMap((prev) => ({ ...prev, [mId]: items }));
      } catch {
        toast.error("Error al cargar las tareas del hito");
      } finally {
        setLoadingItemsMap((prev) => ({ ...prev, [mId]: false }));
      }
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await milestoneService.create(projectId, {
        title: title.trim(),
        description: description.trim() || undefined,
        target_date: targetDate || undefined,
        work_item_ids: selectedItemIds,
      });

      toast.success("Hito (Milestone) creado exitosamente");
      setMilestones((prev) => [...prev, created]);
      setTitle("");
      setDescription("");
      setTargetDate("");
      setSelectedItemIds([]);
      setOpenModal(false);
    } catch (err) {
      toast.error("Error al crear el hito");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleToggleComplete = async (milestone: Milestone) => {
    try {
      const updated = await milestoneService.toggleComplete(milestone.id);
      setMilestones((prev) =>
        prev.map((m) => (String(m.id) === String(milestone.id) ? updated : m))
      );
      toast.success(
        updated.status === "COMPLETED"
          ? `Hito "${updated.title}" marcado como completado`
          : `Hito reabierto como pendiente`
      );
    } catch (err) {
      toast.error("Error al actualizar el estado del hito");
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await milestoneService.delete(id);
      setMilestones((prev) => prev.filter((m) => String(m.id) !== String(id)));
      toast.success("Hito eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  const isAdmin = project?.current_user_role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/projects" className="hover:text-indigo-600 transition-colors">
              Proyectos
            </Link>
            <ChevronRight className="size-3 text-slate-300" />
            <Link href={`/projects/${projectId}`} className="hover:text-indigo-600 transition-colors">
              {project?.name || "Proyecto"}
            </Link>
            <ChevronRight className="size-3 text-slate-300" />
            <span className="font-semibold text-slate-800">Hitos (Milestones)</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Hitos del Proyecto
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
              {project?.identifier}
            </span>
          </div>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setOpenModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-semibold h-9 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Nuevo Hito</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <Loader2 className="size-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm">Cargando hitos...</p>
        </div>
      ) : milestones.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
          <Flag className="size-10 text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 text-base">No hay hitos en este proyecto</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Crea hitos con fecha objetivo para rastrear fechas clave de entrega y progreso de tareas.
          </p>
          {isAdmin && (
            <Button onClick={() => setOpenModal(true)} className="mt-4 bg-indigo-600 text-white text-xs">
              <Plus className="size-4 mr-1.5" /> Crear Hito
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {milestones.map((m) => {
            const isCompleted = m.status === "COMPLETED";
            const mId = String(m.id);
            const isExpanded = Boolean(expandedMilestones[mId]);
            const mItems = milestoneItemsMap[mId] || [];
            const isLoadingItems = Boolean(loadingItemsMap[mId]);

            return (
              <div
                key={m.id}
                className={cn(
                  "rounded-xl border transition-all overflow-hidden",
                  isCompleted
                    ? "bg-slate-50/60 border-slate-200"
                    : "bg-white border-slate-200 hover:border-indigo-300 shadow-xs"
                )}
              >
                {/* Main Milestone Header Row */}
                <div
                  onClick={() => toggleMilestoneExpand(m)}
                  className="p-5 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer select-none"
                >
                  <div className="flex items-start gap-3.5 flex-1 min-w-0">
                    <button
                      type="button"
                      disabled={!isAdmin}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleToggleComplete(m);
                      }}
                      className={cn(
                        "mt-0.5 size-6 rounded-full border flex items-center justify-center transition-colors shrink-0",
                        !isAdmin ? "cursor-not-allowed opacity-80" : "cursor-pointer",
                        isCompleted
                          ? "bg-emerald-600 border-emerald-600 text-white"
                          : "border-slate-300 hover:border-indigo-500 text-transparent"
                      )}
                      title={!isAdmin ? undefined : isCompleted ? "Reabrir hito" : "Completar hito"}
                    >
                      <Check className="size-3.5 stroke-[3]" />
                    </button>

                    <div className="space-y-1 min-w-0 flex-1">
                      <div className="flex items-center gap-2">
                        <h3
                          className={cn(
                            "font-bold text-base text-slate-900 truncate",
                            isCompleted && "line-through text-slate-400"
                          )}
                        >
                          {m.title}
                        </h3>
                        {isCompleted ? (
                          <span className="text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                            Completado
                          </span>
                        ) : (
                          <span className="text-[10px] font-semibold bg-blue-50 text-blue-700 border border-blue-200 px-2 py-0.5 rounded-full">
                            Pendiente
                          </span>
                        )}
                        <span className="text-xs text-slate-400 ml-1">
                          {isExpanded ? (
                            <ChevronDown className="size-4 inline text-indigo-600" />
                          ) : (
                            <ChevronRight className="size-4 inline text-slate-400" />
                          )}
                        </span>
                      </div>

                      {m.description && (
                        <p className="text-xs text-slate-500 line-clamp-2">{m.description}</p>
                      )}

                      <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
                        <div className="flex items-center gap-1">
                          <Calendar className="size-3.5" />
                          <span>{m.target_date ? `Objetivo: ${m.target_date}` : "Sin fecha"}</span>
                        </div>
                        {m.completed_at && (
                          <span>Finalizado el {new Date(m.completed_at).toLocaleDateString()}</span>
                        )}
                      </div>
                    </div>
                  </div>

                  {/* Progress & Actions */}
                  <div className="flex items-center gap-6 shrink-0 justify-between md:justify-end border-t md:border-t-0 pt-3 md:pt-0" onClick={(e) => e.stopPropagation()}>
                    <div className="text-right">
                      <p className="text-xs font-bold text-slate-800">
                        {m.completed_work_items || 0} / {m.total_work_items || 0} items
                      </p>
                      <div className="w-28 h-2 bg-slate-100 rounded-full mt-1.5 overflow-hidden">
                        <div
                          className="h-full bg-indigo-600 rounded-full transition-all"
                          style={{ width: `${m.progress_percentage || 0}%` }}
                        />
                      </div>
                    </div>

                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleMilestoneExpand(m)}
                      className="text-xs text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50 font-medium gap-1"
                    >
                      <ListTodo className="size-3.5" />
                      <span>{isExpanded ? "Ocultar" : "Ver Items"}</span>
                    </Button>

                    {isAdmin && (
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(m.id)}
                        className="size-8 text-slate-400 hover:text-red-600 cursor-pointer"
                      >
                        <Trash2 className="size-4" />
                      </Button>
                    )}
                  </div>
                </div>

                {/* Expanded Work Items Section */}
                {isExpanded && (
                  <div className="bg-slate-50/70 border-t border-slate-200/80 p-4 space-y-3">
                    <div className="flex items-center justify-between text-xs text-slate-600 font-semibold px-1">
                      <span>Work Items del Hito ({mItems.length})</span>
                      <span className="text-[11px] text-slate-400 font-normal">Haz clic en una tarea para ver su detalle</span>
                    </div>

                    {isLoadingItems ? (
                      <div className="py-8 flex justify-center items-center text-slate-400 gap-2">
                        <Loader2 className="size-5 animate-spin text-indigo-600" />
                        <span className="text-xs">Cargando tareas del hito...</span>
                      </div>
                    ) : mItems.length === 0 ? (
                      <div className="p-6 text-center bg-white rounded-lg border border-dashed border-slate-200 text-xs text-slate-400">
                        No hay work items asociados a este hito todavía.
                      </div>
                    ) : (
                      <div className="bg-white rounded-lg border border-slate-200 overflow-hidden shadow-2xs divide-y divide-slate-100">
                        {mItems.map((item) => (
                          <div
                            key={item.id}
                            onClick={() => setSelectedWorkItemId(item.id)}
                            className="flex items-center justify-between p-3 hover:bg-slate-50/80 cursor-pointer transition-colors text-xs group"
                          >
                            <div className="flex items-center gap-2.5 min-w-0 pr-2">
                              <span className="font-mono font-bold text-indigo-600 bg-indigo-50 px-1.5 py-0.5 rounded border border-indigo-100 text-[11px]">
                                {item.identifier}
                              </span>
                              {item.type && (
                                <span
                                  className="text-[10px] font-bold px-1.5 py-0.2 rounded shrink-0"
                                  style={{ backgroundColor: `${item.type.color}15`, color: item.type.color }}
                                >
                                  {item.type.name}
                                </span>
                              )}
                              <span className="font-medium text-slate-800 truncate">
                                {item.title}
                              </span>
                              {item.sub_items && item.sub_items.length > 0 && (
                                <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                                  <GitBranch className="size-2.5" />
                                  {item.sub_items.length}
                                </span>
                              )}
                            </div>

                            <div className="flex items-center gap-3 shrink-0">
                              {item.state && (
                                <div
                                  className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium border"
                                  style={{
                                    backgroundColor: `${item.state.color}15`,
                                    borderColor: `${item.state.color}40`,
                                    color: item.state.color,
                                  }}
                                >
                                  <span className="size-1.5 rounded-full" style={{ backgroundColor: item.state.color }} />
                                  <span>{item.state.name}</span>
                                </div>
                              )}
                              {item.target_date && (
                                <span className="text-[11px] text-slate-400 flex items-center gap-1">
                                  <Calendar className="size-3" />
                                  {item.target_date}
                                </span>
                              )}
                              <Button
                                variant="ghost"
                                size="sm"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  setSelectedWorkItemId(item.id);
                                }}
                                className="h-6 text-[11px] px-2 text-indigo-600 hover:text-indigo-800 gap-1 opacity-80 group-hover:opacity-100"
                              >
                                <span>Ver</span>
                                <Maximize2 className="size-2.5" />
                              </Button>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}

      {/* Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Flag className="size-5 text-indigo-600" />
              Nuevo Hito (Milestone)
            </DialogTitle>
            <DialogDescription>
              Fija una fecha clave de entrega para {project?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="m-title">Título del Hito *</Label>
              <Input
                id="m-title"
                placeholder="Ej. Lanzamiento MVP en Producción"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
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

            <div className="space-y-2">
              <Label>Vincular Work Items del Proyecto</Label>
              <div className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-40 overflow-y-auto">
                {availableItems.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">No hay work items en este proyecto.</p>
                ) : (
                  availableItems.map((item) => {
                    const isSelected = selectedItemIds.includes(String(item.id));
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItemIds((prev) =>
                            isSelected ? prev.filter((id) => id !== String(item.id)) : [...prev, String(item.id)]
                          );
                        }}
                        className={cn(
                          "flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors",
                          isSelected ? "bg-indigo-50 text-indigo-900 font-semibold" : "hover:bg-slate-100/70 text-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[10px] text-slate-500">{item.identifier}</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="m-desc">Descripción (Opcional)</Label>
              <Textarea
                id="m-desc"
                placeholder="Criterios y objetivos para alcanzar este hito..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Guardar Hito
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Work Item Detail Sheet */}
      {selectedWorkItemId && (
        <WorkItemDetailSheet
          workItemId={selectedWorkItemId}
          project={project}
          states={states}
          open={Boolean(selectedWorkItemId)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedWorkItemId(null);
          }}
          onUpdated={() => {
            loadData();
            // Refresh items for all expanded milestones
            Object.keys(expandedMilestones).forEach((mId) => {
              if (expandedMilestones[mId]) {
                workItemService.list(projectId, { milestone_id: mId }).then((items) => {
                  setMilestoneItemsMap((prev) => ({ ...prev, [mId]: items }));
                }).catch(() => {});
              }
            });
          }}
        />
      )}
    </div>
  );
}
