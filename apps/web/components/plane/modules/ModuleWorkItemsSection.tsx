"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Module, Project, State, WorkItem } from "@/types/plane-types";
import { workItemService } from "@/services/plane/workItemService";
import { moduleService } from "@/services/plane/moduleService";
import { WorkItemDetailSheet } from "@/components/plane/WorkItemDetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import {
  Boxes,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  Loader2,
  Check,
  Calendar,
  ArrowLeft,
  Unlink,
  Maximize2,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ModuleWorkItemsSectionProps {
  module: Module;
  projectId: string | number;
  project: Project | null;
  states: State[];
  onModuleUpdated: () => void;
  onBack: () => void;
  className?: string;
}

const getPriorityBadge = (priority?: string) => {
  switch (priority) {
    case "URGENT":
      return { label: "Urgente", color: "bg-red-50 text-red-700 border-red-200" };
    case "HIGH":
      return { label: "Alta", color: "bg-amber-50 text-amber-700 border-amber-200" };
    case "MEDIUM":
      return { label: "Media", color: "bg-blue-50 text-blue-700 border-blue-200" };
    case "LOW":
      return { label: "Baja", color: "bg-slate-50 text-slate-700 border-slate-200" };
    default:
      return { label: "Sin prioridad", color: "bg-slate-50 text-slate-400 border-slate-200" };
  }
};

