"use client";

import React, { useState, useRef, useEffect } from "react";
import { CycleDayData } from "@/types/plane-types";
import { Check, ChevronDown, Layers, Calendar } from "lucide-react";
import { cn } from "@/lib/utils";

interface CycleBurndownChartProps {
  timeline?: {
    dates: string[];
    work_items: CycleDayData[];
    estimates: CycleDayData[];
  };
  todayIndex?: number;
  todayDate?: string;
  filterBy: "work_items" | "estimates";
  onFilterByChange: (val: "work_items" | "estimates") => void;
  chartType: "burndown" | "burnup";
  onChartTypeChange: (val: "burndown" | "burnup") => void;
  className?: string;
}

// Fallback timeline dataset matching the official sprint specification
const DEFAULT_DATES = [
  "Sep 21", "Sep 22", "Sep 23", "Sep 24", "Sep 25", "Sep 26",
  "Sep 27", "Sep 28", "Sep 29", "Sep 30", "Oct 01", "Oct 02"
];

const DEFAULT_WORK_ITEMS: CycleDayData[] = [
  { date: "Sep 21", full_date: "2026-09-21", scope: 11, pending: 11, started: 0, completed: 0, ideal_pending: 11.0, ideal_completed: 0.0 },
  { date: "Sep 22", full_date: "2026-09-22", scope: 11, pending: 11, started: 0, completed: 0, ideal_pending: 10.0, ideal_completed: 1.0 },
  { date: "Sep 23", full_date: "2026-09-23", scope: 11, pending: 11, started: 0, completed: 0, ideal_pending: 9.0, ideal_completed: 2.0 },
  { date: "Sep 24", full_date: "2026-09-24", scope: 11, pending: 9, started: 1, completed: 1, ideal_pending: 8.0, ideal_completed: 3.0 },
  { date: "Sep 25", full_date: "2026-09-25", scope: 11, pending: 7, started: 1, completed: 3, ideal_pending: 7.0, ideal_completed: 4.0 },
  { date: "Sep 26", full_date: "2026-09-26", scope: 11, pending: 7, started: 0, completed: 4, ideal_pending: 6.0, ideal_completed: 5.0 },
  { date: "Sep 27", full_date: "2026-09-27", scope: 11, pending: 7, started: 0, completed: 4, ideal_pending: 5.0, ideal_completed: 6.0 },
  { date: "Sep 28", full_date: "2026-09-28", scope: 11, pending: 7, started: 0, completed: 4, ideal_pending: 4.0, ideal_completed: 7.0 },
  { date: "Sep 29", full_date: "2026-09-29", scope: 11, pending: 7, started: 0, completed: 4, ideal_pending: 3.0, ideal_completed: 8.0 },
  { date: "Sep 30", full_date: "2026-09-30", scope: 11, pending: 7, started: 0, completed: 4, ideal_pending: 2.0, ideal_completed: 9.0 },
  { date: "Oct 01", full_date: "2026-10-01", scope: 11, pending: 7, started: 0, completed: 4, ideal_pending: 1.0, ideal_completed: 10.0 },
  { date: "Oct 02", full_date: "2026-10-02", scope: 11, pending: 7, started: 0, completed: 4, ideal_pending: 0.0, ideal_completed: 11.0 },
];

const DEFAULT_ESTIMATES: CycleDayData[] = DEFAULT_WORK_ITEMS.map((item) => ({
  ...item,
  scope: Math.round(item.scope * 2.5),
  pending: Math.round(item.pending * 2.5),
  started: Math.round(item.started * 2.5),
  completed: Math.round(item.completed * 2.5),
  ideal_pending: Math.round(item.ideal_pending * 2.5 * 10) / 10,
  ideal_completed: Math.round(item.ideal_completed * 2.5 * 10) / 10,
}));

