"use client";

import React, { useMemo } from "react";
import Link from "next/link";
import { WorkItem } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";

interface ProjectPriorityBarProps {
  workItems: WorkItem[];
  projectId: string | number;
}

const PRIORITIES = [
  { id: "URGENT", label: "Urgente", color: "#ef4444" },
  { id: "HIGH", label: "Alta", color: "#f97316" },
  { id: "MEDIUM", label: "Media", color: "#f59e0b" },
  { id: "LOW", label: "Baja", color: "#3b82f6" },
  { id: "NONE", label: "Ninguna", color: "#94a3b8" },
];

export function ProjectPriorityBar({ workItems, projectId }: ProjectPriorityBarProps) {
  const total = workItems.length;

  const data = useMemo(() => {
    const maxCount = Math.max(
      1,
      ...PRIORITIES.map(
        (p) => workItems.filter((w) => (w.priority || "NONE") === p.id).length
      )
    );

    return PRIORITIES.map((p) => {
      const count = workItems.filter((w) => (w.priority || "NONE") === p.id).length;
      const percentageOfTotal = total > 0 ? (count / total) * 100 : 0;
      const barFillRatio = count / maxCount;
      return {
        ...p,
        count,
        percentageOfTotal,
        barFillRatio,
      };
    });
  }, [workItems, total]);

  return (
    <WidgetCard
      title="Work Items por Prioridad"
      description="Nivel de urgencia del trabajo pendiente"
      exportFilename="workitems-por-prioridad"
    >
      <div className="space-y-3 py-1">
        {data.map((item) => (
          <Link
            key={item.id}
            href={`/projects/${projectId}/work-items`}
            className="group block space-y-1 hover:opacity-90 transition-opacity"
          >
            <div className="flex items-center justify-between text-xs">
              <span className="font-medium text-slate-700 group-hover:text-indigo-600 transition-colors">
                {item.label}
              </span>
              <div className="flex items-center gap-1.5 font-mono text-slate-500">
                <span className="font-semibold text-slate-800">{item.count}</span>
                <span className="text-[10px] text-slate-400">
                  ({Math.round(item.percentageOfTotal)}%)
                </span>
              </div>
            </div>

            {/* SVG Horizontal Bar */}
            <div className="w-full bg-slate-100 rounded-full h-2.5 overflow-hidden">
              <div
                className="h-full rounded-full transition-all duration-500 ease-out"
                style={{
                  width: `${Math.max(item.count > 0 ? 5 : 0, item.barFillRatio * 100)}%`,
                  backgroundColor: item.color,
                }}
              />
            </div>
          </Link>
        ))}
      </div>
    </WidgetCard>
  );
}
