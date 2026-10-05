"use client";

import React, { useMemo } from "react";
import { WorkItem } from "@/types/plane-types";
import { ProjectMemberUser } from "@/services/plane/projectMemberService";
import { WidgetCard } from "./WidgetCard";
import { Users } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectTeamWorkloadProps {
  members: ProjectMemberUser[];
  workItems: WorkItem[];
}

export function ProjectTeamWorkload({
  members,
  workItems,
}: ProjectTeamWorkloadProps) {
  // Capacidad de referencia por miembro para el cálculo de saturación
  const CAPACITY = 10;

  const workloadData = useMemo(() => {
    const openItems = workItems.filter(
      (w) => w.state?.group !== "COMPLETED" && w.state?.group !== "CANCELLED"
    );

    return members
      .map((m) => {
        const assignedCount = openItems.filter((item) =>
          item.assignees?.some((a) => String(a.id) === String(m.id))
        ).length;
        const loadPercentage = Math.round((assignedCount / CAPACITY) * 100);

        let color = "bg-emerald-500";
        let statusLabel = "Óptimo";
        if (loadPercentage > 90) {
          color = "bg-red-500";
          statusLabel = "Sobrecargado";
        } else if (loadPercentage >= 70) {
          color = "bg-amber-500";
          statusLabel = "Carga Alta";
        }

        return {
          member: m,
          assignedCount,
          loadPercentage,
          color,
          statusLabel,
        };
      })
      .sort((a, b) => b.assignedCount - a.assignedCount);
  }, [members, workItems]);

  return (
    <WidgetCard
      title="Carga del Equipo"
      description="Distribución de tareas activas por colaborador"
      exportFilename="carga-del-equipo"
    >
      {workloadData.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No hay miembros asignados a este proyecto.
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {workloadData.map(({ member, assignedCount, loadPercentage, color, statusLabel }) => (
            <div key={member.id} className="space-y-1 text-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="size-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center shrink-0">
                    {member.name.charAt(0).toUpperCase()}
                  </div>
                  <span className="font-semibold text-slate-800 truncate">
                    {member.name}
                  </span>
                  <span className="text-[10px] text-slate-400">({member.role})</span>
                </div>

                <div className="flex items-center gap-1.5 font-mono text-slate-600 shrink-0">
                  <span className="font-bold text-slate-900">{assignedCount}</span>
                  <span className="text-[10px] text-slate-400">/ {CAPACITY}</span>
                </div>
              </div>

              {/* Horizontal workload capacity bar */}
              <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", color)}
                  style={{ width: `${Math.min(100, Math.max(assignedCount > 0 ? 5 : 0, loadPercentage))}%` }}
                />
              </div>
            </div>
          ))}
        </div>
      )}
    </WidgetCard>
  );
}