export function ModuleWorkItemsSection({
  module,
  projectId,
  project,
  states,
  onModuleUpdated,
  onBack,
  className,
}: ModuleWorkItemsSectionProps) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | number | null>(null);

  // Modal para vincular work items al módulo
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [allProjectItems, setAllProjectItems] = useState<WorkItem[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<(string | number)[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLinking, setIsLinking] = useState(false);

  const isAdmin = project?.current_user_role === "ADMIN";

  const loadModuleWorkItems = useCallback(async () => {
    if (!module?.id) return;
    setIsLoading(true);
    try {
      const items = await workItemService.list(projectId, { module_id: module.id });
      setWorkItems(items);
    } catch {
      toast.error("Error al cargar los work items del módulo");
    } finally {
      setIsLoading(false);
    }
  }, [module?.id, projectId]);

  useEffect(() => {
    loadModuleWorkItems();
  }, [loadModuleWorkItems]);

  const handleOpenLinkModal = async () => {
    setIsLinkModalOpen(true);
    setIsLoadingAvailable(true);
    setSelectedItemIds([]);
    setSearchQuery("");
    try {
      const items = await workItemService.list(projectId);
      setAllProjectItems(items);
    } catch {
      toast.error("Error al obtener los items del proyecto");
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  // Filtrar items del proyecto que NO estén ya en este módulo
  const availableItemsToLink = useMemo(() => {
    const existingIds = new Set(workItems.map((w) => String(w.id)));
    return allProjectItems.filter((item) => {
      const notInModule = !existingIds.has(String(item.id));
      if (!notInModule) return false;
      if (!searchQuery.trim()) return true;
      const q = searchQuery.toLowerCase();
      return (
        item.title.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q)
      );
    });
  }, [allProjectItems, workItems, searchQuery]);

  const handleToggleSelect = (itemId: string | number) => {
    setSelectedItemIds((prev) =>
      prev.includes(itemId)
        ? prev.filter((id) => id !== itemId)
        : [...prev, itemId]
    );
  };

  const handleConfirmLink = async () => {
    if (selectedItemIds.length === 0) return;
    setIsLinking(true);
    try {
      const currentIds = workItems.map((w) => w.id);
      const combinedIds = Array.from(new Set([...currentIds, ...selectedItemIds]));
      await moduleService.syncWorkItems(module.id, combinedIds);
      toast.success(`${selectedItemIds.length} item(s) vinculados al módulo`);
      setIsLinkModalOpen(false);
      setSelectedItemIds([]);
      loadModuleWorkItems();
      onModuleUpdated();
    } catch {
      toast.error("No se pudieron vincular los items al módulo");
    } finally {
      setIsLinking(false);
    }
  };

  const handleUnlink = async (itemId: string | number) => {
    try {
      const remainingIds = workItems.map((w) => w.id).filter((id) => id !== itemId);
      await moduleService.syncWorkItems(module.id, remainingIds);
      toast.success("Item desvinculado del módulo");
      setWorkItems((prev) => prev.filter((w) => w.id !== itemId));
      onModuleUpdated();
    } catch {
      toast.error("Error al desvincular el item");
    }
  };

  const handleStateChange = async (itemId: string | number, newStateId: string | number) => {
    const targetState = states.find((s) => String(s.id) === String(newStateId));
    setWorkItems((prev) =>
      prev.map((item) =>
        String(item.id) === String(itemId)
          ? { ...item, state: targetState || item.state }
          : item
      )
    );

    try {
      await workItemService.update(itemId, { state_id: newStateId });
      toast.success(`Estado actualizado a "${targetState?.name || 'Nuevo estado'}"`);
      onModuleUpdated();
    } catch {
      toast.error("No se pudo actualizar el estado");
      loadModuleWorkItems();
    }
  };

  return (
    <div className={cn("space-y-6 w-full", className)}>
      {/* Module Navigation & Details Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-slate-50 border border-slate-200 p-4 rounded-xl">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <Button
              variant="ghost"
              size="sm"
              onClick={onBack}
              className="h-8 px-2 text-slate-600 hover:text-indigo-600 gap-1.5 -ml-2"
            >
              <ArrowLeft className="size-4" />
              <span>Volver a módulos</span>
            </Button>
            <span className="text-slate-300">|</span>
            <div className="flex items-center gap-2">
              <Boxes className="size-5 text-indigo-600" />
              <h2 className="text-xl font-bold text-slate-900">{module.name}</h2>
            </div>
          </div>
          {module.description && (
            <p className="text-xs text-slate-500 pl-1 max-w-2xl">{module.description}</p>
          )}
        </div>

        <div className="flex items-center gap-3">
          <div className="text-right text-xs pr-2 hidden md:block">
            <span className="text-slate-500">Total en módulo:</span>
            <span className="font-bold text-slate-800 ml-1">
              {workItems.length} {workItems.length === 1 ? "item" : "items"}
            </span>
          </div>

          <Button
            onClick={handleOpenLinkModal}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-semibold h-9 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Agregar Work Item</span>
          </Button>
        </div>
      </div>

      {/* Work Items Table */}
      {isLoading ? (
        <div className="py-16 flex flex-col items-center justify-center text-slate-400 gap-2">
          <Loader2 className="size-8 text-indigo-600 animate-spin" />
          <p className="text-xs">Cargando tareas del módulo...</p>
        </div>
      ) : workItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <Boxes className="size-8 text-slate-400 mx-auto mb-2" />
          <h3 className="font-semibold text-slate-900">No hay work items en este módulo</h3>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Vincula tareas existentes del proyecto para dar seguimiento a los entregables de este módulo.
          </p>
          <Button
            onClick={handleOpenLinkModal}
            className="mt-4 bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
          >
            <Plus className="size-3.5 mr-1.5" />
            Agregar Work Item al Módulo
          </Button>
        </div>
      ) : (
        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-sm">
              <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600 uppercase">
                <tr>
                  <th className="py-3 px-4 w-28">ID</th>
                  <th className="py-3 px-4">Título</th>
                  <th className="py-3 px-4 w-32">Tipo</th>
                  <th className="py-3 px-4 w-36">Estado</th>
                  <th className="py-3 px-4 w-32">Prioridad</th>
                  <th className="py-3 px-4 w-28">Estimación</th>
                  <th className="py-3 px-4 w-32">Fecha Límite</th>
                  <th className="py-3 px-4 w-24 text-right">Acciones</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {workItems.map((item) => {
                  const priorityInfo = getPriorityBadge(item.priority);

                  return (
                    <tr
                      key={item.id}
                      onClick={() => setSelectedWorkItemId(item.id)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer group"
                    >
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                          {item.identifier}
                        </span>
                      </td>
                      <td className="py-3 px-4 font-medium text-slate-900">
                        <div className="flex items-center gap-2 max-w-md truncate">
                          <span className="truncate">{item.title}</span>
                          {item.sub_items && item.sub_items.length > 0 && (
                            <span className="inline-flex items-center gap-0.5 text-[10px] text-slate-400 bg-slate-100 px-1.5 py-0.5 rounded shrink-0">
                              <GitBranch className="size-2.5" />
                              {item.sub_items.length}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        {item.type ? (
                          <span
                            className="text-[10px] font-bold px-1.5 py-0.5 rounded"
                            style={{ backgroundColor: `${item.type.color}15`, color: item.type.color }}
                          >
                            {item.type.name}
                          </span>
                        ) : (
                          <span className="text-slate-400 text-xs">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={String(item.state?.id || "")}
                          onValueChange={(val) => handleStateChange(item.id, val)}
                        >
                          <SelectTrigger className="h-7 text-xs bg-transparent border-slate-200">
                            <span
                              className="size-2 rounded-full mr-1.5 shrink-0"
                              style={{ backgroundColor: item.state?.color || "#6366f1" }}
                            />
                            <SelectValue placeholder="Estado">
                              {item.state?.name || "Sin estado"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((st) => (
                              <SelectItem key={st.id} value={String(st.id)}>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: st.color || "#6366f1" }}
                                  />
                                  <span>{st.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", priorityInfo.color)}>
                          {priorityInfo.label}
                        </span>
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                        {item.estimate_value || (item.estimate_points ? `${item.estimate_points} pts` : "-")}
                      </td>
                      <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                        {item.target_date ? (
                          <div className="flex items-center gap-1">
                            <Calendar className="size-3.5 text-slate-400" />
                            <span>{item.target_date}</span>
                          </div>
                        ) : (
                          <span className="text-slate-300">-</span>
                        )}
                      </td>
                      <td className="py-3 px-4 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                        <div className="flex items-center justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => setSelectedWorkItemId(item.id)}
                            className="size-7 text-indigo-600 hover:text-indigo-800 hover:bg-indigo-50"
                            title="Ver detalle"
                          >
                            <Maximize2 className="size-3.5" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleUnlink(item.id)}
                            className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50"
                            title="Desvincular del módulo"
                          >
                            <Unlink className="size-3.5" />
                          </Button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Modal Vincular Work Items al Módulo */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Plus className="size-5 text-indigo-600" />
              <span>Agregar Work Items al Módulo</span>
            </DialogTitle>
            <DialogDescription>
              Selecciona las tareas del proyecto que deseas asociar a <strong>&quot;{module.name}&quot;</strong>.
            </DialogDescription>
          </DialogHeader>

          <div className="py-2 space-y-3 flex-1 overflow-hidden flex flex-col">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                placeholder="Buscar por ID o título..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="border border-slate-200 rounded-lg overflow-y-auto max-h-[340px] divide-y divide-slate-100 flex-1">
              {isLoadingAvailable ? (
                <div className="p-8 flex justify-center items-center">
                  <Loader2 className="size-6 text-indigo-600 animate-spin" />
                </div>
              ) : availableItemsToLink.length === 0 ? (
                <div className="p-8 text-center text-xs text-slate-400">
                  {searchQuery ? "No se encontraron tareas coincidentes" : "No hay tareas pendientes por vincular"}
                </div>
              ) : (
                availableItemsToLink.map((item) => {
                  const isChecked = selectedItemIds.includes(item.id);
                  return (
                    <div
                      key={item.id}
                      onClick={() => handleToggleSelect(item.id)}
                      className={cn(
                        "flex items-center justify-between p-3 cursor-pointer hover:bg-slate-50 transition-colors text-xs",
                        isChecked && "bg-indigo-50/60"
                      )}
                    >
                      <div className="flex items-center gap-3 min-w-0 pr-2">
                        <div
                          className={cn(
                            "size-4 rounded border flex items-center justify-center transition-colors shrink-0",
                            isChecked
                              ? "bg-indigo-600 border-indigo-600 text-white"
                              : "border-slate-300"
                          )}
                        >
                          {isChecked && <Check className="size-3 stroke-[3]" />}
                        </div>
                        <div className="min-w-0">
                          <div className="flex items-center gap-1.5">
                            <span className="font-mono font-semibold text-slate-500">
                              {item.identifier}
                            </span>
                            <span className="font-medium text-slate-900 truncate">
                              {item.title}
                            </span>
                          </div>
                          {item.state && (
                            <span className="text-[10px] text-slate-400">
                              {item.state.name}
                            </span>
                          )}
                        </div>
                      </div>

                      <div className="shrink-0 flex items-center gap-2">
                        {item.priority && (
                          <span className="text-[10px] bg-slate-100 px-1.5 py-0.5 rounded text-slate-600 font-medium">
                            {item.priority}
                          </span>
                        )}
                      </div>
                    </div>
                  );
                })
              )}
            </div>
          </div>

          <DialogFooter className="border-t pt-3">
            <Button variant="outline" size="sm" onClick={() => setIsLinkModalOpen(false)}>
              Cancelar
            </Button>
            <Button
              size="sm"
              onClick={handleConfirmLink}
              disabled={selectedItemIds.length === 0 || isLinking}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isLinking && <Loader2 className="size-3.5 animate-spin mr-1.5" />}
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
          open={Boolean(selectedWorkItemId)}
          onOpenChange={(isOpen) => {
            if (!isOpen) setSelectedWorkItemId(null);
          }}
          onUpdated={() => {
            loadModuleWorkItems();
            onModuleUpdated();
          }}
        />
      )}
    </div>
  );
}
