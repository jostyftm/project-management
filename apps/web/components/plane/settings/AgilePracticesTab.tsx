"use client";

import React, { useState, useEffect } from "react";
import { projectService } from "@/services/plane/projectService";
import { Project, State } from "@/types/plane-types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Target, Layers, Clock, GitMerge, Save, Loader2, Info, AlertTriangle } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface AgilePracticesTabProps {
  projectId: string | number;
  project: Project | null;
  onProjectUpdated: (updated: Project) => void;
}

export function AgilePracticesTab({
  projectId,
  project,
  onProjectUpdated,
}: AgilePracticesTabProps) {
  const [states, setStates] = useState<State[]>([]);
  const [agingDays, setAgingDays] = useState<number>(project?.aging_threshold_days || 5);
  const [autoRollup, setAutoRollup] = useState<boolean>(project?.auto_rollup_parent ?? true);
  const [stateWipLimits, setStateWipLimits] = useState<Record<string, number | "">>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);

  useEffect(() => {
    async function loadStates() {
      try {
        setIsLoading(true);
        const data = await projectService.getStates(projectId);
        setStates(data);
        const initialLimits: Record<string, number | ""> = {};
        data.forEach((s) => {
          initialLimits[String(s.id)] = s.wip_limit !== null && s.wip_limit !== undefined ? s.wip_limit : "";
        });
        setStateWipLimits(initialLimits);
      } catch (err) {
        toast.error("Error al cargar los estados del proyecto");
      } finally {
        setIsLoading(false);
      }
    }
    loadStates();
  }, [projectId]);

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!project) return;
    try {
      setIsSaving(true);

      // 1. Guardar configuraciones a nivel de proyecto
      const updatedProject = await projectService.update(projectId, {
        aging_threshold_days: Number(agingDays) || 5,
        auto_rollup_parent: autoRollup,
      });

      // 2. Guardar límites WIP de cada estado
      const stateUpdatePromises = states.map((state) => {
        const val = stateWipLimits[String(state.id)];
        const wipLimit = val === "" ? null : Number(val);
        if (wipLimit !== state.wip_limit) {
          return projectService.updateState(projectId, state.id, { wip_limit: wipLimit });
        }
        return Promise.resolve(state);
      });

      await Promise.all(stateUpdatePromises);

      onProjectUpdated({
        ...project,
        aging_threshold_days: Number(agingDays) || 5,
        auto_rollup_parent: autoRollup,
      });

      toast.success("Prácticas ágiles actualizadas exitosamente");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al guardar prácticas ágiles");
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading || !project) {
    return (
      <div className="flex flex-col items-center justify-center p-12">
        <Loader2 className="size-6 text-indigo-600 animate-spin mb-2" />
        <p className="text-xs text-slate-500">Cargando configuración ágil...</p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSave} className="space-y-6">
      {/* 1. Límites WIP por Estado */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
              <Layers className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Límites WIP en Estados (Work In Progress)
              </CardTitle>
              <CardDescription className="text-xs">
                Define el número máximo de tareas recomendadas simultáneas en cada columna del tablero Kanban.
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="bg-slate-50 border border-slate-200 rounded-lg p-3 text-xs text-slate-600 flex items-start gap-2">
            <Info className="size-4 text-indigo-600 shrink-0 mt-0.5" />
            <p>
              Los límites WIP en este sistema son <strong>límites blandos (soft limits)</strong>: alertan visualmente en la columna y muestran avisos al superar la capacidad acordada sin bloquear la operativa del equipo.
            </p>
          </div>

          <div className="divide-y divide-slate-100 border border-slate-200 rounded-lg overflow-hidden">
            {states.map((state) => (
              <div
                key={state.id}
                className="flex items-center justify-between p-3 bg-white hover:bg-slate-50/50 transition-colors"
              >
                <div className="flex items-center gap-2.5">
                  <span
                    className="size-3 rounded-full shrink-0"
                    style={{ backgroundColor: state.color || "#6366f1" }}
                  />
                  <div>
                    <span className="text-xs font-semibold text-slate-900 block">
                      {state.name}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">
                      Grupo: {state.group}
                    </span>
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <Label htmlFor={`wip-${state.id}`} className="text-xs text-slate-500 font-medium">
                    Límite WIP:
                  </Label>
                  <Input
                    id={`wip-${state.id}`}
                    type="number"
                    min="0"
                    max="100"
                    placeholder="Sin límite"
                    value={stateWipLimits[String(state.id)]}
                    onChange={(e) => {
                      const val = e.target.value;
                      setStateWipLimits((prev) => ({
                        ...prev,
                        [String(state.id)]: val === "" ? "" : Math.max(0, parseInt(val, 10)),
                      }));
                    }}
                    className="w-24 h-8 text-xs text-right bg-white"
                  />
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* 2. Sincronización Automática Padre / Hijo (Roll-up) */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-emerald-50 text-emerald-600 rounded-lg">
              <GitMerge className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Roll-up Automático Padre / Hijo
              </CardTitle>
              <CardDescription className="text-xs">
                Sincronización de estados entre subtareas e historias de usuario principales
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <label className="flex items-start gap-3 p-3 border border-slate-200 rounded-lg bg-slate-50/50 cursor-pointer hover:bg-slate-50 transition-colors">
            <input
              type="checkbox"
              checked={autoRollup}
              onChange={(e) => setAutoRollup(e.target.checked)}
              className="size-4 text-indigo-600 rounded border-slate-300 focus:ring-indigo-500 mt-0.5"
            />
            <div className="space-y-0.5">
              <span className="text-xs font-semibold text-slate-900 block">
                Completar historia padre automáticamente al finalizar todas sus subtareas
              </span>
              <p className="text-[11px] text-slate-500">
                Cuando todas las subtareas subordinadas alcancen un estado de grupo "COMPLETED" y los criterios de aceptación (DoD) de la historia padre estén aprobados, el elemento padre cambiará automáticamente a completado.
              </p>
            </div>
          </label>
        </CardContent>
      </Card>

      {/* 3. Umbral de Envejecimiento de Tareas (Task Aging) */}
      <Card className="border-slate-200 bg-white">
        <CardHeader>
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-amber-50 text-amber-600 rounded-lg">
              <Clock className="size-4" />
            </div>
            <div>
              <CardTitle className="text-base font-semibold text-slate-900">
                Detección de Tareas Envejecidas (Task Aging)
              </CardTitle>
              <CardDescription className="text-xs">
                Alerta al equipo sobre tareas que pasan demasiado tiempo en progreso sin avanzar
              </CardDescription>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-3">
          <div className="flex items-center justify-between gap-4 max-w-md">
            <div>
              <Label htmlFor="aging-days" className="text-xs font-semibold text-slate-800 block">
                Días de umbral de envejecimiento
              </Label>
              <span className="text-[11px] text-slate-500 block">
                Días en el mismo estado para mostrar alerta en Kanban y Daily Standup
              </span>
            </div>
            <div className="flex items-center gap-1.5">
              <Input
                id="aging-days"
                type="number"
                min="1"
                max="60"
                value={agingDays}
                onChange={(e) => setAgingDays(Math.max(1, parseInt(e.target.value, 10) || 5))}
                className="w-20 h-8 text-xs text-right bg-white"
              />
              <span className="text-xs text-slate-500">días</span>
            </div>
          </div>
        </CardContent>
        <CardFooter className="flex justify-end border-t border-slate-100 pt-4">
          <Button
            type="submit"
            disabled={isSaving}
            className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-9 cursor-pointer"
          >
            {isSaving ? (
              <>
                <Loader2 className="size-3.5 mr-1.5 animate-spin" />
                Guardando...
              </>
            ) : (
              <>
                <Save className="size-3.5 mr-1.5" />
                Guardar Configuración Ágil
              </>
            )}
          </Button>
        </CardFooter>
      </Card>
    </form>
  );
}