export function CycleBurndownChart({
  timeline,
  todayIndex: propTodayIndex,
  todayDate: propTodayDate,
  filterBy,
  onFilterByChange,
  chartType,
  onChartTypeChange,
  className,
}: CycleBurndownChartProps) {
  // Dropdown states: filter dropdown is opened by default as specified in UI spec
  const [isFilterDropdownOpen, setIsFilterDropdownOpen] = useState(true);
  const [isChartTypeDropdownOpen, setIsChartTypeDropdownOpen] = useState(false);
  const [hoveredIndex, setHoveredIndex] = useState<number | null>(null);

  const containerRef = useRef<HTMLDivElement>(null);
  const filterDropdownRef = useRef<HTMLDivElement>(null);
  const chartTypeDropdownRef = useRef<HTMLDivElement>(null);

  // Close menus on outside click if needed
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        filterDropdownRef.current &&
        !filterDropdownRef.current.contains(event.target as Node)
      ) {
        // Allow user to close it when clicking elsewhere
      }
      if (
        chartTypeDropdownRef.current &&
        !chartTypeDropdownRef.current.contains(event.target as Node)
      ) {
        setIsChartTypeDropdownOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Determine dataset
  const dates = timeline?.dates?.length ? timeline.dates : DEFAULT_DATES;
  const isEstimates = filterBy === "estimates";
  const rawSeries = isEstimates
    ? (timeline?.estimates?.length ? timeline.estimates : DEFAULT_ESTIMATES)
    : (timeline?.work_items?.length ? timeline.work_items : DEFAULT_WORK_ITEMS);

  // Calculate dynamic today index
  const todayIndex = (() => {
    if (typeof propTodayIndex === "number" && propTodayIndex >= 0 && propTodayIndex < dates.length) {
      return propTodayIndex;
    }
    const todayStr = propTodayDate || new Date().toISOString().split("T")[0];
    const matchIdx = rawSeries.findIndex((pt) => pt.full_date === todayStr);
    if (matchIdx !== -1) return matchIdx;

    if (rawSeries[0]?.full_date && todayStr < rawSeries[0].full_date) return 0;
    if (rawSeries.length > 0 && todayStr > rawSeries[rawSeries.length - 1]?.full_date) return dates.length - 1;

    return Math.min(dates.length - 1, Math.max(0, Math.floor(dates.length / 2)));
  })();

  const unit = isEstimates ? "pts" : "";

  // SVG dimensions
  const viewBoxWidth = 840;
  const viewBoxHeight = 340;
  const padLeft = 65;
  const padRight = 35;
  const padTop = 35;
  const padBottom = 45;

  const chartWidth = viewBoxWidth - padLeft - padRight;
  const chartHeight = viewBoxHeight - padTop - padBottom;

  // Dynamic Max Y value & clean ticks
  const rawMax = Math.max(
    1,
    ...rawSeries.map((d) => Math.max(
      d.scope || 0,
      d.pending || 0,
      d.completed || 0,
      d.started || 0,
      d.ideal_pending || 0,
      d.ideal_completed || 0
    ))
  );
  const maxVal = rawMax <= 5 ? 5 : rawMax <= 10 ? 10 : Math.ceil(rawMax / 5) * 5;
  const yTicks = [0, Math.round(maxVal * 0.25), Math.round(maxVal * 0.5), Math.round(maxVal * 0.75), maxVal];

  // Helper coordinate converters
  const getX = (index: number) => {
    const total = Math.max(1, dates.length - 1);
    return padLeft + (index / total) * chartWidth;
  };

  const getY = (val: number) => {
    const ratio = Math.max(0, Math.min(1, val / maxVal));
    return padTop + chartHeight - ratio * chartHeight;
  };

  // Build SVG Paths
  // 1. Scope line: straight horizontal line
  const scopeVal = rawSeries[0]?.scope ?? 0;
  const scopeY = getY(scopeVal);
  const scopePath = `M ${getX(0)} ${scopeY} L ${getX(dates.length - 1)} ${scopeY}`;

  // 2. Ideal line: diagonal
  // In Burndown: from (0, scope) to (last, 0)
  // In Burnup: from (0, 0) to (last, scope)
  const idealPath =
    chartType === "burndown"
      ? `M ${getX(0)} ${getY(scopeVal)} L ${getX(dates.length - 1)} ${getY(0)}`
      : `M ${getX(0)} ${getY(0)} L ${getX(dates.length - 1)} ${getY(scopeVal)}`;

  // 3. Primary line: Pending (Burndown) or Completed (Burnup) up to todayIndex
  const activePoints = rawSeries.slice(0, todayIndex + 1);

  const primaryPath = activePoints
    .map((pt, i) => {
      const val = chartType === "burndown" ? pt.pending : pt.completed;
      const cmd = i === 0 ? "M" : "L";
      return `${cmd} ${getX(i)} ${getY(val)}`;
    })
    .join(" ");

  // 4. Started line (in Burndown / Burnup) up to todayIndex
  const startedPath = activePoints
    .map((pt, i) => {
      const cmd = i === 0 ? "M" : "L";
      return `${cmd} ${getX(i)} ${getY(pt.started)}`;
    })
    .join(" ");

  // 5. Light green area under primary curve
  const primaryAreaPath = (() => {
    if (activePoints.length === 0) return "";
    const startX = getX(0);
    const endX = getX(todayIndex);
    const bottomY = getY(0);

    const linePoints = activePoints
      .map((pt, i) => {
        const val = chartType === "burndown" ? pt.pending : pt.completed;
        return `L ${getX(i)} ${getY(val)}`;
      })
      .join(" ");

    return `M ${startX} ${bottomY} ${linePoints} L ${endX} ${bottomY} Z`;
  })();

  // 6. Red lag area (between Pending and Ideal Pending when Pending > Ideal in Burndown)
  const redLagAreaPath = (() => {
    if (chartType !== "burndown" || activePoints.length === 0) return "";
    // Find the first index in activePoints where pending > ideal_pending
    const lagStartIndex = activePoints.findIndex((pt) => pt.pending > pt.ideal_pending);
    if (lagStartIndex === -1 || lagStartIndex > todayIndex) return "";

    const startX = getX(lagStartIndex);
    const endX = getX(todayIndex);

    // Forward along pending
    let path = `M ${startX} ${getY(rawSeries[lagStartIndex].ideal_pending)}`;
    for (let i = lagStartIndex; i <= todayIndex; i++) {
      path += ` L ${getX(i)} ${getY(rawSeries[i].pending)}`;
    }
    // Backward along ideal
    for (let i = todayIndex; i >= lagStartIndex; i--) {
      path += ` L ${getX(i)} ${getY(rawSeries[i].ideal_pending)}`;
    }
    path += " Z";
    return path;
  })();

  // 7. Future zone rectangle from today to end
  const futureZoneX = getX(todayIndex);
  const futureZoneWidth = Math.max(0, getX(dates.length - 1) - futureZoneX);
  const futureZoneY = padTop;
  const futureZoneHeight = chartHeight;

  // Mouse hover event handler
  const handleMouseMove = (e: React.MouseEvent<SVGSVGElement>) => {
    const svgRect = e.currentTarget.getBoundingClientRect();
    const clientX = e.clientX - svgRect.left;
    // Map to viewBox coordinate
    const svgX = (clientX / svgRect.width) * viewBoxWidth;

    if (svgX < padLeft || svgX > viewBoxWidth - padRight) {
      setHoveredIndex(null);
      return;
    }

    const stepWidth = chartWidth / (dates.length - 1);
    const index = Math.round((svgX - padLeft) / stepWidth);
    const clampedIndex = Math.max(0, Math.min(dates.length - 1, index));
    setHoveredIndex(clampedIndex);
  };

  const handleMouseLeave = () => {
    setHoveredIndex(null);
  };

  const hoveredData = hoveredIndex !== null ? rawSeries[hoveredIndex] : null;

  return (
    <div
      ref={containerRef}
      className={cn(
        "flex-1 flex flex-col min-w-0 bg-white dark:bg-slate-900 rounded-xl p-4 lg:p-6 transition-colors",
        className
      )}
    >
      {/* Top Controls Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 mb-6 relative z-20">
        <div className="flex items-center gap-2">
          {/* Dropdown 1: Burn-down / Burn-up */}
          <div className="relative" ref={chartTypeDropdownRef}>
            <button
              type="button"
              onClick={() => setIsChartTypeDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs transition"
            >
              <span>{chartType === "burndown" ? "Burn-down" : "Burn-up"}</span>
              <ChevronDown className="size-3.5 text-slate-500" />
            </button>

            {isChartTypeDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-36 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30 animate-in fade-in-0 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    onChartTypeChange("burndown");
                    setIsChartTypeDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                    chartType === "burndown"
                      ? "font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60"
                      : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <span>Burn-down</span>
                  {chartType === "burndown" && <Check className="size-3.5 text-blue-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onChartTypeChange("burnup");
                    setIsChartTypeDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                    chartType === "burnup"
                      ? "font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60"
                      : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <span>Burn-up</span>
                  {chartType === "burnup" && <Check className="size-3.5 text-blue-600" />}
                </button>
              </div>
            )}
          </div>

          {/* Dropdown 2: for Work items / for Estimates (Open by default as per spec) */}
          <div className="relative" ref={filterDropdownRef}>
            <button
              type="button"
              onClick={() => setIsFilterDropdownOpen((prev) => !prev)}
              className="inline-flex items-center gap-2 px-3 py-1.5 text-xs font-semibold text-slate-800 dark:text-slate-100 bg-slate-50 dark:bg-slate-800 hover:bg-slate-100 dark:hover:bg-slate-700/80 rounded-md border border-slate-200 dark:border-slate-700 shadow-2xs transition"
            >
              <span>for {filterBy === "work_items" ? "Work items" : "Estimates"}</span>
              <ChevronDown className="size-3.5 text-slate-500" />
            </button>

            {isFilterDropdownOpen && (
              <div className="absolute left-0 top-full mt-1.5 w-44 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 shadow-xl py-1 z-30 animate-in fade-in-0 zoom-in-95">
                <button
                  type="button"
                  onClick={() => {
                    onFilterByChange("work_items");
                    setIsFilterDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                    filterBy === "work_items"
                      ? "font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60"
                      : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <span>Work items</span>
                  {filterBy === "work_items" && <Check className="size-3.5 text-blue-600" />}
                </button>
                <button
                  type="button"
                  onClick={() => {
                    onFilterByChange("estimates");
                    setIsFilterDropdownOpen(false);
                  }}
                  className={cn(
                    "w-full flex items-center justify-between px-3 py-2 text-xs text-left hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors",
                    filterBy === "estimates"
                      ? "font-semibold text-slate-900 dark:text-slate-100 bg-slate-50 dark:bg-slate-800/60"
                      : "text-slate-600 dark:text-slate-400"
                  )}
                >
                  <span>Estimates</span>
                  {filterBy === "estimates" && <Check className="size-3.5 text-blue-600" />}
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Legend Indicators */}
        <div className="flex items-center gap-3.5 text-[11px] font-medium text-slate-500 dark:text-slate-400">
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-slate-900 dark:bg-slate-200 rounded-full" />
            <span>Scope</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-emerald-500 rounded-full" />
            <span>{chartType === "burndown" ? "Pending" : "Completed"}</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3 h-0.5 bg-orange-500 rounded-full" />
            <span>Started</span>
          </div>
          <div className="flex items-center gap-1.5">
            <span className="w-3.5 h-0 border-b-2 border-dashed border-blue-500" />
            <span>Ideal</span>
          </div>
        </div>
      </div>

      {/* Main SVG Chart Container */}
      <div className="relative w-full h-[340px] select-none">
        <svg
          viewBox={`0 0 ${viewBoxWidth} ${viewBoxHeight}`}
          className="w-full h-full overflow-visible"
          onMouseMove={handleMouseMove}
          onMouseLeave={handleMouseLeave}
        >
          <defs>
            {/* Gradients */}
            <linearGradient id="greenAreaGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#10b981" stopOpacity="0.18" />
              <stop offset="100%" stopColor="#10b981" stopOpacity="0.02" />
            </linearGradient>
            <linearGradient id="redLagGrad" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0%" stopColor="#ef4444" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#ef4444" stopOpacity="0.08" />
            </linearGradient>
            <linearGradient id="futureZoneGrad" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="#3b82f6" stopOpacity="0.06" />
              <stop offset="100%" stopColor="#3b82f6" stopOpacity="0.02" />
            </linearGradient>
          </defs>

          {/* 1. Shaded Region: Future sprint zone (from Sep 27 to end) */}
          <rect
            x={futureZoneX}
            y={futureZoneY}
            width={futureZoneWidth}
            height={futureZoneHeight}
            fill="url(#futureZoneGrad)"
          />

          {/* 2. Shaded Region: Green under Pending / Completed line */}
          <path d={primaryAreaPath} fill="url(#greenAreaGrad)" />

          {/* 3. Shaded Region: Red lag zone between Pending and Ideal */}
          {redLagAreaPath && (
            <path d={redLagAreaPath} fill="url(#redLagGrad)" />
          )}

          {/* 4. Horizontal Grid Lines and Y-Axis Labels */}
          {yTicks.map((tickVal) => {
            const y = getY(tickVal);
            return (
              <g key={`y-tick-${tickVal}`}>
                <line
                  x1={padLeft}
                  y1={y}
                  x2={viewBoxWidth - padRight}
                  y2={y}
                  stroke="currentColor"
                  strokeOpacity="0.07"
                  strokeWidth="1"
                />
                <text
                  x={padLeft - 12}
                  y={y + 4}
                  textAnchor="end"
                  className="text-[11px] font-medium fill-slate-400 dark:fill-slate-500"
                >
                  {tickVal}
                </text>
              </g>
            );
          })}

          {/* Y-Axis Label */}
          <text
            x={padLeft}
            y={padTop - 14}
            textAnchor="start"
            className="text-[10px] font-bold uppercase tracking-wider fill-slate-400 dark:fill-slate-500"
          >
            {isEstimates ? "ESTIMATES" : "WORK ITEMS"}
          </text>

          {/* 5. X-Axis Labels */}
          {dates.map((dateStr, i) => {
            const x = getX(i);
            const isToday = i === todayIndex;
            return (
              <g key={`x-tick-${dateStr}-${i}`}>
                <text
                  x={x}
                  y={padTop + chartHeight + 20}
                  textAnchor="middle"
                  className={cn(
                    "text-[10px] font-medium transition-colors",
                    isToday
                      ? "font-bold fill-slate-900 dark:fill-slate-100"
                      : "fill-slate-400 dark:fill-slate-500"
                  )}
                >
                  {dateStr.toLowerCase()}
                </text>
              </g>
            );
          })}

          {/* 6. Vertical Today Line (Sep 27) */}
          <g>
            <line
              x1={getX(todayIndex)}
              y1={padTop - 8}
              x2={getX(todayIndex)}
              y2={padTop + chartHeight}
              stroke="currentColor"
              className="text-slate-800 dark:text-slate-200"
              strokeWidth="1.5"
              strokeDasharray="3 3"
            />
            {/* Today pill badge at the top */}
            <g transform={`translate(${getX(todayIndex)}, ${padTop - 12})`}>
              <rect
                x="-24"
                y="-14"
                width="48"
                height="16"
                rx="4"
                className="fill-slate-900 dark:fill-slate-100"
              />
              <text
                x="0"
                y="-3"
                textAnchor="middle"
                className="text-[9px] font-bold fill-white dark:fill-slate-900"
              >
                {dates[todayIndex]?.toLowerCase() || "hoy"}
              </text>
            </g>
          </g>

          {/* 7. Ideal Line (Diagonal dashed blue) */}
          <path
            d={idealPath}
            stroke="#3b82f6"
            strokeWidth="2"
            strokeDasharray="4 4"
            fill="none"
          />

          {/* 8. Scope Line (Solid dark blue/slate) */}
          <path
            d={scopePath}
            stroke="currentColor"
            className="text-slate-900 dark:text-slate-200"
            strokeWidth="2"
            fill="none"
          />

          {/* 9. Started Line (Orange) */}
          <path
            d={startedPath}
            stroke="#f97316"
            strokeWidth="2"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* 10. Primary Line (Pending = Green, or Completed = Green) */}
          <path
            d={primaryPath}
            stroke="#10b981"
            strokeWidth="2.5"
            fill="none"
            strokeLinecap="round"
            strokeLinejoin="round"
          />

          {/* Data Points on Primary Line up to Today */}
          {activePoints.map((pt, i) => {
            const val = chartType === "burndown" ? pt.pending : pt.completed;
            const cx = getX(i);
            const cy = getY(val);
            const isHovered = hoveredIndex === i;

            return (
              <circle
                key={`primary-pt-${i}`}
                cx={cx}
                cy={cy}
                r={isHovered ? 5.5 : 3.5}
                className="fill-white dark:fill-slate-900 transition-all"
                stroke="#10b981"
                strokeWidth={isHovered ? 2.5 : 2}
              />
            );
          })}

          {/* Data Points on Started Line up to Today */}
          {activePoints.map((pt, i) => {
            const cx = getX(i);
            const cy = getY(pt.started);
            const isHovered = hoveredIndex === i;

            return (
              <circle
                key={`started-pt-${i}`}
                cx={cx}
                cy={cy}
                r={isHovered ? 4.5 : 2.5}
                className="fill-white dark:fill-slate-900 transition-all"
                stroke="#f97316"
                strokeWidth="1.8"
              />
            );
          })}

          {/* 11. Crosshair Hover Indicator */}
          {hoveredIndex !== null && (
            <g>
              <line
                x1={getX(hoveredIndex)}
                y1={padTop}
                x2={getX(hoveredIndex)}
                y2={padTop + chartHeight}
                stroke="#94a3b8"
                strokeWidth="1"
                strokeDasharray="2 2"
              />
              {/* Highlight circle on ideal line */}
              {hoveredData && (
                <circle
                  cx={getX(hoveredIndex)}
                  cy={getY(chartType === "burndown" ? hoveredData.ideal_pending : hoveredData.ideal_completed)}
                  r={4}
                  fill="#3b82f6"
                  stroke="white"
                  strokeWidth="1.5"
                />
              )}
            </g>
          )}
        </svg>

        {/* Floating Tooltip Card */}
        {hoveredIndex !== null && hoveredData && (
          <div
            className="absolute pointer-events-none z-30 transition-transform duration-75 ease-out"
            style={{
              left: `${(getX(hoveredIndex) / viewBoxWidth) * 100}%`,
              top: "15%",
              transform:
                hoveredIndex > 7
                  ? "translate(calc(-100% - 16px), 0)"
                  : "translate(16px, 0)",
            }}
          >
            <div className="bg-slate-900/95 text-white dark:bg-slate-800/95 dark:text-slate-100 text-xs rounded-lg shadow-2xl p-3 border border-slate-700/60 backdrop-blur-xs min-w-[170px] space-y-2">
              <div className="flex items-center justify-between pb-1.5 border-b border-slate-700/50">
                <span className="font-bold text-[11px] text-slate-300">
                  {hoveredData.full_date || hoveredData.date}
                </span>
                {hoveredIndex === todayIndex && (
                  <span className="text-[10px] font-semibold text-emerald-400 bg-emerald-950/60 px-1.5 py-0.5 rounded">
                    Hoy
                  </span>
                )}
              </div>

              <div className="space-y-1 text-[11px]">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400">Scope:</span>
                  <span className="font-semibold">{hoveredData.scope} {unit}</span>
                </div>
                {chartType === "burndown" ? (
                  <div className="flex items-center justify-between text-emerald-400 font-medium">
                    <span>Pending:</span>
                    <span className="font-bold">{hoveredData.pending} {unit}</span>
                  </div>
                ) : (
                  <div className="flex items-center justify-between text-emerald-400 font-medium">
                    <span>Completed:</span>
                    <span className="font-bold">{hoveredData.completed} {unit}</span>
                  </div>
                )}
                <div className="flex items-center justify-between text-orange-400 font-medium">
                  <span>Started:</span>
                  <span className="font-bold">{hoveredData.started} {unit}</span>
                </div>
                <div className="flex items-center justify-between text-blue-400 font-medium">
                  <span>Ideal {chartType === "burndown" ? "Pending" : "Completed"}:</span>
                  <span className="font-bold">
                    {chartType === "burndown" ? hoveredData.ideal_pending : hoveredData.ideal_completed} {unit}
                  </span>
                </div>
              </div>

              {chartType === "burndown" && hoveredData.pending > hoveredData.ideal_pending && (
                <div className="pt-1 border-t border-slate-700/50 text-[10px] text-red-400 font-medium">
                  Trailing by {Math.round((hoveredData.pending - hoveredData.ideal_pending) * 10) / 10} {isEstimates ? "estimate pts" : "work items"}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
