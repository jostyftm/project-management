"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { WorkItem } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";
import { AlertCircle, ArrowRight, Calendar, UserX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface ProjectAttentionListProps {
  workItems: WorkItem[];
  projectId: string | number;
}

export function ProjectAttentionList({
  workItems,
  projectId,
}: ProjectAttentionListProps) {
  const criticalItems = useMemo(() => {
    const now = Date.now();
    const openItems = workItems.filter(
      (w) => w.state?.group !== "COMPLETED" && w.state?.group !== "CANCELLED"
    );

    // 1. Vencidos
    const overdue = openItems.filter(
      (w) => w.target_date && new Date(w.target_date).getTime() < now
    );
    // 2. Urgentes o Altos sin asignar
    const highUnassigned = openItems.filter(
      (w) =>
        (!w.target_date || new Date(w.target_date).getTime() >= now) &&
        (w.priority === "URGENT" || w.priority === "HIGH") &&
        (!w.assignees || w.assignees.length === 0)
    );
    // 3. Otros urgentes
    const otherUrgent = openItems.filter(
      (w) =>
        (!w.target_date || new Date(w.target_date).getTime() >= now) &&
        w.priority === "URGENT" &&
        w.assignees &&
        w.assignees.length > 0
    );

    return [...overdue, ...highUnassigned, ...otherUrgent].slice(0, 7);
  }, [workItems]);

  return (
    <WidgetCard
      title="Requiere Atención"
      description="Work items vencidos o de máxima prioridad que demandan acción inmediata"
      exportFilename="items-requieren-atencion"
      actions={
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-800"
        >
          <Link href={`/projects/${projectId}/work-items`}>
            <span>Ver todos</span>
            <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      }
    >
      {criticalItems.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-8 text-center border border-dashed border-slate-200 rounded-lg">
          <div className="size-8 rounded-full bg-emerald-50 text-emerald-600 flex items-center justify-center mb-2">
            <AlertCircle className="size-4" />
          </div>
          <p className="text-xs font-semibold text-slate-800">
            ¡Todo al día!
          </p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            No hay work items vencidos ni tareas de alta prioridad estancadas.
          </p>
        </div>
      ) : (
        <div className="divide-y divide-slate-100 overflow-hidden rounded-md border border-slate-100">
          {criticalItems.map((item) => {
            const isOverdue =
              item.target_date && new Date(item.target_date).getTime() < Date.now();
            const assignee = item.assignees && item.assignees.length > 0 ? item.assignees[0] : null;

            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 p-2.5 hover:bg-slate-50 transition-colors text-xs"
              >
                {/* Identifier & Title */}
                <div className="min-w-0 flex-1 flex items-center gap-2">
                  <span className="font-mono text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded shrink-0">
                    {item.identifier}
                  </span>
                  <Link
                    href={`/projects/${projectId}/work-items?openItem=${item.id}`}
                    className="font-medium text-slate-800 hover:text-indigo-600 truncate transition-colors"
                  >
                    {item.title}
                  </Link>
                </div>

                {/* Badges and metadata */}
                <div className="flex items-center gap-2 shrink-0">
                  {/* State badge */}
                  {item.state && (
                    <span
                      className="text-[10px] font-medium px-2 py-0.5 rounded-full"
                      style={{
                        backgroundColor: `${item.state.color}15`,
                        color: item.state.color,
                      }}
                    >
                      {item.state.name}
                    </span>
                  )}

                  {/* Priority badge */}
                  <span
                    className={cn(
                      "text-[10px] font-semibold px-1.5 py-0.5 rounded border",
                      item.priority === "URGENT" && "bg-red-50 text-red-700 border-red-200",
                      item.priority === "HIGH" && "bg-orange-50 text-orange-700 border-orange-200",
                      item.priority === "MEDIUM" && "bg-amber-50 text-amber-700 border-amber-200",
                      item.priority === "LOW" && "bg-blue-50 text-blue-700 border-blue-200",
                      (!item.priority || item.priority === "NONE") && "bg-slate-50 text-slate-600 border-slate-200"
                    )}
                  >
                    {item.priority === "URGENT" ? "Urgente" : item.priority === "HIGH" ? "Alta" : item.priority}
                  </span>

                  {/* Assignee Avatar */}
                  {assignee ? (
                    <div
                      title={`Asignado a: ${assignee.name}`}
                      className="size-5 rounded-full bg-indigo-100 text-indigo-700 font-bold text-[9px] flex items-center justify-center"
                    >
                      {assignee.name.charAt(0).toUpperCase()}
                    </div>
                  ) : (
                    <div
                      title="Sin asignar"
                      className="size-5 rounded-full bg-slate-100 text-slate-400 flex items-center justify-center"
                    >
                      <UserX className="size-3" />
                    </div>
                  )}

                  {/* Target date */}
                  {item.target_date && (
                    <span
                      className={cn(
                        "inline-flex items-center gap-1 font-mono text-[10px]",
                        isOverdue ? "text-red-600 font-semibold" : "text-slate-400"
                      )}
                      title={isOverdue ? "Vencido" : "Fecha objetivo"}
                    >
                      <Calendar className="size-3" />
                      {new Date(item.target_date).toLocaleDateString("es-ES", {
                        month: "short",
                        day: "numeric",
                      })}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}
