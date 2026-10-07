"use client";

import React, { useEffect, useState } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
} from "@/components/ui/sheet";
import { TeamMemberKpi, MemberKpiDetail, KpiPeriod } from "@/types/analytics-types";
import { projectAnalyticsService } from "@/services/plane/projectAnalyticsService";
import {
  CheckCircle2,
  Clock,
  Layers,
  Bug,
  AlertCircle,
  TrendingUp,
  Flame,
  ShieldCheck,
  Calendar,
  ExternalLink,
} from "lucide-react";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import Link from "next/link";

interface MemberPerformanceDrawerProps {
  projectId: string | number;
  member: TeamMemberKpi | null;
  period: KpiPeriod;
  isOpen: boolean;
  onClose: () => void;
}

export function MemberPerformanceDrawer({
  projectId,
  member,
  period,
  isOpen,
  onClose,
}: MemberPerformanceDrawerProps) {
  const [detail, setDetail] = useState<MemberKpiDetail | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    if (isOpen && member) {
      setIsLoading(true);
      projectAnalyticsService
        .getMemberDetail(projectId, member.user_id, { period })
        .then((data) => setDetail(data))
        .catch((err) => console.error("Error fetching member detail:", err))
        .finally(() => setIsLoading(false));
    } else {
      setDetail(null);
    }
  }, [isOpen, member, projectId, period]);

  if (!member) return null;

  return (
    <Sheet open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <SheetContent
        side="right"
        className="w-full sm:max-w-xl overflow-y-auto p-6 space-y-6 bg-white dark:bg-neutral-900 border-l border-slate-200 dark:border-neutral-800"
      >
        <SheetHeader className="space-y-3 pb-4 border-b border-slate-100 dark:border-neutral-800">
          <div className="flex items-center gap-4">
            <Avatar className="size-12 ring-2 ring-indigo-500/20">
              <AvatarImage src={member.avatar_url || undefined} />
              <AvatarFallback className="bg-indigo-600 text-white font-bold text-sm">
                {member.name.slice(0, 2).toUpperCase()}
              </AvatarFallback>
            </Avatar>
            <div>
              <SheetTitle className="text-lg font-bold text-slate-900 dark:text-slate-100">
                {member.name}
              </SheetTitle>
              <SheetDescription className="text-xs text-slate-500">
                {member.email} • Rol: <span className="font-semibold text-slate-700 dark:text-slate-300">{member.project_role}</span>
              </SheetDescription>
            </div>
          </div>
        </SheetHeader>

        {isLoading ? (
          <div className="space-y-4 animate-pulse">
            <div className="h-24 bg-slate-100 dark:bg-neutral-800 rounded-xl" />
            <div className="h-36 bg-slate-100 dark:bg-neutral-800 rounded-xl" />
            <div className="h-48 bg-slate-100 dark:bg-neutral-800 rounded-xl" />
          </div>
        ) : (
          <div className="space-y-6">
            {/* Medidor de saturación de WIP */}
            <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-800/40 space-y-2.5">
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 dark:text-slate-300 flex items-center gap-1.5">
                  {member.load_status === "overloaded" ? (
                    <Flame className="size-4 text-rose-500" />
                  ) : member.load_status === "heavy" ? (
                    <AlertCircle className="size-4 text-amber-500" />
                  ) : (
                    <ShieldCheck className="size-4 text-emerald-500" />
                  )}
                  Nivel de Saturación Activa (WIP)
                </span>
                <span className="font-bold text-slate-900 dark:text-slate-100">
                  {member.active_wip} tareas en progreso
                </span>
              </div>

              {/* Progress bar con umbrales */}
              <div className="w-full bg-slate-200 dark:bg-neutral-700 h-2.5 rounded-full overflow-hidden flex">
                <div
                  className={cn(
                    "h-full rounded-full transition-all duration-300",
                    member.load_status === "overloaded"
                      ? "bg-rose-500"
                      : member.load_status === "heavy"
                      ? "bg-amber-500"
                      : "bg-emerald-500"
                  )}
                  style={{ width: `${Math.min(100, (member.active_wip / 8) * 100)}%` }}
                />
              </div>

              <div className="flex justify-between text-[10px] text-slate-400">
                <span>0-3 (Óptimo)</span>
                <span>4-6 (Carga Alta)</span>
                <span>7+ (Riesgo Sobrecarga)</span>
              </div>
            </div>

            {/* Ficha métrica rápida */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">
                  Throughput del Periodo
                </span>
                <div className="text-xl font-bold text-slate-900 dark:text-slate-100 mt-0.5">
                  {member.completed_in_period} ítems
                </div>
                <span className="text-[11px] text-indigo-600 font-medium">
                  {member.completed_points} Story Points
                </span>
              </div>

              <div className="p-3.5 rounded-xl border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 shadow-xs">
                <span className="text-[11px] font-medium text-slate-400 block uppercase">
                  Cumplimiento de Plazo (OTD)
                </span>
                <div
                  className={cn(
                    "text-xl font-bold mt-0.5",
                    member.on_time_delivery_rate >= 85
                      ? "text-emerald-600"
                      : "text-amber-600"
                  )}
                >
                  {member.on_time_delivery_rate}%
                </div>
                <span className="text-[11px] text-slate-500">
                  Cycle Time Promedio: {member.avg_cycle_time_days}d
                </span>
              </div>
            </div>

            {/* Distribución por Tipo de Trabajo */}
            {detail?.type_distribution && detail.type_distribution.length > 0 && (
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Distribución de Trabajo Entregado
                </h5>
                <div className="space-y-2">
                  {detail.type_distribution.map((item) => (
                    <div key={item.type} className="space-y-1">
                      <div className="flex justify-between text-xs">
                        <span className="font-medium text-slate-800 dark:text-slate-200">
                          {item.type}
                        </span>
                        <span className="text-slate-500">
                          {item.count} ({item.percentage}%)
                        </span>
                      </div>
                      <div className="w-full bg-slate-100 dark:bg-neutral-800 h-1.5 rounded-full overflow-hidden">
                        <div
                          className="bg-indigo-600 h-full rounded-full"
                          style={{ width: `${item.percentage}%` }}
                        />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tendencia Semanal de Entregas (Últimas 6 semanas) */}
            {detail?.weekly_throughput && (
              <div className="space-y-3">
                <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Ritmo Semanal de Entregables (Últimas 6 semanas)
                </h5>
                <div className="grid grid-cols-6 gap-1.5 text-center">
                  {detail.weekly_throughput.map((week, idx) => (
                    <div
                      key={idx}
                      className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/60 border border-slate-100 dark:border-neutral-800 space-y-1"
                    >
                      <span className="text-[10px] text-slate-400 block truncate">
                        {week.week_label}
                      </span>
                      <span className="text-sm font-bold text-slate-900 dark:text-slate-100 block">
                        {week.items_count}
                      </span>
                      <span className="text-[9px] text-indigo-600 block">
                        {week.points_count} pts
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Tareas Activas Asignadas */}
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
                  Tareas Activas Asignadas ({detail?.active_items.length || 0})
                </h5>
                <span className="text-[11px] text-slate-400">En progreso o pendientes</span>
              </div>

              <div className="space-y-2 max-h-60 overflow-y-auto pr-1">
                {!detail?.active_items || detail.active_items.length === 0 ? (
                  <p className="text-xs text-slate-400 py-3 text-center">
                    No tiene tareas pendientes o activas en este proyecto actualmente.
                  </p>
                ) : (
                  detail.active_items.map((item) => (
                    <div
                      key={item.id}
                      className="p-2.5 rounded-lg border border-slate-100 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex items-start justify-between gap-2 text-xs hover:border-slate-300 transition-colors"
                    >
                      <div className="space-y-1 min-w-0">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-mono text-slate-400 font-bold">
                            #{item.sequence_id}
                          </span>
                          <span className="font-medium text-slate-800 dark:text-slate-200 truncate block">
                            {item.title}
                          </span>
                        </div>
                        <div className="flex items-center gap-2 text-[10px] text-slate-400">
                          <span>{item.state_name}</span>
                          <span>•</span>
                          <span className="capitalize">{item.priority}</span>
                          {item.target_date && (
                            <>
                              <span>•</span>
                              <span
                                className={cn(
                                  item.is_overdue && "text-rose-600 font-bold"
                                )}
                              >
                                {item.target_date}
                                {item.is_overdue && " (Vencida)"}
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                      <Link
                        href={`/projects/${projectId}/work-items?selected=${item.id}`}
                        className="text-slate-400 hover:text-indigo-600 p-1 shrink-0"
                      >
                        <ExternalLink className="size-3.5" />
                      </Link>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>
        )}
      </SheetContent>
    </Sheet>
  );
}
