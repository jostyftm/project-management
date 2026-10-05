"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { Cycle } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";
import { CycleProgressRing } from "@/components/plane/cycles/CycleProgressRing";
import { Repeat, Calendar, ArrowRight, PlayCircle } from "lucide-react";
import { Button } from "@/components/ui/button";

interface ProjectCurrentCycleWidgetProps {
  cycles: Cycle[];
  projectId: string | number;
}

export function ProjectCurrentCycleWidget({
  cycles,
  projectId,
}: ProjectCurrentCycleWidgetProps) {
  const currentCycle = useMemo(
    () => cycles.find((c) => c.status === "CURRENT"),
    [cycles]
  );

  const completedCount = currentCycle?.completed_items ?? 0;
  const totalCount = currentCycle?.total_items ?? 0;
  const progress = totalCount > 0 ? Math.round((completedCount / totalCount) * 100) : 0;

  return (
    <WidgetCard
      title="Ciclo en Curso"
      description="Sprint activo de desarrollo"
      exportFilename="ciclo-en-curso"
      actions={
        <Button
          asChild
          variant="ghost"
          size="sm"
          className="h-7 px-2 text-xs text-indigo-600 hover:text-indigo-800"
        >
          <Link href={`/projects/${projectId}/cycles`}>
            <span>Ver ciclos</span>
            <ArrowRight className="size-3 ml-1" />
          </Link>
        </Button>
      }
    >
      {!currentCycle ? (
        <div className="py-6 text-center border border-dashed border-slate-200 rounded-lg">
          <Repeat className="size-6 text-slate-300 mx-auto mb-1.5" />
          <p className="text-xs font-semibold text-slate-700">No hay ningún ciclo en curso</p>
          <p className="text-[11px] text-slate-400 mt-0.5">
            Inicia un ciclo para comenzar a medir el sprint actual.
          </p>
          <Button
            asChild
            variant="outline"
            size="sm"
            className="mt-3 text-xs border-indigo-200 text-indigo-600 hover:bg-indigo-50"
          >
            <Link href={`/projects/${projectId}/cycles`}>
              <PlayCircle className="size-3.5 mr-1.5" />
              <span>Gestionar Ciclos</span>
            </Link>
          </Button>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-4 pt-1">
          <div className="space-y-1 min-w-0">
            <h4 className="font-semibold text-sm text-slate-900 truncate">
              {currentCycle.name}
            </h4>

            {currentCycle.start_date || currentCycle.end_date ? (
              <div className="flex items-center gap-1.5 text-xs text-slate-500">
                <Calendar className="size-3 text-slate-400" />
                <span>
                  {currentCycle.start_date
                    ? new Date(currentCycle.start_date).toLocaleDateString("es-ES", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Inicio"}{" "}
                  -{" "}
                  {currentCycle.end_date
                    ? new Date(currentCycle.end_date).toLocaleDateString("es-ES", {
                        month: "short",
                        day: "numeric",
                      })
                    : "Fin"}
                </span>
              </div>
            ) : null}

            <p className="text-xs text-slate-500 pt-1">
              <span className="font-semibold text-slate-800">{completedCount}</span> de{" "}
              <span>{totalCount}</span> items completados
            </p>
          </div>

          <div className="shrink-0 flex flex-col items-center">
            <CycleProgressRing progress={progress} size={48} strokeWidth={4.5} />
          </div>
        </div>
      )}
    </WidgetCard>
  );
}
