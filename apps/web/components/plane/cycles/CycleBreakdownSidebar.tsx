"use client";

import React from "react";
import { CycleBreakdown } from "@/types/plane-types";
import { TrendingDown, Info, CircleHelp } from "lucide-react";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

interface CycleBreakdownSidebarProps {
  breakdown?: CycleBreakdown;
  filterBy?: "work_items" | "estimates";
  className?: string;
}

const EMPTY_BREAKDOWN: CycleBreakdown = {
  scope: 0,
  pending: 0,
  started: 0,
  done: 0,
  unstarted: 0,
  backlog: 0,
  cancelled: 0,
  today_ideal_pending: 0,
  trailing_count: 0,
};

export function CycleBreakdownSidebar({
  breakdown = EMPTY_BREAKDOWN,
  filterBy = "work_items",
  className,
}: CycleBreakdownSidebarProps) {
  const isEstimates = filterBy === "estimates";
  const multiplier = isEstimates ? 2.5 : 1;
  const unit = isEstimates ? "pts" : "";

  const scopeVal = Math.round(breakdown.scope * multiplier);
  const pendingVal = Math.round(breakdown.pending * multiplier);
  const startedVal = Math.round(breakdown.started * multiplier);
  const idealPendingVal = Math.round(breakdown.today_ideal_pending * multiplier);
  const trailingVal = Math.round(breakdown.trailing_count * multiplier);
  const doneVal = Math.round(breakdown.done * multiplier);
  const unstartedVal = Math.round(breakdown.unstarted * multiplier);
  const backlogVal = Math.round(breakdown.backlog * multiplier);
  const cancelledVal = Math.round(breakdown.cancelled * multiplier);

  return (
    <aside
      className={cn(
        "w-full lg:w-[280px] shrink-0 border-r border-slate-100 dark:border-slate-800 pr-5 space-y-5 text-sm",
        className
      )}
    >
      {/* Title */}
      <div>
        <h3 className="font-bold text-slate-900 dark:text-slate-100 text-sm tracking-tight">
          Breakdown of this cycle&apos;s work items
        </h3>
      </div>

      {/* Trailing Alert */}
      {trailingVal > 0 ? (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-red-50/90 dark:bg-red-950/40 border border-red-100 dark:border-red-900/40 text-red-600 dark:text-red-400">
          <TrendingDown className="size-4 shrink-0 text-red-500" />
          <span className="font-semibold text-xs leading-tight">
            Trailing by {trailingVal} {isEstimates ? "estimate points" : "work items"}
          </span>
          <span className="text-sm select-none ml-auto" role="img" aria-label="runner">
            🏃
          </span>
        </div>
      ) : (
        <div className="flex items-center gap-2 p-2.5 rounded-lg bg-emerald-50 dark:bg-emerald-950/40 border border-emerald-100 dark:border-emerald-900/40 text-emerald-600 dark:text-emerald-400">
          <span className="font-semibold text-xs leading-tight">
            On track with ideal plan 🎉
          </span>
        </div>
      )}

      {/* Section 1: Work Items by stategroups on chart */}
      <div className="space-y-3 pt-1">
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          {isEstimates ? "Estimates by stategroups on chart" : "Work Items by stategroups on chart"}
        </h4>

        <div className="space-y-2.5">
          {/* Today's ideal Pending */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-0 border-b-2 border-dashed border-blue-500 shrink-0" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Today&apos;s ideal Pending
              </span>
            </div>
            <span className="font-bold text-slate-800 dark:text-slate-200">
              {idealPendingVal} {unit}
            </span>
          </div>

          {/* Pending */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 bg-emerald-500 shrink-0 rounded-full" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Pending
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded font-bold text-[11px] bg-emerald-100 text-emerald-800 dark:bg-emerald-950/60 dark:text-emerald-300">
              {pendingVal} {unit}
            </span>
          </div>

          {/* Started */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 bg-orange-500 shrink-0 rounded-full" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Started
              </span>
            </div>
            <span className="px-1.5 py-0.5 rounded font-bold text-[11px] bg-orange-100 text-orange-800 dark:bg-orange-950/60 dark:text-orange-300">
              {startedVal} {unit}
            </span>
          </div>

          {/* Scope */}
          <div className="flex items-center justify-between text-xs">
            <div className="flex items-center gap-2">
              <span className="w-5 h-0.5 bg-slate-900 dark:bg-slate-300 shrink-0 rounded-full" />
              <span className="text-slate-600 dark:text-slate-300 font-medium">
                Scope
              </span>
            </div>
            <span className="font-bold text-slate-900 dark:text-slate-100">
              {scopeVal} {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Section 2: Other stategroups */}
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-slate-800">
        <h4 className="text-xs font-bold text-slate-500 dark:text-slate-400 uppercase tracking-wider">
          Other stategroups
        </h4>

        <div className="space-y-2">
          {/* Done */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-emerald-500 shrink-0" />
              <span>Done</span>
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {doneVal} {unit}
            </span>
          </div>

          {/* Unstarted */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-slate-400 shrink-0" />
              <span>Unstarted</span>
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {unstartedVal} {unit}
            </span>
          </div>

          {/* Backlog */}
          <div className="flex items-center justify-between text-xs text-slate-600 dark:text-slate-300">
            <div className="flex items-center gap-2">
              <span className="size-2 rounded-full bg-slate-300 shrink-0" />
              <span>Backlog</span>
            </div>
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {backlogVal} {unit}
            </span>
          </div>
        </div>
      </div>

      {/* Footer Info: Excluded cancelled work items */}
      <div className="pt-3 border-t border-slate-100 dark:border-slate-800">
        <TooltipProvider delayDuration={150}>
          <Tooltip>
            <TooltipTrigger asChild>
              <div className="flex items-center gap-1.5 text-xs text-slate-400 hover:text-slate-600 dark:hover:text-slate-300 cursor-help transition-colors">
                <Info className="size-3.5 shrink-0" />
                <span>
                  Excluded {cancelledVal} cancelled {isEstimates ? "pts" : "work items"}
                </span>
              </div>
            </TooltipTrigger>
            <TooltipContent side="top" className="text-xs max-w-xs">
              Los elementos de trabajo cancelados no se contabilizan en el gráfico de quemado para no distorsionar la velocidad real del sprint.
            </TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </div>
    </aside>
  );
}
