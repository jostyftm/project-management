"use client";

import React, { useState, useMemo } from "react";
import { WorkItem } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { ChevronLeft, ChevronRight, Calendar as CalendarIcon, Clock } from "lucide-react";
import { cn } from "@/lib/utils";

interface CalendarViewProps {
  items: WorkItem[];
  onCardClick: (item: WorkItem) => void;
}

export function CalendarView({ items, onCardClick }: CalendarViewProps) {
  const [currentDate, setCurrentDate] = useState(() => new Date());

  const year = currentDate.getFullYear();
  const month = currentDate.getMonth();

  const monthNames = [
    "Enero", "Febrero", "Marzo", "Abril", "Mayo", "Junio",
    "Julio", "Agosto", "Septiembre", "Octubre", "Noviembre", "Diciembre"
  ];

  const handlePrevMonth = () => {
    setCurrentDate(new Date(year, month - 1, 1));
  };

  const handleNextMonth = () => {
    setCurrentDate(new Date(year, month + 1, 1));
  };

  const handleToday = () => {
    setCurrentDate(new Date());
  };

  // Generate calendar grid days
  const calendarDays = useMemo(() => {
    const firstDayOfMonth = new Date(year, month, 1);
    const lastDayOfMonth = new Date(year, month + 1, 0);

    // Monday as 0, Sunday as 6
    let startingDayOfWeek = firstDayOfMonth.getDay() - 1;
    if (startingDayOfWeek === -1) startingDayOfWeek = 6;

    const daysInMonth = lastDayOfMonth.getDate();
    const daysInPrevMonth = new Date(year, month, 0).getDate();

    const days: { date: Date; dateStr: string; isCurrentMonth: boolean; isToday: boolean }[] = [];

    // Prev month days
    for (let i = startingDayOfWeek - 1; i >= 0; i--) {
      const d = new Date(year, month - 1, daysInPrevMonth - i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: d, dateStr, isCurrentMonth: false, isToday: false });
    }

    // Current month days
    const todayStr = new Date().toISOString().split("T")[0];
    for (let i = 1; i <= daysInMonth; i++) {
      const d = new Date(year, month, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({
        date: d,
        dateStr,
        isCurrentMonth: true,
        isToday: dateStr === todayStr,
      });
    }

    // Next month days to complete 35 or 42 cells
    const remainingDays = 42 - days.length;
    for (let i = 1; i <= remainingDays; i++) {
      const d = new Date(year, month + 1, i);
      const dateStr = d.toISOString().split("T")[0];
      days.push({ date: d, dateStr, isCurrentMonth: false, isToday: false });
    }

    return days;
  }, [year, month]);

  // Group items by date string (target_date or start_date)
  const itemsByDate = useMemo(() => {
    const map = new Map<string, WorkItem[]>();
    for (const item of items) {
      const target = item.target_date || item.start_date;
      if (target) {
        const existing = map.get(target) || [];
        existing.push(item);
        map.set(target, existing);
      }
    }
    return map;
  }, [items]);

  const itemsWithoutDate = useMemo(() => {
    return items.filter((i) => !i.target_date && !i.start_date);
  }, [items]);

  return (
    <div className="space-y-4">
      {/* Calendar Header Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-2">
          <CalendarIcon className="size-5 text-indigo-600" />
          <h2 className="text-lg font-bold text-slate-800">
            {monthNames[month]} {year}
          </h2>
        </div>

        <div className="flex items-center gap-1.5">
          <Button variant="outline" size="sm" onClick={handleToday} className="h-8 text-xs font-semibold">
            Hoy
          </Button>
          <Button variant="ghost" size="icon" onClick={handlePrevMonth} className="size-8">
            <ChevronLeft className="size-4" />
          </Button>
          <Button variant="ghost" size="icon" onClick={handleNextMonth} className="size-8">
            <ChevronRight className="size-4" />
          </Button>
        </div>
      </div>

      {/* Grid Container */}
      <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
        {/* Days of week */}
        <div className="grid grid-cols-7 border-b border-slate-200 bg-slate-50 text-center text-xs font-semibold text-slate-600 py-2.5">
          <div>Lun</div>
          <div>Mar</div>
          <div>Mié</div>
          <div>Jue</div>
          <div>Vie</div>
          <div>Sáb</div>
          <div>Dom</div>
        </div>

        {/* Days cells */}
        <div className="grid grid-cols-7 divide-x divide-y divide-slate-100 min-h-[500px]">
          {calendarDays.map((day, idx) => {
            const dayItems = itemsByDate.get(day.dateStr) || [];

            return (
              <div
                key={idx}
                className={cn(
                  "p-2 flex flex-col min-h-[110px] transition-colors",
                  !day.isCurrentMonth ? "bg-slate-50/50 text-slate-300" : "bg-white text-slate-700",
                  day.isToday && "bg-indigo-50/20"
                )}
              >
                <div className="flex items-center justify-between mb-1.5">
                  <span
                    className={cn(
                      "text-xs font-semibold size-6 flex items-center justify-center rounded-full",
                      day.isToday
                        ? "bg-indigo-600 text-white font-bold"
                        : day.isCurrentMonth
                        ? "text-slate-700"
                        : "text-slate-300"
                    )}
                  >
                    {day.date.getDate()}
                  </span>
                  {dayItems.length > 0 && (
                    <span className="text-[10px] font-bold bg-indigo-50 text-indigo-700 px-1.5 rounded-full">
                      {dayItems.length}
                    </span>
                  )}
                </div>

                <div className="flex-1 space-y-1 overflow-y-auto max-h-[110px]">
                  {dayItems.map((item) => (
                    <div
                      key={item.id}
                      onClick={() => onCardClick(item)}
                      title={`${item.identifier}: ${item.title}`}
                      className="group cursor-pointer p-1.5 rounded border border-slate-200 bg-white hover:border-indigo-400 hover:shadow-xs text-left transition-all"
                    >
                      <div className="flex items-center gap-1 mb-0.5">
                        <span
                          className="size-1.5 rounded-full shrink-0"
                          style={{ backgroundColor: item.state?.color || "#6366f1" }}
                        />
                        <span className="font-mono text-[9px] font-bold text-slate-500">
                          {item.identifier}
                        </span>
                      </div>
                      <p className="text-[11px] font-medium text-slate-800 line-clamp-1">
                        {item.title}
                      </p>
                    </div>
                  ))}
                </div>
              </div>
            );
          })}
        </div>
      </div>

      {/* Items without date banner */}
      {itemsWithoutDate.length > 0 && (
        <div className="p-3.5 bg-slate-50 border border-slate-200 rounded-xl flex items-center justify-between text-xs text-slate-600">
          <div className="flex items-center gap-2">
            <Clock className="size-4 text-slate-400" />
            <span>
              <strong>{itemsWithoutDate.length}</strong> work items no tienen fecha de inicio o entrega asignada.
            </span>
          </div>
          <span className="text-slate-400">Asigna fechas en el detalle para verlos en el calendario.</span>
        </div>
      )}
    </div>
  );
}
