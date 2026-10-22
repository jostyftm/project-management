"use client";

import React from "react";
import { SprintPlanningCapacity, SprintPlanningMember, SprintPlanningVelocity } from "@/types/plane-types";
import { Users, Gauge, AlertCircle, CheckCircle, TrendingUp } from "lucide-react";
import { cn } from "@/lib/utils";

interface SprintCapacityMeterProps {
  capacity: SprintPlanningCapacity;
  velocity?: SprintPlanningVelocity;
  members?: SprintPlanningMember[];
  className?: string;
}

export function SprintCapacityMeter({
  capacity,
  velocity,
  members,
  className,
}: SprintCapacityMeterProps) {
  const effective = capacity.effective || capacity.effective_capacity || 0;
  const committed = capacity.committed || 0;
  const pct = capacity.utilization_pct || (effective > 0 ? Math.round((committed / effective) * 100) : 0);
  const remaining = capacity.remaining !== undefined ? capacity.remaining : Math.max(0, effective - committed);

  const isOverloaded = pct > 100;
  const isHigh = pct >= 85 && pct <= 100;

  const barColor = isOverloaded
    ? "bg-red-500"
    : isHigh
    ? "bg-amber-500"
    : "bg-indigo-600";

  return (
    <div className={cn("bg-white border border-slate-200 rounded-xl p-4 shadow-xs space-y-3", className)}>
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <div className="p-1.5 bg-indigo-50 text-indigo-600 rounded-lg">
            <Gauge className="size-4" />
          </div>
          <div>
            <h4 className="text-xs font-semibold text-slate-800">Motor de Capacidad</h4>
            <p className="text-[11px] text-slate-500">Comprometido vs Capacidad Estimada</p>
          </div>
        </div>

        <div className="flex items-center gap-2">
          {velocity && velocity.rolling_average > 0 && (
            <span className="hidden md:inline-flex items-center gap-1 text-[11px] font-medium text-slate-600 bg-slate-100 px-2 py-0.5 rounded-full">
              <TrendingUp className="size-3 text-indigo-500" />
              Vel. histórica: {velocity.rolling_average} pts
            </span>
          )}

          <span
            className={cn(
              "px-2.5 py-0.5 rounded-full text-[11px] font-bold border",
              isOverloaded
                ? "bg-red-50 text-red-700 border-red-200"
                : isHigh
                ? "bg-amber-50 text-amber-800 border-amber-200"
                : "bg-emerald-50 text-emerald-700 border-emerald-200"
            )}
          >
            {isOverloaded ? "Sobrecargado" : isHigh ? "Alta Carga" : "Capacidad Saludable"}
          </span>
        </div>
      </div>

      {/* Barra de progreso */}
      <div className="space-y-1.5">
        <div className="flex items-center justify-between text-xs font-medium">
          <span className="text-slate-700">
            <strong className="text-sm font-bold text-slate-900">{committed}</strong> / {effective} pts ({pct}%)
          </span>
          <span className={cn("text-[11px]", remaining === 0 ? "text-amber-600 font-semibold" : "text-slate-500")}>
            {remaining > 0 ? `${remaining} pts disponibles` : isOverloaded ? `Excedido por ${Math.abs(effective - committed)} pts` : "Capacidad al límite"}
          </span>
        </div>
        <div className="h-2.5 w-full bg-slate-100 rounded-full overflow-hidden">
          <div
            className={cn("h-full transition-all duration-300 rounded-full", barColor)}
            style={{ width: `${Math.min(100, pct)}%` }}
          />
        </div>
      </div>

      {/* Desglose rápido por miembros */}
      {members && members.length > 0 && (
        <div className="pt-2 border-t border-slate-100">
          <div className="flex items-center gap-1 text-[11px] font-semibold text-slate-700 mb-2">
            <Users className="size-3 text-slate-400" />
            <span>Carga individual del equipo</span>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {members.map((m) => {
              const mOver = m.load_percentage > 100;
              const mHigh = m.load_percentage >= 80 && !mOver;
              return (
                <div
                  key={m.user.id}
                  className="bg-slate-50/70 border border-slate-200/60 rounded-lg p-2 text-xs space-y-1"
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-slate-800 truncate text-[11px]" title={m.user.name}>
                      {m.user.name}
                    </span>
                    <span
                      className={cn(
                        "text-[10px] font-bold px-1 rounded",
                        mOver ? "bg-red-100 text-red-700" : mHigh ? "bg-amber-100 text-amber-700" : "bg-emerald-100 text-emerald-700"
                      )}
                    >
                      {m.load_percentage}%
                    </span>
                  </div>
                  <div className="flex items-center justify-between text-[10px] text-slate-500">
                    <span>{m.assigned_points} / {m.capacity_points} pts</span>
                    <span>{m.assigned_items_count} items</span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
