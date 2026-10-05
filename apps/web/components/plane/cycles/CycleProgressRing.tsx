"use client";

import React from "react";
import { cn } from "@/lib/utils";

interface CycleProgressRingProps {
  progress: number; // 0 to 100
  size?: number; // e.g. 44
  strokeWidth?: number; // e.g. 3.5
  className?: string;
}

export function CycleProgressRing({
  progress = 36,
  size = 42,
  strokeWidth = 3.5,
  className,
}: CycleProgressRingProps) {
  const normalizedProgress = Math.min(100, Math.max(0, progress));
  const radius = (size - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (normalizedProgress / 100) * circumference;

  return (
    <div className={cn("relative inline-flex items-center justify-center shrink-0", className)} style={{ width: size, height: size }}>
      <svg
        width={size}
        height={size}
        viewBox={`0 0 ${size} ${size}`}
        className="transform -rotate-90"
      >
        {/* Track */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          fill="none"
          className="text-slate-200 dark:text-slate-800"
        />
        {/* Progress Fill */}
        <circle
          cx={size / 2}
          cy={size / 2}
          r={radius}
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          strokeLinecap="round"
          fill="none"
          className="text-emerald-500 transition-all duration-500 ease-out"
        />
      </svg>
      {/* Centered label */}
      <span className="absolute text-[11px] font-bold text-slate-800 dark:text-slate-200 select-none">
        {Math.round(normalizedProgress)}%
      </span>
    </div>
  );
}
