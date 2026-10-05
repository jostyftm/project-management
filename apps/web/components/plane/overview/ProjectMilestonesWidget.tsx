"use client";

import React from "react";
import Link from "next/link";
import { Milestone } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";
import { Flag, Calendar, AlertTriangle, CheckCircle2, ChevronRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectMilestonesWidgetProps {
  milestones: Milestone[];
  projectId: string | number;
}

export function ProjectMilestonesWidget({
  milestones,
  projectId,
}: ProjectMilestonesWidgetProps) {
  // Próximos 4 hitos no completados, ordenados por fecha objetivo
  const upcomingMilestones = milestones
    .filter((m) => m.status !== "COMPLETED")
    .sort((a, b) => {
      if (!a.target_date) return 1;
      if (!b.target_date) return -1;
      return new Date(a.target_date).getTime() - new Date(b.target_date).getTime();
    })
    .slice(0, 4);

  return (
    <WidgetCard
      title="Próximos Hitos"
      description="Objetivos clave y entregas programadas"
      exportFilename="proximos-hitos"
      actions={
        <Link
          href={`/projects/${projectId}/milestones`}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Ver todos
        </Link>
      }
    >
      {upcomingMilestones.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No hay hitos pendientes programados.
        </div>
      ) : (
        <div className="space-y-3.5 pt-1">
          {upcomingMilestones.map((milestone) => {
            const progress = milestone.progress_percentage || 0;
            let daysRemaining: number | null = null;
            let isUrgent = false;

            if (milestone.target_date) {
              const now = new Date();
              now.setHours(0, 0, 0, 0);
              const target = new Date(milestone.target_date);
              target.setHours(0, 0, 0, 0);
              daysRemaining = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
              isUrgent = daysRemaining <= 3 && progress < 80;
            }

            return (
              <div key={milestone.id} className="space-y-1.5 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <div className="flex items-center gap-1.5 min-w-0">
                    <Flag
                      className={cn(
                        "size-3.5 shrink-0",
                        isUrgent ? "text-red-500 animate-pulse" : "text-indigo-600"
                      )}
                    />
                    <span className="font-semibold text-slate-800 truncate">
                      {milestone.title}
                    </span>
                  </div>

                  <div className="flex items-center gap-2 shrink-0 font-mono text-[11px]">
                    {daysRemaining !== null && (
                      <span
                        className={cn(
                          "px-1.5 py-0.2 rounded font-semibold",
                          isUrgent
                            ? "bg-red-50 text-red-700"
                            : daysRemaining < 0
                            ? "bg-rose-50 text-rose-600"
                            : "text-slate-400"
                        )}
                      >
                        {daysRemaining < 0
                          ? `Atrasado ${Math.abs(daysRemaining)}d`
                          : `${daysRemaining}d`}
                      </span>
                    )}
                    <span className="font-bold text-slate-700">{progress}%</span>
                  </div>
                </div>

                {/* Progress bar */}
                <div className="w-full bg-slate-100 rounded-full h-1.5 overflow-hidden">
                  <div
                    className={cn(
                      "h-full rounded-full transition-all duration-500",
                      isUrgent
                        ? "bg-red-500"
                        : progress >= 100
                        ? "bg-emerald-500"
                        : "bg-indigo-600"
                    )}
                    style={{ width: `${Math.min(100, Math.max(2, progress))}%` }}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}
