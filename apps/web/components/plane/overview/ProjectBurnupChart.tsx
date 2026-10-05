"use client";

import React, { useState, useMemo } from "react";
import { Milestone, Project, WorkItem } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";
import { Button } from "@/components/ui/button";
import { Flag } from "lucide-react";
import { cn } from "@/lib/utils";

interface ProjectBurnupChartProps {
  project: Project;
  workItems: WorkItem[];
  milestones: Milestone[];
}

export function ProjectBurnupChart({
  project,
  workItems,
  milestones,
}: ProjectBurnupChartProps) {
  const [chartType, setChartType] = useState<"burnup" | "burndown">("burnup");

  // Generar timeline de 10 puntos equidistantes entre fecha inicio y objetivo
  const timelineData = useMemo(() => {
    const totalScope = Math.max(1, workItems.length);
    const completedItems = workItems.filter((w) => w.state?.group === "COMPLETED");

    let startDate = project.start_date
      ? new Date(project.start_date)
      : new Date(Date.now() - 30 * 24 * 60 * 60 * 1000);
    let targetDate = project.target_date
      ? new Date(project.target_date)
      : new Date(Date.now() + 30 * 24 * 60 * 60 * 1000);

    if (targetDate <= startDate) {
      targetDate = new Date(startDate.getTime() + 30 * 24 * 60 * 60 * 1000);
    }

    const pointsCount = 10;
    const intervalMs = (targetDate.getTime() - startDate.getTime()) / (pointsCount - 1);
    const now = Date.now();

    const points = [];
    for (let i = 0; i < pointsCount; i++) {
      const pointDate = new Date(startDate.getTime() + i * intervalMs);
      const isPastOrToday = pointDate.getTime() <= now;

      // Cantidad de items completados hasta esta fecha
      const completedUntilThen = completedItems.filter((w) => {
        const cDate = w.completed_at || w.updated_at;
        return cDate && new Date(cDate).getTime() <= pointDate.getTime();
      }).length;

      // Ideal progress
      const idealCompleted = Math.round((i / (pointsCount - 1)) * totalScope);
      const idealRemaining = totalScope - idealCompleted;

      // Formatted date label
      const label = pointDate.toLocaleDateString("es-ES", { month: "short", day: "numeric" });

      points.push({
        date: label,
        timestamp: pointDate.getTime(),
        scope: totalScope,
        completed: isPastOrToday ? completedUntilThen : null,
        pending: isPastOrToday ? Math.max(0, totalScope - completedUntilThen) : null,
        idealCompleted,
        idealRemaining,
      });
    }

    return points;
  }, [project, workItems]);

  const maxVal = Math.max(1, workItems.length);
  const chartHeight = 180;
  const chartWidth = 540;
  const paddingLeft = 35;
  const paddingRight = 20;
  const paddingTop = 20;
  const paddingBottom = 30;

  const innerWidth = chartWidth - paddingLeft - paddingRight;
  const innerHeight = chartHeight - paddingTop - paddingBottom;

  const getX = (index: number) =>
    paddingLeft + (index / (timelineData.length - 1)) * innerWidth;
  const getY = (val: number) =>
    paddingTop + innerHeight - (val / maxVal) * innerHeight;

  // Build SVG Paths
  const idealPath = useMemo(() => {
    return timelineData
      .map((p, i) => {
        const val = chartType === "burnup" ? p.idealCompleted : p.idealRemaining;
        const x = getX(i);
        const y = getY(val);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [timelineData, chartType]);

  const actualPath = useMemo(() => {
    const validPoints = timelineData.filter((p) =>
      chartType === "burnup" ? p.completed !== null : p.pending !== null
    );
    if (validPoints.length === 0) return "";

    return validPoints
      .map((p, i) => {
        const val = chartType === "burnup" ? p.completed! : p.pending!;
        const x = getX(i);
        const y = getY(val);
        return `${i === 0 ? "M" : "L"} ${x} ${y}`;
      })
      .join(" ");
  }, [timelineData, chartType]);

  const scopePath = useMemo(() => {
    return `M ${paddingLeft} ${getY(maxVal)} L ${paddingLeft + innerWidth} ${getY(maxVal)}`;
  }, [maxVal]);

  return (
    <WidgetCard
      title={`Progreso del Proyecto (${chartType === "burnup" ? "Burn-up" : "Burn-down"})`}
      description="Alcance total vs. entregas reales y ritmo ideal proyectado"
      exportFilename={`grafico-${chartType}-proyecto`}
      actions={
        <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-md">
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setChartType("burnup")}
            className={cn(
              "h-6 px-2 text-[11px] font-medium rounded",
              chartType === "burnup"
                ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Burn-up
          </Button>
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setChartType("burndown")}
            className={cn(
              "h-6 px-2 text-[11px] font-medium rounded",
              chartType === "burndown"
                ? "bg-white text-indigo-600 shadow-2xs font-semibold"
                : "text-slate-500 hover:text-slate-800"
            )}
          >
            Burn-down
          </Button>
        </div>
      }
    >
      <div className="w-full overflow-x-auto">
        <svg
          viewBox={`0 0 ${chartWidth} ${chartHeight}`}
          className="w-full min-w-[500px] h-auto overflow-visible select-none"
        >
          {/* Y Axis Grid lines */}
          {[0, 0.25, 0.5, 0.75, 1].map((pct, idx) => {
            const y = paddingTop + innerHeight - pct * innerHeight;
            const val = Math.round(pct * maxVal);
            return (
              <g key={idx}>
                <line
                  x1={paddingLeft}
                  y1={y}
                  x2={paddingLeft + innerWidth}
                  y2={y}
                  stroke="#e2e8f0"
                  strokeDasharray="2,2"
                />
                <text
                  x={paddingLeft - 6}
                  y={y + 3}
                  textAnchor="end"
                  className="fill-slate-400 text-[10px] font-mono"
                >
                  {val}
                </text>
              </g>
            );
          })}

          {/* Scope Line (top horizontal dashed) */}
          <path
            d={scopePath}
            stroke="#94a3b8"
            strokeWidth="1.5"
            strokeDasharray="4,4"
            fill="none"
          />

          {/* Ideal Guideline */}
          <path
            d={idealPath}
            stroke="#cbd5e1"
            strokeWidth="2"
            strokeDasharray="4,4"
            fill="none"
          />

          {/* Actual Delivered / Remaining Line */}
          {actualPath && (
            <path
              d={actualPath}
              stroke={chartType === "burnup" ? "#6366f1" : "#f59e0b"}
              strokeWidth="2.5"
              fill="none"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          )}

          {/* Actual Data points */}
          {timelineData.map((p, idx) => {
            const val = chartType === "burnup" ? p.completed : p.pending;
            if (val === null) return null;
            const x = getX(idx);
            const y = getY(val);
            return (
              <circle
                key={idx}
                cx={x}
                cy={y}
                r="3.5"
                fill={chartType === "burnup" ? "#6366f1" : "#f59e0b"}
                stroke="#ffffff"
                strokeWidth="1.5"
              />
            );
          })}

          {/* Milestones Markers as vertical dashed flags */}
          {milestones.map((m, mIdx) => {
            if (!m.target_date) return null;
            const mTime = new Date(m.target_date).getTime();
            const firstTime = timelineData[0]?.timestamp || 0;
            const lastTime = timelineData[timelineData.length - 1]?.timestamp || 1;
            if (mTime < firstTime || mTime > lastTime) return null;

            const ratio = (mTime - firstTime) / (lastTime - firstTime);
            const mX = paddingLeft + ratio * innerWidth;

            return (
              <g key={mIdx}>
                <line
                  x1={mX}
                  y1={paddingTop}
                  x2={mX}
                  y2={paddingTop + innerHeight}
                  stroke="#ef4444"
                  strokeWidth="1"
                  strokeDasharray="2,2"
                  opacity="0.7"
                />
                <circle cx={mX} cy={paddingTop + 5} r="3" fill="#ef4444" />
              </g>
            );
          })}

          {/* X Axis Date labels */}
          {timelineData.map((p, idx) => {
            // Render every 2nd or 3rd label if tight
            if (idx % 2 !== 0 && idx !== timelineData.length - 1) return null;
            const x = getX(idx);
            return (
              <text
                key={idx}
                x={x}
                y={paddingTop + innerHeight + 16}
                textAnchor="middle"
                className="fill-slate-400 text-[10px]"
              >
                {p.date}
              </text>
            );
          })}
        </svg>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap items-center justify-center gap-5 text-xs text-slate-500 pt-3 border-t border-slate-100">
        <div className="flex items-center gap-1.5">
          <div
            className="size-2.5 rounded-full"
            style={{ backgroundColor: chartType === "burnup" ? "#6366f1" : "#f59e0b" }}
          />
          <span>{chartType === "burnup" ? "Completado real" : "Restante real"}</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-slate-300" />
          <span>Línea ideal</span>
        </div>
        <div className="flex items-center gap-1.5">
          <div className="w-3 h-0.5 border-t-2 border-dashed border-slate-400" />
          <span>Alcance total ({maxVal})</span>
        </div>
        {milestones.length > 0 && (
          <div className="flex items-center gap-1.5 text-red-600 font-medium">
            <Flag className="size-3" />
            <span>Hitos del proyecto</span>
          </div>
        )}
      </div>
    </WidgetCard>
  );
}
