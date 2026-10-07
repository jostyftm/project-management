"use client";

import React, { useState } from "react";
import { TeamMemberKpi } from "@/types/analytics-types";
import {
  Users2,
  Clock,
  CheckCircle2,
  AlertTriangle,
  Bug,
  ChevronRight,
  ShieldCheck,
  Flame,
  ArrowUpDown,
  Search,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Button } from "@/components/ui/button";

interface ProjectMembersMatrixTableProps {
  members: TeamMemberKpi[];
  isLoading: boolean;
  onSelectMember: (member: TeamMemberKpi) => void;
}

export function ProjectMembersMatrixTable({
  members,
  isLoading,
  onSelectMember,
}: ProjectMembersMatrixTableProps) {
  const [searchTerm, setSearchTerm] = useState("");
  const [sortBy, setSortBy] = useState<"throughput" | "wip" | "otd" | "cycletime">("throughput");

  if (isLoading) {
    return (
      <div className="h-64 rounded-xl bg-slate-100 dark:bg-neutral-800 animate-pulse border border-slate-200 dark:border-neutral-700" />
    );
  }

  const filteredMembers = members.filter(
    (m) =>
      m.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
      m.email.toLowerCase().includes(searchTerm.toLowerCase())
  );

  const sortedMembers = [...filteredMembers].sort((a, b) => {
    switch (sortBy) {
      case "throughput":
        return b.completed_in_period - a.completed_in_period;
      case "wip":
        return b.active_wip - a.active_wip;
      case "otd":
        return b.on_time_delivery_rate - a.on_time_delivery_rate;
      case "cycletime":
        return a.avg_cycle_time_days - b.avg_cycle_time_days;
      default:
        return 0;
    }
  });

  const getLoadBadge = (status: TeamMemberKpi["load_status"], wip: number) => {
    switch (status) {
      case "overloaded":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
            <Flame className="size-3 text-rose-600" />
            Sobrecarga ({wip} WIP)
          </span>
        );
      case "heavy":
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
            <AlertTriangle className="size-3 text-amber-600" />
            Carga Alta ({wip} WIP)
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
            <ShieldCheck className="size-3 text-emerald-600" />
            Óptimo ({wip} WIP)
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-slate-200 dark:border-neutral-800 rounded-xl shadow-xs overflow-hidden">
      {/* Header con búsqueda y controles */}
      <div className="p-5 border-b border-slate-100 dark:border-neutral-800 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="size-5 text-indigo-600" />
            <h4 className="text-base font-semibold text-slate-900 dark:text-slate-100">
              Matriz de Rendimiento y Balance de Carga del Equipo
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            Evaluación multidimensional: Throughput, WIP activo, Cycle Time individual y entregas a tiempo
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search className="size-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar colaborador..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="text-xs pl-8 pr-3 py-1.5 rounded-lg border border-slate-200 dark:border-neutral-700 bg-white dark:bg-neutral-800 text-slate-900 dark:text-slate-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          <div className="inline-flex items-center gap-1 text-xs text-slate-500">
            <ArrowUpDown className="size-3 text-slate-400" />
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as any)}
              className="text-xs bg-slate-50 dark:bg-neutral-800 border border-slate-200 dark:border-neutral-700 rounded-lg px-2 py-1.5 focus:outline-none"
            >
              <option value="throughput">Ordenar por Entregas</option>
              <option value="wip">Ordenar por WIP Activo</option>
              <option value="otd">Ordenar por % a Tiempo</option>
              <option value="cycletime">Ordenar por Cycle Time</option>
            </select>
          </div>
        </div>
      </div>

      {/* Tabla de colaboradores */}
      <div className="overflow-x-auto">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-slate-50/75 dark:bg-neutral-800/50 border-b border-slate-200 dark:border-neutral-800 text-[11px] font-semibold text-slate-500 uppercase tracking-wider">
              <th className="py-3 px-4">Colaborador</th>
              <th className="py-3 px-3">Estado de Carga (WIP)</th>
              <th className="py-3 px-3 text-center">Entregas Periodo</th>
              <th className="py-3 px-3 text-center">Puntos (SP)</th>
              <th className="py-3 px-3 text-center">Cycle Time</th>
              <th className="py-3 px-3 text-center">% A Tiempo (OTD)</th>
              <th className="py-3 px-3 text-center">Bugs Resueltos</th>
              <th className="py-3 px-4 text-right">Acción</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100 dark:divide-neutral-800 text-xs">
            {sortedMembers.length === 0 ? (
              <tr>
                <td colSpan={8} className="py-8 text-center text-slate-400 text-xs">
                  No se encontraron miembros en este proyecto o con el filtro actual.
                </td>
              </tr>
            ) : (
              sortedMembers.map((member) => (
                <tr
                  key={member.user_id}
                  className="hover:bg-slate-50/80 dark:hover:bg-neutral-800/40 transition-colors cursor-pointer group"
                  onClick={() => onSelectMember(member)}
                >
                  {/* Colaborador */}
                  <td className="py-3.5 px-4">
                    <div className="flex items-center gap-3">
                      <Avatar className="size-8">
                        <AvatarImage src={member.avatar_url || undefined} />
                        <AvatarFallback className="bg-indigo-100 text-indigo-700 text-xs font-bold">
                          {member.name.slice(0, 2).toUpperCase()}
                        </AvatarFallback>
                      </Avatar>
                      <div>
                        <div className="font-semibold text-slate-900 dark:text-slate-100 group-hover:text-indigo-600 transition-colors">
                          {member.name}
                        </div>
                        <div className="text-[11px] text-slate-400">
                          {member.project_role} • {member.email}
                        </div>
                      </div>
                    </div>
                  </td>

                  {/* Estado de Saturación WIP */}
                  <td className="py-3.5 px-3">
                    <div className="flex items-center gap-2">
                      {getLoadBadge(member.load_status, member.active_wip)}
                      {member.overdue_active_count > 0 && (
                        <span className="text-[10px] text-rose-600 font-bold bg-rose-50 px-1.5 py-0.5 rounded">
                          {member.overdue_active_count} vencidas
                        </span>
                      )}
                    </div>
                  </td>

                  {/* Entregas Periodo */}
                  <td className="py-3.5 px-3 text-center font-bold text-slate-800 dark:text-slate-200">
                    {member.completed_in_period}
                    <span className="text-[10px] font-normal text-slate-400 block">ítems cerrados</span>
                  </td>

                  {/* Puntos de Historia */}
                  <td className="py-3.5 px-3 text-center font-bold text-indigo-600 dark:text-indigo-400">
                    {member.completed_points}
                    <span className="text-[10px] font-normal text-slate-400 block">pts entregados</span>
                  </td>

                  {/* Cycle Time */}
                  <td className="py-3.5 px-3 text-center font-medium text-slate-700 dark:text-slate-300">
                    {member.avg_cycle_time_days > 0 ? `${member.avg_cycle_time_days}d` : "—"}
                    <span className="text-[10px] font-normal text-slate-400 block">promedio</span>
                  </td>

                  {/* OTD % */}
                  <td className="py-3.5 px-3 text-center">
                    <span
                      className={cn(
                        "font-bold",
                        member.on_time_delivery_rate >= 85
                          ? "text-emerald-600"
                          : member.on_time_delivery_rate >= 70
                          ? "text-amber-600"
                          : "text-rose-600"
                      )}
                    >
                      {member.on_time_delivery_rate}%
                    </span>
                    <span className="text-[10px] font-normal text-slate-400 block">cumplimiento</span>
                  </td>

                  {/* Bugs Resueltos */}
                  <td className="py-3.5 px-3 text-center font-medium text-slate-700 dark:text-slate-300">
                    <span className="inline-flex items-center gap-1 text-slate-800 dark:text-slate-200">
                      <Bug className="size-3 text-rose-500" />
                      {member.bugs_resolved_count}
                    </span>
                  </td>

                  {/* Acción */}
                  <td className="py-3.5 px-4 text-right">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-xs text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50"
                      onClick={(e) => {
                        e.stopPropagation();
                        onSelectMember(member);
                      }}
                    >
                      Ver Ficha
                      <ChevronRight className="size-3.5 ml-1" />
                    </Button>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {/* Nota ética empresarial (Principio de Goodhart) */}
      <div className="p-3.5 bg-slate-50 dark:bg-neutral-800/50 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-slate-500">
        <span>
          <strong>Límites recomendados de WIP individual:</strong> 1-3 tareas en progreso (Óptimo) para evitar sobrecarga y pérdidas por cambio de contexto (context-switching).
        </span>
        <span className="text-slate-400">
          Uso recomendado: 1-on-1s, balanceo de carga y detección de dependencias bloqueantes.
        </span>
      </div>
    </div>
  );
}
