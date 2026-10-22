"use client";

import React, { useState, useEffect } from "react";
import { standupService } from "@/services/plane/standupService";
import { DailyStandup, DailyStandupMember } from "@/types/plane-types";
import {
  Calendar,
  ShieldAlert,
  Clock,
  Users,
  CheckCircle2,
  GitCommit,
  AlertOctagon,
  ArrowRight,
  RefreshCw,
  Target,
  Sparkles,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DailyStandupViewProps {
  projectId: string | number;
}

export function DailyStandupView({ projectId }: DailyStandupViewProps) {
  const [data, setData] = useState<DailyStandup | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [selectedDate, setSelectedDate] = useState<string>(
    new Date().toISOString().split("T")[0]
  );

  const loadStandup = async (dateStr?: string) => {
    try {
      setIsLoading(true);
      const res = await standupService.getDailyStandup(projectId, {
        date: dateStr || selectedDate,
      });
      setData(res);
    } catch (err: any) {
      toast.error(err?.message || "Error al generar el Daily Standup");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadStandup(selectedDate);
  }, [projectId, selectedDate]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center p-16 space-y-3">
        <RefreshCw className="size-8 text-indigo-500 animate-spin" />
        <p className="text-sm font-medium text-slate-600">
          Sintetizando actividades de ayer, tareas en curso y bloqueos...
        </p>
      </div>
    );
  }

  if (!data) {
    return (
      <div className="p-8 text-center text-sm text-slate-500">
        No se pudo obtener la información del Daily Standup.
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* 1. Header con Sprint Activo y Selector de Fecha */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-white border border-slate-200 rounded-xl shadow-xs">
        <div className="space-y-1">
          <div className="flex items-center gap-2">
            <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-indigo-50 text-indigo-700 border border-indigo-200">
              Daily Standup Asistido
            </span>
            {data.cycle && (
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1">
                <Target className="size-3.5 text-indigo-600" />
                {data.cycle.name}
              </span>
            )}
          </div>
          {data.cycle?.sprint_goal ? (
            <p className="text-xs text-slate-600 italic">
              <strong>Meta del Sprint:</strong> {data.cycle.sprint_goal}
            </p>
          ) : (
            <p className="text-xs text-slate-500">
              Reporte diario automático basado en actividades del equipo y commits de GitHub.
            </p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
            <Calendar className="size-3.5 text-slate-500" />
            <input
              type="date"
              value={selectedDate}
              onChange={(e) => setSelectedDate(e.target.value)}
              className="text-xs bg-transparent border-none focus:outline-hidden text-slate-800 font-medium"
            />
          </div>
          <Button
            size="sm"
            variant="outline"
            className="text-xs h-8"
            onClick={() => loadStandup(selectedDate)}
          >
            <RefreshCw className="size-3 mr-1" />
            Actualizar
          </Button>
        </div>
      </div>

      {/* 2. Tarjetas de Resumen KPI */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Miembros Participantes */}
        <div className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs flex items-center gap-3">
          <div className="p-2.5 bg-blue-50 text-blue-600 rounded-lg">
            <Users className="size-5" />
          </div>
          <div>
            <span className="text-xs font-semibold text-slate-500 block">Miembros en el Equipo</span>
            <span className="text-xl font-bold text-slate-900">{data.summary.total_members}</span>
          </div>
        </div>

        {/* Impedimentos Activos */}
        <div
          className={cn(
            "border rounded-xl p-4 shadow-xs flex items-center gap-3 transition-colors",
            data.summary.total_blockers > 0
              ? "bg-red-50/60 border-red-200 text-red-900"
              : "bg-white border-slate-200"
          )}
        >
          <div
            className={cn(
              "p-2.5 rounded-lg",
              data.summary.total_blockers > 0
                ? "bg-red-100 text-red-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            <AlertOctagon className="size-5" />
          </div>
          <div>
            <span className="text-xs font-semibold block text-slate-500">Impedimentos / Bloqueos</span>
            <span
              className={cn(
                "text-xl font-bold",
                data.summary.total_blockers > 0 ? "text-red-700" : "text-slate-900"
              )}
            >
              {data.summary.total_blockers} {data.summary.total_blockers === 1 ? "tarea bloqueada" : "tareas bloqueadas"}
            </span>
          </div>
        </div>

        {/* Tareas Envejecidas */}
        <div
          className={cn(
            "border rounded-xl p-4 shadow-xs flex items-center gap-3 transition-colors",
            data.summary.aging_items_count > 0
              ? "bg-amber-50/60 border-amber-200 text-amber-900"
              : "bg-white border-slate-200"
          )}
        >
          <div
            className={cn(
              "p-2.5 rounded-lg",
              data.summary.aging_items_count > 0
                ? "bg-amber-100 text-amber-700"
                : "bg-slate-100 text-slate-500"
            )}
          >
            <Clock className="size-5" />
          </div>
          <div>
            <span className="text-xs font-semibold block text-slate-500">Tareas Envejecidas (WIP Lento)</span>
            <span
              className={cn(
                "text-xl font-bold",
                data.summary.aging_items_count > 0 ? "text-amber-800" : "text-slate-900"
              )}
            >
              {data.summary.aging_items_count} {data.summary.aging_items_count === 1 ? "estancada" : "estancadas"}
            </span>
          </div>
        </div>
      </div>

      {/* 3. Resumen Individual por Miembro (Las 3 Preguntas de Scrum) */}
      <div className="space-y-4">
        <h3 className="text-sm font-bold text-slate-800 flex items-center gap-2">
          <span>Actualización por Miembro del Equipo</span>
          <span className="text-xs font-medium text-slate-500">({data.members.length})</span>
        </h3>

        {data.members.length === 0 ? (
          <div className="p-8 text-center text-xs text-slate-400 bg-white border border-dashed border-slate-200 rounded-xl">
            No hay miembros registrados en este proyecto.
          </div>
        ) : (
          data.members.map((member) => (
            <div
              key={member.user.id}
              className="bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-4 hover:border-slate-300 transition-colors"
            >
              {/* Header Miembro */}
              <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                <div className="flex items-center gap-2.5">
                  <div className="size-8 rounded-full bg-indigo-100 text-indigo-700 font-bold flex items-center justify-center text-xs">
                    {member.user.name.charAt(0).toUpperCase()}
                  </div>
                  <div>
                    <h4 className="text-sm font-bold text-slate-900 leading-tight">
                      {member.user.name}
                    </h4>
                    <span className="text-[11px] text-slate-500">{member.user.email}</span>
                  </div>
                </div>

                <span className="text-[11px] font-semibold px-2 py-0.5 rounded-full bg-slate-100 text-slate-600">
                  {member.role}
                </span>
              </div>

              {/* Las 3 Columnas Clásicas de Scrum */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                {/* 1. ¿Qué se hizo ayer / recientemente? */}
                <div className="bg-slate-50/70 border border-slate-200/70 rounded-lg p-3 space-y-2">
                  <span className="text-xs font-bold text-slate-700 flex items-center gap-1.5 pb-1 border-b border-slate-200/50">
                    <CheckCircle2 className="size-3.5 text-emerald-600" />
                    1. ¿Qué hice ayer?
                  </span>

                  {member.yesterday.items.length === 0 && (!member.yesterday.commits || member.yesterday.commits.length === 0) ? (
                    <p className="text-xs text-slate-400 italic">Sin tareas cerradas ni actividades registradas en la ventana anterior.</p>
                  ) : (
                    <div className="space-y-2">
                      {member.yesterday.items.map((it) => (
                        <div key={it.id} className="text-xs bg-white border border-slate-200 rounded p-2 shadow-2xs">
                          <span className="font-mono font-semibold text-[10px] text-slate-500 block">
                            {it.identifier}
                          </span>
                          <span className="font-medium text-slate-800 line-clamp-1">{it.title}</span>
                        </div>
                      ))}

                      {member.yesterday.commits && member.yesterday.commits.length > 0 && (
                        <div className="pt-1 space-y-1">
                          <span className="text-[10px] font-semibold text-slate-500 uppercase tracking-wider flex items-center gap-1">
                            <GitCommit className="size-3 text-slate-400" /> Commits en GitHub:
                          </span>
                          {member.yesterday.commits.map((c, i) => (
                            <div key={i} className="text-[11px] text-slate-600 truncate bg-white/80 px-1.5 py-0.5 rounded border border-slate-100 font-mono">
                              <span className="text-indigo-600 font-bold">{c.hash.substring(0, 7)}</span> {c.message}
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. ¿Qué se hará hoy? */}
                <div className="bg-indigo-50/40 border border-indigo-200/60 rounded-lg p-3 space-y-2">
                  <span className="text-xs font-bold text-indigo-900 flex items-center gap-1.5 pb-1 border-b border-indigo-200/50">
                    <ArrowRight className="size-3.5 text-indigo-600" />
                    2. ¿Qué haré hoy?
                  </span>

                  {member.today.items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">Sin tareas activas asignadas en curso.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {member.today.items.map((it) => (
                        <div
                          key={it.id}
                          className={cn(
                            "text-xs bg-white border rounded p-2 shadow-2xs space-y-1",
                            it.is_aging ? "border-amber-300 ring-1 ring-amber-200" : "border-slate-200"
                          )}
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-mono font-semibold text-[10px] text-slate-500">
                              {it.identifier}
                            </span>
                            {it.is_aging && (
                              <span className="text-[10px] font-bold text-amber-800 bg-amber-100 px-1.5 py-0.2 rounded flex items-center gap-0.5">
                                <Clock className="size-2.5" /> Envejecida ({it.days_in_state}d)
                              </span>
                            )}
                          </div>
                          <span className="font-medium text-slate-900 line-clamp-1 block">{it.title}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* 3. ¿Qué bloqueos existen? */}
                <div
                  className={cn(
                    "border rounded-lg p-3 space-y-2",
                    member.blockers.items.length > 0
                      ? "bg-red-50/50 border-red-200/80"
                      : "bg-emerald-50/40 border-emerald-200/60"
                  )}
                >
                  <span
                    className={cn(
                      "text-xs font-bold flex items-center gap-1.5 pb-1 border-b",
                      member.blockers.items.length > 0
                        ? "text-red-900 border-red-200/60"
                        : "text-emerald-900 border-emerald-200/60"
                    )}
                  >
                    <AlertOctagon
                      className={cn(
                        "size-3.5",
                        member.blockers.items.length > 0 ? "text-red-600" : "text-emerald-600"
                      )}
                    />
                    3. ¿Tengo algún impedimento?
                  </span>

                  {member.blockers.items.length === 0 ? (
                    <div className="flex items-center gap-1.5 text-xs text-emerald-700 py-2">
                      <CheckCircle2 className="size-4 text-emerald-600 shrink-0" />
                      <span>Sin bloqueos activos. Flujo despejado.</span>
                    </div>
                  ) : (
                    <div className="space-y-2">
                      {member.blockers.items.map((b) => (
                        <div key={b.id} className="text-xs bg-white border border-red-300 rounded p-2.5 shadow-2xs space-y-1">
                          <span className="font-mono font-bold text-[10px] text-red-600 block">
                            {b.identifier} (Bloqueada)
                          </span>
                          <span className="font-medium text-slate-900 block">{b.title}</span>
                          <p className="text-[11px] text-red-700 italic bg-red-50 p-1.5 rounded border border-red-100">
                            {b.blocked_reason}
                          </p>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
