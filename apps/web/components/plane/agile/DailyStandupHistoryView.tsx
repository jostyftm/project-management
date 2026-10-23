"use client";

import React, { useState, useEffect, useMemo } from "react";
import { standupService } from "@/services/plane/standupService";
import {
  DailyStandupRangeReport,
  DailyStandupRangeMember,
  DailyStandupDayBreakdown,
  CommentAttachment,
} from "@/types/plane-types";
import {
  Calendar,
  Users,
  CheckCircle2,
  Clock,
  GitCommit,
  FileCheck,
  ImageIcon,
  ChevronDown,
  ChevronRight,
  Filter,
  RefreshCw,
  AlertCircle,
  ExternalLink,
  ShieldCheck,
  Sparkles,
  BarChart3,
  CheckSquare,
  FileText,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { storage } from "@/lib/storage";
import { ACCESS_TOKEN } from "@/config/constants";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface DailyStandupHistoryViewProps {
  projectId: string | number;
}

export function DailyStandupHistoryView({ projectId }: DailyStandupHistoryViewProps) {
  // Rango de fechas por defecto: últimos 14 días
  const todayStr = useMemo(() => new Date().toISOString().split("T")[0], []);
  const defaultStartStr = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() - 14);
    return d.toISOString().split("T")[0];
  }, []);

  const [startDate, setStartDate] = useState<string>(defaultStartStr);
  const [endDate, setEndDate] = useState<string>(todayStr);
  const [selectedMemberId, setSelectedMemberId] = useState<string>("all");
  const [expandedMembers, setExpandedMembers] = useState<Record<string, boolean>>({});

  const [report, setReport] = useState<DailyStandupRangeReport | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  const loadHistory = async (start = startDate, end = endDate) => {
    try {
      setIsLoading(true);
      const res = await standupService.getDailyStandupHistory(projectId, {
        start_date: start,
        end_date: end,
      });
      setReport(res);
      // Auto-expandir el primer miembro activo si existe
      if (res?.members && res.members.length > 0) {
        const firstActive = res.members.find((m) => m.days_worked_count > 0);
        if (firstActive) {
          setExpandedMembers({ [String(firstActive.user.id)]: true });
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al cargar historial de días trabajados");
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    loadHistory(startDate, endDate);
  }, [projectId]);

  const handleApplyPreset = (daysBack: number) => {
    const end = new Date();
    const start = new Date();
    start.setDate(end.getDate() - daysBack);
    const sStr = start.toISOString().split("T")[0];
    const eStr = end.toISOString().split("T")[0];
    setStartDate(sStr);
    setEndDate(eStr);
    loadHistory(sStr, eStr);
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (startDate > endDate) {
      toast.error("La fecha de inicio no puede ser posterior a la fecha de fin");
      return;
    }
    loadHistory(startDate, endDate);
  };

  const toggleMemberExpand = (memberId: string) => {
    setExpandedMembers((prev) => ({
      ...prev,
      [memberId]: !prev[memberId],
    }));
  };

  const filteredMembers = useMemo(() => {
    if (!report?.members) return [];
    if (selectedMemberId === "all") return report.members;
    return report.members.filter((m) => String(m.user.id) === selectedMemberId);
  }, [report, selectedMemberId]);

  return (
    <div className="space-y-6">
      {/* 1. Header con Filtros de Rango y Presets */}
      <div className="p-4 bg-white border border-slate-200 rounded-xl shadow-xs space-y-4">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-3">
          <div>
            <div className="flex items-center gap-2">
              <span className="px-2 py-0.5 rounded-full text-[11px] font-bold bg-emerald-50 text-emerald-700 border border-emerald-200 flex items-center gap-1">
                <CheckSquare className="size-3" />
                Historial de Días Trabajados & Avances
              </span>
              {report?.cycle && (
                <span className="text-xs font-semibold text-slate-700">
                  Sprint: {report.cycle.name}
                </span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-1">
              Auditoría objetiva de presencia y actividades reales del equipo de desarrollo.
            </p>
          </div>

          {/* Presets Rápidos */}
          <div className="flex items-center gap-1.5 flex-wrap">
            <span className="text-xs text-slate-400 font-medium mr-1">Rango rápido:</span>
            <button
              type="button"
              onClick={() => handleApplyPreset(7)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Últimos 7d
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(14)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Últimos 14d
            </button>
            <button
              type="button"
              onClick={() => handleApplyPreset(30)}
              className="px-2.5 py-1 text-xs font-medium rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 transition-colors cursor-pointer"
            >
              Últimos 30d
            </button>
          </div>
        </div>

        {/* Formulario de Filtros */}
        <form
          onSubmit={handleSearchSubmit}
          className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5 pt-3 border-t border-slate-100"
        >
          <div className="flex items-center gap-2">
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-slate-400 font-medium">Desde:</span>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-hidden text-slate-800 font-semibold"
              />
            </div>
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1">
              <span className="text-[11px] text-slate-400 font-medium">Hasta:</span>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-hidden text-slate-800 font-semibold"
              />
            </div>
          </div>

          {/* Filtro por Miembro */}
          {report?.members && (
            <div className="flex items-center gap-1.5 bg-slate-50 border border-slate-200 rounded-lg px-2.5 py-1 sm:max-w-xs flex-1">
              <Filter className="size-3.5 text-slate-400" />
              <select
                value={selectedMemberId}
                onChange={(e) => setSelectedMemberId(e.target.value)}
                className="text-xs bg-transparent border-none focus:outline-hidden text-slate-800 font-medium w-full"
              >
                <option value="all">Todos los miembros ({report.members.length})</option>
                {report.members.map((m) => (
                  <option key={m.user.id} value={String(m.user.id)}>
                    {m.user.name} ({m.days_worked_count} días trabajados)
                  </option>
                ))}
              </select>
            </div>
          )}

          <div className="flex items-center gap-2 sm:ml-auto">
            <Button
              type="submit"
              size="sm"
              className="bg-indigo-600 hover:bg-indigo-700 text-white text-xs h-8 cursor-pointer"
              disabled={isLoading}
            >
              {isLoading ? (
                <RefreshCw className="size-3 mr-1.5 animate-spin" />
              ) : (
                <RefreshCw className="size-3 mr-1.5" />
              )}
              Consultar
            </Button>
          </div>
        </form>
      </div>

      {/* 2. Banner de Regla de Negocio Estricta */}
      <div className="bg-gradient-to-r from-blue-50/70 via-indigo-50/50 to-slate-50 border border-blue-200/80 rounded-xl p-3.5 text-xs text-blue-950 flex items-start gap-3 shadow-xs">
        <ShieldCheck className="size-5 text-indigo-600 shrink-0 mt-0.5" />
        <div className="space-y-0.5 leading-relaxed">
          <p className="font-semibold text-slate-900">
            Regla de Cómputo de Días de Trabajo y Avances Reales
          </p>
          <p className="text-slate-600">
            Para evitar cómputos ficticios, el sistema considera <strong>día trabajado</strong> únicamente
            cuando el colaborador registra avances comprobables: transiciones de estado de tareas, entregables formales, criterios DoD completados, commits de GitHub o <strong>capturas/imágenes con descripción explicativa (mínimo 5 letras)</strong>. Las imágenes sin texto explicativo o comentarios casuales con menciones (@usuario) <strong>no se computan</strong> como jornada laboral.
          </p>
        </div>
      </div>

      {/* 3. Tarjetas de Resumen KPI */}
      {report && (
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Días Hábiles en Rango</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-slate-900">{report.total_working_days}</span>
              <span className="text-xs text-slate-400">días hábiles ({report.total_calendar_days} días totales)</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Miembros Activos</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-indigo-600">{report.summary.active_members}</span>
              <span className="text-xs text-slate-400">de {report.summary.total_members} registrados</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Tareas Completadas</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-emerald-600">{report.summary.total_tasks_completed}</span>
              <span className="text-xs text-slate-400">en el período</span>
            </div>
          </div>

          <div className="bg-white border border-slate-200 rounded-xl p-3.5 shadow-xs">
            <span className="text-[11px] font-medium text-slate-500 block">Evidencias & Commits</span>
            <div className="flex items-baseline gap-1.5 mt-1">
              <span className="text-2xl font-bold text-amber-600">
                {report.summary.total_evidences + report.summary.total_commits}
              </span>
              <span className="text-xs text-slate-400">
                ({report.summary.total_evidences} evidencias, {report.summary.total_commits} commits)
              </span>
            </div>
          </div>
        </div>
      )}

      {/* 4. Listado Detallado por Miembro con Días Trabajados */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center p-16 space-y-3 bg-white border border-slate-200 rounded-xl">
          <RefreshCw className="size-8 text-indigo-500 animate-spin" />
          <p className="text-xs font-medium text-slate-500">
            Analizando actividades diarias, evidencias fotográficas y registros de trabajo...
          </p>
        </div>
      ) : filteredMembers.length === 0 ? (
        <div className="p-12 text-center text-xs text-slate-500 bg-white border border-slate-200 rounded-xl">
          No se encontraron miembros o actividades en el rango de fechas seleccionado.
        </div>
      ) : (
        <div className="space-y-4">
          {filteredMembers.map((member) => {
            const memberId = String(member.user.id);
            const isExpanded = !!expandedMembers[memberId];
            const initials = member.user.name ? member.user.name.substring(0, 2).toUpperCase() : "U";

            return (
              <div
                key={member.user.id}
                className="bg-white border border-slate-200 rounded-xl shadow-xs overflow-hidden transition-all"
              >
                {/* Cabecera del Miembro (Clicable para expandir/colapsar) */}
                <div
                  onClick={() => toggleMemberExpand(memberId)}
                  className="p-4 flex flex-col md:flex-row md:items-center justify-between gap-4 cursor-pointer hover:bg-slate-50/70 transition-colors select-none"
                >
                  <div className="flex items-center gap-3">
                    <div className="flex size-10 items-center justify-center rounded-full bg-indigo-600 text-white font-bold text-sm shrink-0">
                      {initials}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-sm text-slate-900">{member.user.name}</span>
                        <span className="px-1.5 py-0.5 rounded text-[10px] font-semibold font-mono uppercase bg-slate-100 text-slate-600 border border-slate-200">
                          {member.role}
                        </span>
                      </div>
                      <span className="text-xs text-slate-400">{member.user.email}</span>
                    </div>
                  </div>

                  {/* Resumen de Días Trabajados y Tasa de Participación */}
                  <div className="flex items-center gap-6">
                    <div className="text-right">
                      <div className="flex items-baseline justify-end gap-1">
                        <span className="text-lg font-bold text-slate-900">
                          {member.days_worked_count}
                        </span>
                        <span className="text-xs text-slate-400 font-medium">
                          / {report?.total_working_days || 0} días hábiles
                        </span>
                      </div>
                      <div className="flex items-center gap-1.5 justify-end mt-0.5">
                        <div className="w-20 bg-slate-100 rounded-full h-1.5 overflow-hidden">
                          <div
                            className={cn(
                              "h-full rounded-full transition-all",
                              member.participation_rate >= 80
                                ? "bg-emerald-500"
                                : member.participation_rate >= 50
                                ? "bg-amber-500"
                                : "bg-slate-400"
                            )}
                            style={{ width: `${Math.min(100, member.participation_rate)}%` }}
                          />
                        </div>
                        <span className="text-[10px] font-semibold text-slate-600 font-mono">
                          {member.participation_rate}%
                        </span>
                      </div>
                    </div>

                    <button
                      type="button"
                      className="p-1 rounded-lg text-slate-400 hover:text-slate-600 hover:bg-slate-100"
                    >
                      {isExpanded ? <ChevronDown className="size-5" /> : <ChevronRight className="size-5" />}
                    </button>
                  </div>
                </div>

                {/* Chips de Fechas en las que trabajó */}
                <div className="px-4 pb-3 flex items-center gap-1.5 flex-wrap border-b border-slate-100">
                  <span className="text-[11px] font-medium text-slate-400 mr-1 flex items-center gap-1">
                    <Calendar className="size-3 text-slate-400" />
                    Días con actividad comprobada:
                  </span>
                  {member.worked_dates.length === 0 ? (
                    <span className="text-[11px] text-slate-400 italic">
                      Sin jornadas registradas en este rango
                    </span>
                  ) : (
                    member.worked_dates.map((dateStr) => (
                      <span
                        key={dateStr}
                        className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"
                      >
                        <CheckCircle2 className="size-2.5 text-emerald-600" />
                        {dateStr}
                      </span>
                    ))
                  )}
                </div>

                {/* Desglose Día por Día (Acordeón expandido) */}
                {isExpanded && (
                  <div className="p-4 bg-slate-50/50 space-y-3">
                    <p className="text-xs font-bold uppercase tracking-wider text-slate-500">
                      Trazabilidad Detallada de Jornadas
                    </p>

                    <div className="space-y-2.5">
                      {member.daily_breakdown
                        .filter((d) => d.has_worked)
                        .map((day) => (
                          <div
                            key={day.date}
                            className="bg-white border border-slate-200 rounded-lg p-3 text-xs space-y-2"
                          >
                            <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-2">
                              <span className="font-bold text-slate-800 flex items-center gap-1.5">
                                <Calendar className="size-3.5 text-indigo-600" />
                                {day.date}
                              </span>
                              <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200">
                                Día laborado comprobado
                              </span>
                            </div>

                            {/* Tareas Completadas */}
                            {day.completed_items.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-emerald-700 flex items-center gap-1">
                                  <CheckSquare className="size-3" />
                                  Tareas completadas ({day.completed_items.length}):
                                </span>
                                <div className="pl-4 space-y-0.5">
                                  {day.completed_items.map((it) => (
                                    <p key={it.id} className="text-slate-700">
                                      <span className="font-mono text-slate-500 font-semibold mr-1.5">
                                        [{it.identifier}]
                                      </span>
                                      {it.title}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Evidencias e Imágenes con Caption */}
                            {day.evidences.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-blue-700 flex items-center gap-1">
                                  <ImageIcon className="size-3" />
                                  Evidencias / Avances con captura ({day.evidences.length}):
                                </span>
                                <div className="pl-4 space-y-1.5">
                                  {day.evidences.map((ev) => (
                                    <div key={ev.id} className="space-y-1">
                                      <p className="text-slate-700 italic">"{ev.preview}"</p>
                                      {ev.attachments && ev.attachments.length > 0 && (
                                        <div className="flex items-center gap-2 flex-wrap">
                                          {ev.attachments.map((att: CommentAttachment, aIdx: number) => {
                                            const token = storage.get(ACCESS_TOKEN);
                                            const finalUrl = att.url?.includes("?")
                                              ? `${att.url}&token=${token}`
                                              : `${att.url}?token=${token}`;
                                            return (
                                              <a
                                                key={aIdx}
                                                href={finalUrl}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                className="inline-flex items-center gap-1 px-2 py-1 bg-slate-50 hover:bg-slate-100 border border-slate-200 rounded text-[10px] text-indigo-600 font-medium transition-colors"
                                              >
                                                <ImageIcon className="size-3 text-slate-500" />
                                                <span className="truncate max-w-[140px]">
                                                  {att.original_name || att.name}
                                                </span>
                                                <ExternalLink className="size-2.5" />
                                              </a>
                                            );
                                          })}
                                        </div>
                                      )}
                                    </div>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Entregables */}
                            {day.deliverables.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-indigo-700 flex items-center gap-1">
                                  <FileText className="size-3" />
                                  Entregables formalizados ({day.deliverables.length}):
                                </span>
                                <div className="pl-4 space-y-0.5">
                                  {day.deliverables.map((del) => (
                                    <p key={del.id} className="text-slate-700">
                                      <span className="font-mono text-slate-500 mr-1.5">[{del.type}]</span>
                                      {del.title}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}

                            {/* Commits */}
                            {day.commits.length > 0 && (
                              <div className="space-y-1">
                                <span className="text-[11px] font-semibold text-purple-700 flex items-center gap-1">
                                  <GitCommit className="size-3" />
                                  Commits en GitHub ({day.commits.length}):
                                </span>
                                <div className="pl-4 space-y-0.5">
                                  {day.commits.map((c, cIdx) => (
                                    <p key={cIdx} className="text-slate-700 font-mono text-[11px]">
                                      <span className="text-purple-600 font-semibold mr-1.5">
                                        [{c.hash}]
                                      </span>
                                      <span className="text-slate-500 mr-1.5">
                                        ({c.item_identifier})
                                      </span>
                                      {c.message}
                                    </p>
                                  ))}
                                </div>
                              </div>
                            )}
                          </div>
                        ))}

                      {member.daily_breakdown.filter((d) => d.has_worked).length === 0 && (
                        <p className="text-xs text-slate-400 italic p-3 text-center">
                          No hay avances ni evidencias registradas por este miembro en las fechas consultadas.
                        </p>
                      )}
                    </div>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}