"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { Cycle, Project, State, WorkItem } from "@/types/plane-types";
import { workItemService } from "@/services/plane/workItemService";
import { cycleService } from "@/services/plane/cycleService";
import { WorkItemDetailSheet } from "@/components/plane/WorkItemDetailSheet";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  Layers,
  Plus,
  Search,
  Trash2,
  CheckCircle2,
  Clock,
  Circle,
  AlertCircle,
  Loader2,
  Check,
  Calendar,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface CycleWorkItemsSectionProps {
  cycle: Cycle;
  projectId: string | number;
  project: Project | null;
  states: State[];
  onStatsChanged: () => void;
  className?: string;
}

const getPriorityBadge = (priority?: string) => {
  switch (priority) {
    case "URGENT":
      return { label: "Urgente", color: "bg-red-50 text-red-700 border-red-200 dark:bg-red-950/40 dark:text-red-300 dark:border-red-900/40" };
    case "HIGH":
      return { label: "Alta", color: "bg-orange-50 text-orange-700 border-orange-200 dark:bg-orange-950/40 dark:text-orange-300 dark:border-orange-900/40" };
    case "MEDIUM":
      return { label: "Media", color: "bg-amber-50 text-amber-700 border-amber-200 dark:bg-amber-950/40 dark:text-amber-300 dark:border-amber-900/40" };
    case "LOW":
      return { label: "Baja", color: "bg-blue-50 text-blue-700 border-blue-200 dark:bg-blue-950/40 dark:text-blue-300 dark:border-blue-900/40" };
    default:
      return { label: "Ninguna", color: "bg-slate-50 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700" };
  }
};

