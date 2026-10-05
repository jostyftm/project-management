"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { WorkItem } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";

interface ProjectStateDonutProps {
  workItems: WorkItem[];
  projectId: string | number;
}

const STATE_GROUPS = [
  { group: "BACKLOG", label: "Backlog", color: "#94a3b8" },
  { group: "UNSTARTED", label: "Por Iniciar", color: "#60a5fa" },
  { group: "STARTED", label: "En Progreso", color: "#f59e0b" },
  { group: "COMPLETED", label: "Completado", color: "#10b981" },
  { group: "CANCELLED", label: "Cancelado", color: "#ef4444" },
];

export function ProjectStateDonut({ workItems, projectId }: ProjectStateDonutProps) {
  const total = workItems.length;

  const distribution = useMemo(() => {
    return STATE_GROUPS.map((sg) => {
      const count = workItems.filter((w) => w.state?.group === sg.group).length;
      const percentage = total > 0 ? (count / total) * 100 : 0;
      return {
        ...sg,
        count,
        percentage,
      };
    });
  }, [workItems, total]);

  // Construir arcos SVG para el Donut
  const size = 160;
  const strokeWidth = 24;
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;

  let currentOffset = 0;
  const segments = distribution.map((item) => {
    const strokeDasharray = `${(item.percentage / 100) * circumference} ${circumference}`;
    const strokeDashoffset = -currentOffset;
    currentOffset += (item.percentage / 100) * circumference;
    return {
      ...item,
      strokeDasharray,
      strokeDashoffset,
    };
  });

  return (
    <WidgetCard
      title="Distribución por Estado"
      description="Work items categorizados por etapa"
      exportFilename="distribucion-por-estado"
    >
      <div className="flex flex-col sm:flex-row items-center justify-center gap-6 py-2">
        {/* SVG Donut */}
        <div className="relative shrink-0" style={{ width: size, height: size }}>
          <svg
            width={size}
            height={size}
            viewBox={`0 0 ${size} ${size}`}
            className="transform -rotate-90"
          >
            {/* Background circle track */}
            <circle
              cx={size / 2}
              cy={size / 2}
              r={radius}
              stroke="#f1f5f9"
              strokeWidth={strokeWidth}
              fill="none"
            />
            {total > 0 &&
              segments.map((seg, idx) => {
                if (seg.count === 0) return null;
                return (
                  <circle
                    key={idx}
                    cx={size / 2}
                    cy={size / 2}
                    r={radius}
                    stroke={seg.color}
                    strokeWidth={strokeWidth}
                    strokeDasharray={seg.strokeDasharray}
                    strokeDashoffset={seg.strokeDashoffset}
                    strokeLinecap="butt"
                    fill="none"
                    className="transition-all duration-500 ease-out"
                  />
                );
              })}
          </svg>

          {/* Centered label */}
          <div className="absolute inset-0 flex flex-col items-center justify-center select-none text-center">
            <span className="text-xl font-bold tracking-tight text-slate-800">
              {total}
            </span>
            <span className="text-[10px] uppercase font-semibold text-slate-400">
              Items
            </span>
          </div>
        </div>

        {/* Legend */}
        <div className="flex flex-col gap-2 w-full max-w-[200px]">
          {distribution.map((item) => (
            <Link
              key={item.group}
              href={`/projects/${projectId}/work-items`}
              className="group flex items-center justify-between text-xs py-1 px-1.5 rounded hover:bg-slate-50 transition-colors"
            >
              <div className="flex items-center gap-2 min-w-0">
                <span
                  className="size-2.5 rounded-full shrink-0"
                  style={{ backgroundColor: item.color }}
                />
                <span className="text-slate-600 group-hover:text-slate-900 truncate">
                  {item.label}
                </span>
              </div>
              <div className="flex items-center gap-1.5 shrink-0 text-slate-500 font-mono">
                <span className="font-semibold text-slate-700">{item.count}</span>
                <span className="text-[10px] text-slate-400">
                  ({Math.round(item.percentage)}%)
                </span>
              </div>
            </Link>
          ))}
        </div>
      </div>
    </WidgetCard>
  );
}
