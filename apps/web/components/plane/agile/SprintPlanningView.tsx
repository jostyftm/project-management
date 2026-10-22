"use client";

import React, { useState, useEffect, useMemo } from "react";
import { cycleService } from "@/services/plane/cycleService";
import { workItemService } from "@/services/plane/workItemService";
import { SprintPlanning, SprintPlanningItem, Cycle } from "@/types/plane-types";
import { SprintGoalCard } from "./SprintGoalCard";
import { SprintCapacityMeter } from "./SprintCapacityMeter";
import { ReadinessBadge } from "./ReadinessBadge";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  ArrowRight,
  ArrowLeft,
  ChevronUp,
  ChevronDown,
  Sparkles,
  Search,
  AlertTriangle,
  Layers,
  Calendar,
  CheckCircle2,
  RefreshCw,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface SprintPlanningViewProps {
  projectId: string | number;
  cycleId: string | number;
  isAdmin?: boolean;
}

export function SprintPlanningView({
  projectId,
  cycleId,
  isAdmin = true,
}: SprintPlanningViewProps) {
  const [data, setData] = useState<SprintPlanning | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [searchBacklog, setSearchBacklog] = useState("");
  const [searchSprint, setSearchSprint] = useState("");
  const [warningItem, setWarningItem] = useState<SprintPlanningItem | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  const loadPlanning = async () => {
    try {
      setIsLoading(true);
      const res = await cycleService.planning(cycleId);
      setData(res);
    } catch (err: any) {
      toast.error(err?.message || "Error al cargar la planificación del Sprint");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadPlanning();
  }, [cycleId]);

  const handleUpdateSprintGoal = async (newGoal: string) => {
    await cycleService.update(cycleId, { sprint_goal: newGoal });
    if (data) {
      setData({
        ...data,
        sprint_goal: newGoal,
        cycle: { ...data.cycle, sprint_goal: newGoal },
      });
    }
  };

  const handleAddToSprint = async (item: SprintPlanningItem, force = false) => {
    if (!force && !item.dor.is_ready) {
      setWarningItem(item);
      return;
    }

    try {
      setIsProcessing(true);
      await cycleService.addWorkItems(cycleId, [item.id]);
      toast.success(`«${item.title}» agregada al Sprint`);
      setWarningItem(null);
      await loadPlanning();
    } catch (err: any) {
      toast.error(err?.message || "Error al agregar la tarea al Sprint");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleRemoveFromSprint = async (item: SprintPlanningItem) => {
    try {
      setIsProcessing(true);
      await cycleService.removeWorkItem(cycleId, item.id);
      toast.success(`«${item.title}» devuelta al Backlog`);
      await loadPlanning();
    } catch (err: any) {
      toast.error(err?.message || "Error al remover la tarea del Sprint");
    } finally {
      setIsProcessing(false);
    }
  };

  const handleMoveOrder = async (item: SprintPlanningItem, direction: "up" | "down") => {
    if (!data?.backlog) return;
    const items = [...data.backlog];
    const currentIndex = items.findIndex((it) => String(it.id) === String(item.id));
    if (currentIndex < 0) return;

    const targetIndex = direction === "up" ? currentIndex - 1 : currentIndex + 1;
    if (targetIndex < 0 || targetIndex >= items.length) return;

    // Intercambiar posiciones
    const temp = items[currentIndex];
    items[currentIndex] = items[targetIndex];
    items[targetIndex] = temp;

    // Actualizar estado local inmediatamente para respuesta instantánea
    setData({
      ...data,
      backlog: items,
    });

    try {
      // Re-asignar ordenes consecutivos multiplicados por 1000
      const payloadItems = items.map((it, idx) => ({
        id: it.id,
        order: (idx + 1) * 1000,
      }));

      await workItemService.reorder(projectId, { items: payloadItems });
    } catch (err: any) {
      toast.error("Error al persistir el reordenamiento del backlog");
      await loadPlanning();
    }
  };

  const handleAddSuggestions = async () => {
    if (!data?.suggestions || data.suggestions.length === 0) return;
    try {
      setIsProcessing(true);
      const ids = data.suggestions.map((s) => s.id);
      await cycleService.addWorkItems(cycleId, ids);
      toast.success(`${ids.length} tareas sugeridas añadidas al Sprint`);
      await loadPlanning();
    } catch (err: any) {
      toast.error(err?.message || "Error al agregar sugerencias");
    } finally {
      setIsProcessing(false);
    }
  };

  const filteredBacklog = useMemo(() => {
    if (!data?.backlog) return [];
    if (!searchBacklog.trim()) return data.backlog;
    const term = searchBacklog.toLowerCase();
    return data.backlog.filter(
      (i) =>
        i.title.toLowerCase().includes(term) ||
        i.identifier.toLowerCase().includes(term)
    );
  }, [data?.backlog, searchBacklog]);

  const filteredSprintItems = useMemo(() => {
    if (!data?.sprint_items) return [];
    if (!searchSprint.trim()) return data.sprint_items;
    const term = searchSprint.toLowerCase();
    return data.sprint_items.filter(
      (i) =>
        i.title.toLowerCase().includes(term) ||
        i.identifier.toLowerCase().includes(term)
    );
  }, [data?.sprint_items, searchSprint]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw className="size-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-medium text-slate-600">Calculando capacidad y analizando Definition of Ready...</p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        No se pudo cargar la información del Sprint.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header con Sprint Goal */}
      <SprintGoalCard
        sprintGoal={data.sprint_goal}
        cycleId={cycleId}
        canEdit={isAdmin}
        onUpdateGoal={handleUpdateSprintGoal}
      />

      {/* 2. Capacidad y Velocidad */}
      <SprintCapacityMeter
        capacity={data.capacity}
        velocity={data.velocity}
        members={data.members}
      />

      {/* 3. Sugerencias Inteligentes */}
      {data.suggestions && data.suggestions.length > 0 && (
        <div className="bg-gradient-to-r from-purple-50 via-indigo-50/50 to-white border border-purple-200/80 rounded-xl p-3.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-1.5 bg-purple-600 text-white rounded-lg">
              <Sparkles className="size-4" />
            </div>
            <div>
              <h5 className="text-xs font-bold text-purple-900">
                Sugerencia Inteligente de Capacidad
              </h5>
              <p className="text-[11px] text-purple-700">
                Hay {data.suggestions.length} tareas priorizadas listas (DoR) que calzan con los {data.capacity.remaining} pts disponibles.
              </p>
            </div>
          </div>
          <Button
            size="sm"
            onClick={handleAddSuggestions}
            disabled={isProcessing}
            className="bg-purple-600 hover:bg-purple-700 text-white text-xs shrink-0 cursor-pointer"
          >
            <Sparkles className="size-3 mr-1" />
            Llenar Capacidad ({data.suggestions.reduce((a, b) => a + (b.estimate_points || 0), 0)} pts)
          </Button>
        </div>
      )}

      {/* 4. Columnas Gemelas: Backlog vs Sprint Scope */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6 items-start">
        {/* Columna Izquierda: Product Backlog Stack-Ranked */}
        <div className="bg-slate-50/70 border border-slate-200 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Layers className="size-4 text-slate-500" />
              <h3 className="text-sm font-bold text-slate-800">
                Product Backlog Priorizado ({data.backlog?.length || 0})
              </h3>
            </div>
            <span className="text-[11px] text-slate-500 font-medium">Stack Ranking Ágil</span>
          </div>

          <div className="relative">
            <Search className="size-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={searchBacklog}
              onChange={(e) => setSearchBacklog(e.target.value)}
              placeholder="Buscar en el backlog..."
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredBacklog.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-lg">
                No hay tareas en el backlog.
              </div>
            ) : (
              filteredBacklog.map((item, idx) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs hover:border-indigo-300 transition-all flex items-center justify-between gap-2.5 group"
                >
                  {/* Reordenamiento Stack Ranking */}
                  <div className="flex items-center gap-1.5 shrink-0">
                    <span className="w-5 text-center text-[11px] font-bold text-slate-400">
                      #{idx + 1}
                    </span>
                    <div className="flex flex-col opacity-0 group-hover:opacity-100 transition-opacity">
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(item, "up")}
                        disabled={idx === 0}
                        className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                        title="Subir prioridad"
                      >
                        <ChevronUp className="size-3" />
                      </button>
                      <button
                        type="button"
                        onClick={() => handleMoveOrder(item, "down")}
                        disabled={idx === filteredBacklog.length - 1}
                        className="p-0.5 text-slate-400 hover:text-indigo-600 disabled:opacity-20 cursor-pointer"
                        title="Bajar prioridad"
                      >
                        <ChevronDown className="size-3" />
                      </button>
                    </div>
                  </div>

                  {/* Detalle Tarea */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.identifier}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <ReadinessBadge readiness={item.dor} />

                      {item.estimate_points ? (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          {item.estimate_points} pts
                        </span>
                      ) : (
                        <span className="text-[10px] text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded border border-amber-200">
                          Sin estimar
                        </span>
                      )}

                      {item.is_blocked && (
                        <span className="text-[10px] font-bold text-red-700 bg-red-50 px-1.5 py-0.5 rounded border border-red-200">
                          ⛔ Bloqueada
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Botón mover a Sprint */}
                  <Button
                    size="sm"
                    variant="outline"
                    className="h-8 px-2 text-xs text-indigo-600 border-indigo-200 hover:bg-indigo-50 shrink-0 cursor-pointer"
                    onClick={() => handleAddToSprint(item)}
                    disabled={isProcessing}
                    title="Planificar en este Sprint"
                  >
                    <ArrowRight className="size-3.5" />
                  </Button>
                </div>
              ))
            )}
          </div>
        </div>

        {/* Columna Derecha: Sprint Scope */}
        <div className="bg-indigo-50/40 border border-indigo-200/80 rounded-xl p-4 space-y-3">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2">
              <Calendar className="size-4 text-indigo-600" />
              <h3 className="text-sm font-bold text-slate-900">
                Alcance del Sprint ({data.sprint_items?.length || 0} tareas)
              </h3>
            </div>
            <span className="text-xs font-bold text-indigo-700">
              {data.capacity.committed} pts comprometidos
            </span>
          </div>

          <div className="relative">
            <Search className="size-3.5 text-slate-400 absolute left-2.5 top-2.5" />
            <Input
              value={searchSprint}
              onChange={(e) => setSearchSprint(e.target.value)}
              placeholder="Buscar en el sprint..."
              className="pl-8 h-8 text-xs bg-white"
            />
          </div>

          <div className="space-y-2 max-h-[600px] overflow-y-auto pr-1">
            {filteredSprintItems.length === 0 ? (
              <div className="p-8 text-center text-xs text-slate-400 bg-white border border-dashed border-indigo-200 rounded-lg">
                El Sprint está vacío. Añade historias desde el backlog para comprometer capacidad.
              </div>
            ) : (
              filteredSprintItems.map((item) => (
                <div
                  key={item.id}
                  className="bg-white border border-slate-200 rounded-lg p-3 shadow-xs hover:border-slate-300 transition-all flex items-center justify-between gap-2.5"
                >
                  {/* Botón quitar del Sprint */}
                  <Button
                    size="sm"
                    variant="ghost"
                    className="h-8 px-2 text-xs text-slate-400 hover:text-red-600 hover:bg-red-50 shrink-0 cursor-pointer"
                    onClick={() => handleRemoveFromSprint(item)}
                    disabled={isProcessing}
                    title="Regresar al Backlog"
                  >
                    <ArrowLeft className="size-3.5" />
                  </Button>

                  {/* Detalle Tarea */}
                  <div className="flex-1 min-w-0 space-y-1">
                    <div className="flex items-center gap-2">
                      <span className="text-[11px] font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.2 rounded">
                        {item.identifier}
                      </span>
                      <h4 className="text-xs font-semibold text-slate-900 truncate">
                        {item.title}
                      </h4>
                    </div>

                    <div className="flex items-center gap-2 flex-wrap">
                      <ReadinessBadge readiness={item.dor} />

                      {item.estimate_points ? (
                        <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 py-0.5 rounded">
                          {item.estimate_points} pts
                        </span>
                      ) : null}

                      {item.state && (
                        <span
                          className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
                          style={{
                            backgroundColor: `${item.state.color}15`,
                            color: item.state.color,
                          }}
                        >
                          {item.state.name}
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </div>
      </div>

      {/* Modal de Advertencia de DoR Incompleta */}
      <Dialog open={!!warningItem} onOpenChange={(open) => !open && setWarningItem(null)}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <div className="flex items-center gap-2">
              <div className="p-2 bg-amber-100 rounded-lg text-amber-700">
                <AlertTriangle className="size-5" />
              </div>
              <div>
                <DialogTitle className="text-base font-semibold text-slate-900">
                  Definición de Ready (DoR) Incompleta
                </DialogTitle>
                <DialogDescription className="text-xs text-slate-500">
                  {warningItem?.identifier} - {warningItem?.title}
                </DialogDescription>
              </div>
            </div>
          </DialogHeader>

          <div className="py-2 space-y-3">
            <p className="text-xs text-slate-600">
              Esta historia no cumple con todos los criterios de la <strong>Definition of Ready</strong> para entrar a un Sprint activo:
            </p>

            <div className="bg-amber-50 border border-amber-200 rounded-lg p-3">
              <ul className="space-y-1.5 text-xs text-amber-900">
                {(warningItem?.dor?.reasons || warningItem?.dor?.missing || []).map((r, i) => (
                  <li key={i} className="flex items-start gap-1.5">
                    <span className="text-amber-500 font-bold">•</span>
                    <span>{r}</span>
                  </li>
                ))}
              </ul>
            </div>

            <p className="text-xs text-slate-500 italic">
              Se recomienda estimarla o completar la descripción antes de comprometerla. ¿Deseas ingresarla de todos modos?
            </p>
          </div>

          <DialogFooter className="flex items-center justify-between sm:justify-between">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              className="text-xs"
              onClick={() => setWarningItem(null)}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              size="sm"
              className="bg-amber-600 hover:bg-amber-700 text-white text-xs cursor-pointer"
              onClick={() => warningItem && handleAddToSprint(warningItem, true)}
              disabled={isProcessing}
            >
              Incluir de todos modos
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