export function CycleWorkItemsSection({
  cycle,
  projectId,
  project,
  states,
  onStatsChanged,
  className,
}: CycleWorkItemsSectionProps) {
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [selectedWorkItemId, setSelectedWorkItemId] = useState<string | number | null>(null);

  // Modal para vincular work items existentes
  const [isLinkModalOpen, setIsLinkModalOpen] = useState(false);
  const [availableItems, setAvailableItems] = useState<WorkItem[]>([]);
  const [isLoadingAvailable, setIsLoadingAvailable] = useState(false);
  const [selectedItemIds, setSelectedItemIds] = useState<(string | number)[]>([]);
  const [searchQuery, setSearchQuery] = useState("");
  const [isLinking, setIsLinking] = useState(false);
  const isAdmin = project?.current_user_role === "ADMIN";

  const loadCycleWorkItems = useCallback(async () => {
    if (!cycle?.id) return;
    setIsLoading(true);
    try {
      const items = await workItemService.list(projectId, { cycle_id: cycle.id });
      setWorkItems(items);
    } catch {
      toast.error("Error al cargar los work items del ciclo");
    } finally {
      setIsLoading(false);
    }
  }, [cycle?.id, projectId]);

  useEffect(() => {
    loadCycleWorkItems();
  }, [loadCycleWorkItems]);

  const handleStateChange = async (itemId: string | number, newStateId: string | number) => {
    const targetState = states.find((s) => String(s.id) === String(newStateId));
    // Optimistic update
    setWorkItems((prev) =>
      prev.map((item) =>
        String(item.id) === String(itemId)
          ? { ...item, state: targetState }
          : item
      )
    );

    try {
      await workItemService.update(itemId, { state_id: newStateId });
      toast.success(`Estado actualizado a ${targetState?.name || "nuevo estado"}`);
      onStatsChanged();
    } catch {
      toast.error("Error al actualizar el estado");
      loadCycleWorkItems();
    }
  };

  const handleRemoveWorkItem = async (itemId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await cycleService.removeWorkItem(cycle.id, itemId);
      setWorkItems((prev) => prev.filter((item) => String(item.id) !== String(itemId)));
      toast.success("Work item removido del ciclo");
      onStatsChanged();
    } catch {
      toast.error("Error al desvincular el work item");
    }
  };

  const handleOpenLinkModal = async () => {
    setIsLinkModalOpen(true);
    setIsLoadingAvailable(true);
    setSelectedItemIds([]);
    setSearchQuery("");
    try {
      const allItems = await workItemService.list(projectId);
      // Filtrar los que ya están en este ciclo
      const currentIds = new Set(workItems.map((w) => String(w.id)));
      const filtered = allItems.filter((w) => !currentIds.has(String(w.id)));
      setAvailableItems(filtered);
    } catch {
      toast.error("Error al cargar tareas disponibles");
    } finally {
      setIsLoadingAvailable(false);
    }
  };

  const handleToggleSelect = (id: string | number) => {
    setSelectedItemIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const handleSelectAllVisible = () => {
    const visibleIds = filteredAvailableItems.map((it) => it.id);
    const allSelected = visibleIds.every((id) => selectedItemIds.includes(id));
    if (allSelected) {
      setSelectedItemIds((prev) => prev.filter((id) => !visibleIds.includes(id)));
    } else {
      setSelectedItemIds((prev) => Array.from(new Set([...prev, ...visibleIds])));
    }
  };

  const handleConfirmLink = async () => {
    if (selectedItemIds.length === 0) return;
    setIsLinking(true);
    try {
      await cycleService.addWorkItems(cycle.id, selectedItemIds);
      toast.success(`${selectedItemIds.length} work items vinculados al ciclo`);
      setIsLinkModalOpen(false);
      setSelectedItemIds([]);
      await loadCycleWorkItems();
      onStatsChanged();
    } catch {
      toast.error("Error al vincular los work items");
    } finally {
      setIsLinking(false);
    }
  };

  const filteredAvailableItems = useMemo(() => {
    if (!searchQuery.trim()) return availableItems;
    const q = searchQuery.toLowerCase();
    return availableItems.filter(
      (it) =>
        it.title.toLowerCase().includes(q) ||
        (it.identifier && it.identifier.toLowerCase().includes(q))
    );
  }, [availableItems, searchQuery]);

  return (
    <div className={cn("space-y-4", className)}>
      {/* Encabezado de la sección */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 pt-2">
        <div className="flex items-center gap-2.5">
          <Layers className="size-5 text-indigo-600 dark:text-indigo-400" />
          <h3 className="text-base font-bold text-slate-900 dark:text-slate-100">
            Work Items asignados al Ciclo
          </h3>
          <span className="inline-flex items-center px-2 py-0.5 rounded-full text-xs font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/60 dark:text-indigo-300 border border-indigo-200 dark:border-indigo-800">
            {workItems.length}
          </span>
        </div>

        <Button
          size="sm"
          onClick={handleOpenLinkModal}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs"
        >
          <Plus className="size-3.5 mr-1.5" />
          Vincular Work Items
        </Button>
      </div>

      {/* Lista / Tabla de Work Items */}
      {isLoading ? (
        <div className="py-12 flex flex-col items-center justify-center text-slate-400">
          <Loader2 className="size-6 animate-spin text-indigo-600 mb-2" />
          <p className="text-xs">Cargando tareas del ciclo...</p>
        </div>
      ) : workItems.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 dark:border-slate-800 p-8 text-center bg-white dark:bg-slate-900/60">
          <Layers className="size-8 text-slate-400 mx-auto mb-2 opacity-60" />
          <h4 className="text-sm font-semibold text-slate-800 dark:text-slate-200">
            No hay work items en este ciclo
          </h4>
          <p className="text-xs text-slate-500 mt-1 max-w-md mx-auto">
            Vincula tareas existentes del proyecto para que la gráfica de Burn-down y las métricas de avance proyecten el sprint.
          </p>
          {isAdmin && (
            <Button
              size="sm"
              variant="outline"
              onClick={handleOpenLinkModal}
              className="mt-4 border-indigo-200 dark:border-indigo-800 text-indigo-700 dark:text-indigo-300 hover:bg-indigo-50"
            >
              <Plus className="size-3.5 mr-1.5" />
              Vincular Work Items
            </Button>
          )}
        </div>
      ) : (
        <div className="rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 overflow-hidden shadow-2xs divide-y divide-slate-100 dark:divide-slate-800">
          {workItems.map((item) => {
            const priorityInfo = getPriorityBadge(item.priority);
            const currentStateId = item.state ? String(item.state.id) : "";

            return (
              <div
                key={item.id}
                onClick={() => setSelectedWorkItemId(item.id)}
                className="group flex flex-col sm:flex-row sm:items-center justify-between p-3 sm:px-4 gap-3 hover:bg-slate-50/80 dark:hover:bg-slate-800/50 cursor-pointer transition-colors"
              >
                {/* Izquierda: Identificador + Título */}
                <div className="flex items-center gap-3 min-w-0 flex-1">
                  <span className="font-mono text-xs font-semibold px-2 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400 shrink-0">
                    {item.identifier || `#${item.sequence_id}`}
                  </span>

                  <span className="text-xs sm:text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
                    {item.title}
                  </span>
                </div>

                {/* Derecha: Selector de Estado, Puntos, Prioridad y Acciones */}
                <div
                  className="flex items-center flex-wrap gap-2.5 shrink-0"
                  onClick={(e) => e.stopPropagation()}
                >
                  {/* Selector interactivo de estado */}
                  <Select
                    value={currentStateId}
                    disabled={!isAdmin}
                    onValueChange={(val) => handleStateChange(item.id, val)}
                  >
                    <SelectTrigger className="h-7 text-xs px-2.5 py-0 w-36 bg-white dark:bg-slate-900 border-slate-200 dark:border-slate-700 shadow-2xs disabled:opacity-75 disabled:cursor-not-allowed">
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

                  {/* Prioridad */}
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-2 py-0.5 rounded border shrink-0",
                      priorityInfo.color
                    )}
                  >
                    {priorityInfo.label}
                  </span>

                  {/* Puntos de estimación */}
                  {item.estimate_points !== null && item.estimate_points !== undefined && (
                    <span className="text-[11px] font-mono font-bold px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300 shrink-0">
                      {item.estimate_points} pts
                    </span>
                  )}

                  {/* Botón remover del ciclo */}
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={(e) => handleRemoveWorkItem(item.id, e)}
                      className="size-7 text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/50 rounded-md transition"
                      title="Remover tarea del ciclo"
                    >
                      <Trash2 className="size-3.5" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal para Vincular Work Items al Ciclo */}
      <Dialog open={isLinkModalOpen} onOpenChange={setIsLinkModalOpen}>
        <DialogContent className="sm:max-w-xl max-h-[85vh] flex flex-col">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Layers className="size-5 text-indigo-600" />
              Vincular Work Items a {cycle.name}
            </DialogTitle>
            <DialogDescription>
              Selecciona las tareas del proyecto que formarán parte de esta iteración.
            </DialogDescription>
          </DialogHeader>

          {/* Buscador y selector rápido */}
          <div className="space-y-3 pt-2">
            <div className="relative">
              <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                placeholder="Buscar por título o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 text-xs"
              />
            </div>

            <div className="flex items-center justify-between text-xs text-slate-500 px-1">
              <span>{filteredAvailableItems.length} tareas disponibles</span>
              <button
                type="button"
                onClick={handleSelectAllVisible}
                className="text-indigo-600 hover:underline font-medium"
              >
                {filteredAvailableItems.length > 0 &&
                filteredAvailableItems.every((it) => selectedItemIds.includes(it.id))
                  ? "Deseleccionar visibles"
                  : "Seleccionar visibles"}
              </button>
            </div>
          </div>

          {/* Lista de selección */}
          <div className="flex-1 overflow-y-auto min-h-[220px] max-h-[340px] border border-slate-200 dark:border-slate-800 rounded-lg divide-y divide-slate-100 dark:divide-slate-800">
            {isLoadingAvailable ? (
              <div className="py-12 flex justify-center items-center text-slate-400">
                <Loader2 className="size-6 animate-spin text-indigo-600" />
              </div>
            ) : filteredAvailableItems.length === 0 ? (
              <div className="py-10 text-center text-xs text-slate-500">
                No hay tareas disponibles para vincular con ese filtro.
              </div>
            ) : (
              filteredAvailableItems.map((item) => {
                const isSelected = selectedItemIds.includes(item.id);
                return (
                  <div
                    key={item.id}
                    onClick={() => handleToggleSelect(item.id)}
                    className={cn(
                      "flex items-center justify-between p-3 gap-3 cursor-pointer text-xs transition-colors",
                      isSelected
                        ? "bg-indigo-50/70 dark:bg-indigo-950/40"
                        : "hover:bg-slate-50 dark:hover:bg-slate-800/50"
                    )}
                  >
                    <div className="flex items-center gap-2.5 min-w-0 flex-1">
                      <div
                        className={cn(
                          "size-4 rounded border flex items-center justify-center transition-colors shrink-0",
                          isSelected
                            ? "bg-indigo-600 border-indigo-600 text-white"
                            : "border-slate-300 dark:border-slate-700 bg-white dark:bg-slate-900"
                        )}
                      >
                        {isSelected && <Check className="size-3" />}
                      </div>

                      <span className="font-mono text-[11px] font-semibold text-slate-500 shrink-0">
                        {item.identifier || `#${item.sequence_id}`}
                      </span>

                      <span className="font-medium text-slate-900 dark:text-slate-100 truncate">
                        {item.title}
                      </span>
                    </div>

                    <div className="flex items-center gap-2 shrink-0">
                      {item.state && (
                        <div className="flex items-center gap-1.5 text-[11px] text-slate-600 dark:text-slate-300">
                          <span
                            className="size-2 rounded-full shrink-0"
                            style={{ backgroundColor: item.state.color }}
                          />
                          <span>{item.state.name}</span>
                        </div>
                      )}

                      {item.estimate_points !== null && item.estimate_points !== undefined && (
                        <span className="text-[10px] font-mono px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-300">
                          {item.estimate_points} pts
                        </span>
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
              onClick={() => setIsLinkModalOpen(false)}
            >
              Cancelar
            </Button>
            <Button
              onClick={handleConfirmLink}
              disabled={isLinking || selectedItemIds.length === 0}
              className="bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              {isLinking ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
              Vincular ({selectedItemIds.length})
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Sheet de Detalle del Work Item para edición completa */}
      <WorkItemDetailSheet
        workItemId={selectedWorkItemId}
        project={project}
        states={states}
        availableItems={workItems}
        open={!!selectedWorkItemId}
        onOpenChange={(open) => !open && setSelectedWorkItemId(null)}
        onUpdated={() => {
          loadCycleWorkItems();
          onStatsChanged();
        }}
      />
    </div>
  );
}
