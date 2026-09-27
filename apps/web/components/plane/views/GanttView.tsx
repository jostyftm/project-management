"use client";

import React, { useState, useMemo } from "react";
import { WorkItem } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, GanttChart, Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface GanttViewProps {
  items: WorkItem[];
  onCardClick: (item: WorkItem) => void;
}

export function GanttView({ items, onCardClick }: GanttViewProps) {
  const [startDateOffset, setStartDateOffset] = useState<number>(0); // Days offset from today
  const totalDays = 21; // 3-week window for clean Gantt visibility

  const baseDate = useMemo(() => {
    const d = new Date();
    d.setDate(d.getDate() + startDateOffset);
    d.setHours(0, 0, 0, 0);
    return d;
  }, [startDateOffset]);

  const timelineDays = useMemo(() => {
    const days: { date: Date; dateStr: string; label: string; dayNum: number; isToday: boolean }[] = [];
    const todayStr = new Date().toISOString().split("T")[0];

    for (let i = 0; i < totalDays; i++) {
      const d = new Date(baseDate);
      d.setDate(d.getDate() + i);
      const dateStr = d.toISOString().split("T")[0];
      const dayNames = ["Dom", "Lun", "Mar", "Mié", "Jue", "Vie", "Sáb"];
      days.push({
        date: d,
        dateStr,
        label: dayNames[d.getDay()],
        dayNum: d.getDate(),
        isToday: dateStr === todayStr,
      });
    }
    return days;
  }, [baseDate, totalDays]);

  const windowStartStr = timelineDays[0]?.dateStr;
  const windowEndStr = timelineDays[totalDays - 1]?.dateStr;

  const handlePrev = () => setStartDateOffset((prev) => prev - 7);
  const handleNext = () => setStartDateOffset((prev) => prev + 7);
  const handleToday = () => setStartDateOffset(0);

  // Calculate Gantt bar placement for an item
  const getBarPosition = (item: WorkItem) => {
    if (!item.start_date && !item.target_date) return null;

    const start = item.start_date || item.target_date!;
    const end = item.target_date || item.start_date!;

    // Find indices in timelineDays
    let startIndex = timelineDays.findIndex((d) => d.dateStr === start);
    let endIndex = timelineDays.findIndex((d) => d.dateStr === end);

    // If completely outside window
    if (end < windowStartStr || start > windowEndStr) {
      return null;
    }

    if (startIndex === -1) {
      startIndex = start < windowStartStr ? 0 : totalDays - 1;
    }
    if (endIndex === -1) {
      endIndex = end > windowEndStr ? totalDays - 1 : 0;
    }

    if (endIndex < startIndex) {
      endIndex = startIndex;
    }

    const span = Math.max(1, endIndex - startIndex + 1);
    const leftPct = (startIndex / totalDays) * 100;
    const widthPct = (span / totalDays) * 100;

    return {
      left: `${leftPct}%`,
      width: `${Math.max(widthPct, 3)}%`,
    };
  };

  const itemsWithoutDates = items.filter((i) => !i.start_date && !i.target_date);

  return (
    <div className="space-y-4">
      {/* Gantt Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <GanttChart className="size-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">Timeline / Diagrama de Gantt</h2>
          <span className="text-xs text-slate-400 bg-slate-100 px-2 py-0.5 rounded font-mono">
            {windowStartStr} → {windowEndStr}
          </span>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs font-semibold">
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePrev} className="size-8">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNext} className="size-8">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Gantt Matrix */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        <div className="flex divide-x divide-slate-200 overflow-x-auto">
          {/* Work Item Info Left Column */}
          <div className="w-80 shrink-0 bg-slate-50/50">
            <div className="h-14 border-b border-slate-200 flex items-center px-4 font-semibold text-xs text-slate-600 uppercase tracking-wider bg-slate-100/70">
              Work Item
            </div>
            <div className="divide-y divide-slate-100">
              {items.map((item) => (
                <div
                  key={item.id}
                  onClick={() => onCardClick(item)}
                  className="h-12 px-4 flex items-center gap-2 hover:bg-indigo-50/50 cursor-pointer transition-colors"
                >
                  <span className="font-mono text-xs font-bold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded">
                    {item.identifier}
                  </span>
                  <span className="text-xs font-medium text-slate-800 truncate flex-1" title={item.title}>
                    {item.title}
                  </span>
                </div>
              ))}
            </div>
          </div>

          {/* Timeline Days and Bars */}
          <div className="flex-1 min-w-[700px] flex flex-col">
            {/* Header row with days */}
            <div className="h-14 border-b border-slate-200 grid grid-cols-21 bg-slate-50/80">
              {timelineDays.map((day, idx) => (
                <div
                  key={idx}
                  className={cn(
                    "flex flex-col items-center justify-center border-r border-slate-100 text-[10px]",
                    day.isToday && "bg-indigo-50/60 font-bold text-indigo-700"
                  )}
                >
                  <span className="text-slate-400">{day.label}</span>
                  <span className={cn("text-xs font-semibold", day.isToday ? "text-indigo-600" : "text-slate-700")}>
                    {day.dayNum}
                  </span>
                </div>
              ))}
            </div>

            {/* Grid rows */}
            <div className="divide-y divide-slate-100 relative">
              {items.map((item) => {
                const barPos = getBarPosition(item);

                return (
                  <div key={item.id} className="h-12 relative flex items-center bg-white hover:bg-slate-50/40">
                    {/* Background vertical day lines */}
                    <div className="absolute inset-0 grid grid-cols-21 pointer-events-none">
                      {timelineDays.map((d, i) => (
                        <div
                          key={i}
                          className={cn("border-r border-slate-100/80 h-full", d.isToday && "bg-indigo-50/15")}
                        />
                      ))}
                    </div>

                    {/* Gantt Bar */}
                    {barPos ? (
                      <div
                        onClick={() => onCardClick(item)}
                        style={{
                          left: barPos.left,
                          width: barPos.width,
                          backgroundColor: item.state?.color || "#6366f1",
                        }}
                        className="absolute h-7 rounded-md shadow-xs hover:brightness-110 cursor-pointer flex items-center px-2 text-white text-[11px] font-medium truncate transition-all z-10"
                        title={`${item.identifier}: ${item.title} (${item.start_date || "Inicio"} → ${item.target_date || "Fin"})`}
                      >
                        <span className="truncate">{item.title}</span>
                      </div>
                    ) : (
                      <span className="text-[11px] text-slate-300 italic px-4 z-0">
                        {item.start_date || item.target_date ? "Fuera de la ventana visible" : "Sin fechas"}
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      </div>

      {itemsWithoutDates.length > 0 && (
        <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl flex items-center gap-2 text-xs text-slate-500">
          <Clock className="size-4 text-slate-400" />
          <span>
            {itemsWithoutDates.length} tareas no tienen fecha de inicio o fecha límite. Asigna fechas para graficarlas en el Gantt.
          </span>
        </div>
      )}
    </div>
  );
}
