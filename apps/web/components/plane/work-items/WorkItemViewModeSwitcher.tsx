"use client";

import React from "react";
import { PanelRight, AppWindow, Maximize2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";

export type WorkItemViewMode = "sheet" | "modal" | "page";

interface WorkItemViewModeSwitcherProps {
  currentMode: WorkItemViewMode;
  onChangeMode: (mode: WorkItemViewMode) => void;
  className?: string;
}

export function WorkItemViewModeSwitcher({
  currentMode,
  onChangeMode,
  className,
}: WorkItemViewModeSwitcherProps) {
  const modes: { mode: WorkItemViewMode; label: string; icon: React.ComponentType<{ className?: string }> }[] = [
    { mode: "sheet", label: "Panel lateral (Sheet)", icon: PanelRight },
    { mode: "modal", label: "Modal centrado (Dialog)", icon: AppWindow },
    { mode: "page", label: "Vista completa (Página)", icon: Maximize2 },
  ];

  return (
    <TooltipProvider delayDuration={150}>
      <div
        className={cn(
          "inline-flex items-center gap-0.5 p-0.5 rounded-lg border border-slate-200/80 bg-slate-100/80 dark:border-slate-800 dark:bg-slate-900/80",
          className
        )}
      >
        {modes.map(({ mode, label, icon: Icon }) => {
          const isActive = currentMode === mode;
          return (
            <Tooltip key={mode}>
              <TooltipTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="icon"
                  onClick={() => onChangeMode(mode)}
                  className={cn(
                    "size-6 rounded-md p-1 transition-all cursor-pointer",
                    isActive
                      ? "bg-white dark:bg-slate-800 text-indigo-600 dark:text-indigo-400 shadow-2xs font-semibold"
                      : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 hover:bg-slate-200/50"
                  )}
                >
                  <Icon className="size-3.5" />
                  <span className="sr-only">{label}</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent side="bottom" className="text-xs py-1 px-2">
                {label}
              </TooltipContent>
            </Tooltip>
          );
        })}
      </div>
    </TooltipProvider>
  );
}
