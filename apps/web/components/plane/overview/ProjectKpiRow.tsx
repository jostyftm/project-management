"use client";

import React, { useMemo } from "react";
import { Project, WorkItem } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";
import { CycleProgressRing } from "@/components/plane/cycles/CycleProgressRing";
import { CheckCircle2, TrendingUp, AlertTriangle, Clock, ArrowUpRight, ArrowDownRight } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectKpiRowProps {
  project: Project;
  workItems: WorkItem[];
}

export function ProjectKpiRow({ project, workItems }: ProjectKpiRowProps) {
  const total = workItems.length;

  const completedItems = useMemo(
    () => workItems.filter((w) => w.state?.group === "COMPLETED"),
    [workItems]
  );
  const completionPercentage = total > 0 ? Math.round((completedItems.length / total) * 100) : 0;

  // Velocity: Work items completados en las últimas 2 semanas (14 días)
  const velocityData = useMemo(() => {
    const twoWeeksAgo = new Date();
    twoWeeksAgo.setDate(twoWeeksAgo.getDate() - 14);

    const completedLast2Weeks = completedItems.filter((w) => {
      const dateStr = w.completed_at || w.updated_at;
      if (!dateStr) return false;
      return new Date(dateStr) >= twoWeeksAgo;
    });

    // 4 buckets de 3.5 días para la mini sparkline
    const buckets = [0, 0, 0, 0];
    completedLast2Weeks.forEach((w) => {
      const dateStr = w.completed_at || w.updated_at;
      if (!dateStr) return;
      const daysAgo = Math.floor(
        (Date.now() - new Date(dateStr).getTime()) / (1000 * 60 * 60 * 24)
      );
      const bucketIdx = Math.min(3, Math.max(0, 3 - Math.floor(daysAgo / 3.5)));
      buckets[bucketIdx]++;
    });

    return {
      count: completedLast2Weeks.length,
      sparkline: buckets,
    };
  }, [completedItems]);

  // En riesgo: Items vencidos o con target date < hoy que no estén completados ni cancelados
  const atRiskItems = useMemo(() => {
    const now = new Date().getTime();
    return workItems.filter((w) => {
      if (!w.target_date) return false;
      const isClosed = w.state?.group === "COMPLETED" || w.state?.group === "CANCELLED";
      return !isClosed && new Date(w.target_date).getTime() < now;
    });
  }, [workItems]);

  // Días restantes hasta fecha objetivo del proyecto
  const remainingDaysData = useMemo(() => {
    if (!project.target_date) {
      return { days: null, isOverdue: false, text: "Sin fecha objetivo" };
    }
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const target = new Date(project.target_date);
    target.setHours(0, 0, 0, 0);

    const diffDays = Math.round((target.getTime() - now.getTime()) / (1000 * 60 * 60 * 24));
    if (diffDays < 0) {
      return { days: Math.abs(diffDays), isOverdue: true, text: `Vencido hace ${Math.abs(diffDays)}d` };
    }
    return { days: diffDays, isOverdue: false, text: `${diffDays} días restantes` };
  }, [project.target_date]);

  return (
    <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
      {/* KPI 1: Completado */}
      <WidgetCard
        title="Completado"
        description="Progreso global de entregables"
        exportFilename="kpi-completado"
      >
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="text-2xl font-bold tracking-tight text-slate-900">
              {completionPercentage}%
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {completedItems.length} de {total} items completados
            </p>
          </div>
          <CycleProgressRing progress={completionPercentage} size={48} strokeWidth={4.5} />
        </div>
      </WidgetCard>

      {/* KPI 2: Velocity */}
      <WidgetCard
        title="Velocity"
        description="Completados últimas 2 semanas"
        exportFilename="kpi-velocity"
      >
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span className="text-2xl font-bold tracking-tight text-slate-900">
                {velocityData.count}
              </span>
              <span className="text-xs font-semibold text-emerald-600 inline-flex items-center">
                <ArrowUpRight className="size-3.5" />
                items/14d
              </span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">Ritmo reciente de entrega</p>
          </div>

          {/* Mini Sparkline SVG */}
          <div className="w-16 h-8 shrink-0 flex items-end gap-1">
            {velocityData.sparkline.map((val, idx) => {
              const maxVal = Math.max(1, ...velocityData.sparkline);
              const heightPct = Math.max(15, (val / maxVal) * 100);
              return (
                <div
                  key={idx}
                  className="flex-1 bg-indigo-500 rounded-t-xs hover:bg-indigo-600 transition-all"
                  style={{ height: `${heightPct}%` }}
                  title={`Período ${idx + 1}: ${val} items`}
                />
              );
            })}
          </div>
        </div>
      </WidgetCard>

      {/* KPI 3: En Riesgo */}
      <WidgetCard
        title="En Riesgo"
        description="Work items vencidos sin resolver"
        exportFilename="kpi-en-riesgo"
      >
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  atRiskItems.length > 0 ? "text-red-600" : "text-slate-900"
                )}
              >
                {atRiskItems.length}
              </span>
              <span className="text-xs text-slate-400">items</span>
            </div>
            <p className="text-xs text-slate-500 mt-0.5">
              {atRiskItems.length === 0
                ? "Ningún item con fecha expirada"
                : `${Math.round((atRiskItems.length / Math.max(1, total)) * 100)}% del backlog total`}
            </p>
          </div>

          <div
            className={cn(
              "size-10 rounded-full flex items-center justify-center shrink-0",
              atRiskItems.length > 0 ? "bg-red-50 text-red-600" : "bg-emerald-50 text-emerald-600"
            )}
          >
            {atRiskItems.length > 0 ? (
              <AlertTriangle className="size-5" />
            ) : (
              <CheckCircle2 className="size-5" />
            )}
          </div>
        </div>
      </WidgetCard>

      {/* KPI 4: Días Restantes */}
      <WidgetCard
        title="Días Restantes"
        description="Tiempo hasta la fecha objetivo"
        exportFilename="kpi-dias-restantes"
      >
        <div className="flex items-center justify-between pt-1">
          <div>
            <div className="flex items-baseline gap-1.5">
              <span
                className={cn(
                  "text-2xl font-bold tracking-tight",
                  remainingDaysData.isOverdue ? "text-red-600" : "text-slate-900"
                )}
              >
                {remainingDaysData.days !== null ? remainingDaysData.days : "-"}
              </span>
              {remainingDaysData.days !== null && (
                <span className="text-xs text-slate-400">días</span>
              )}
            </div>
            <p className="text-xs text-slate-500 mt-0.5">{remainingDaysData.text}</p>
          </div>

          <div
            className={cn(
              "size-10 rounded-full flex items-center justify-center shrink-0",
              remainingDaysData.isOverdue ? "bg-red-50 text-red-600" : "bg-slate-100 text-slate-600"
            )}
          >
            <Clock className="size-5" />
          </div>
        </div>
      </WidgetCard>
    </div>
  );
}
