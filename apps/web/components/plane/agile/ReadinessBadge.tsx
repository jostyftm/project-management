"use client";

import React, { useState } from "react";
import { DefinitionOfReady } from "@/types/plane-types";
import { CheckCircle2, AlertTriangle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface ReadinessBadgeProps {
  readiness?: DefinitionOfReady | null;
  className?: string;
  showDetails?: boolean;
}

export function ReadinessBadge({ readiness, className, showDetails = false }: ReadinessBadgeProps) {
  const [isOpen, setIsOpen] = useState(false);

  if (!readiness) return null;

  const isReady = readiness.is_ready;
  const missingReasons = readiness.reasons || readiness.missing || [];

  return (
    <div className={cn("relative inline-flex items-center", className)}>
      <button
        type="button"
        onClick={(e) => {
          e.stopPropagation();
          setIsOpen(!isOpen);
        }}
        onMouseEnter={() => setIsOpen(true)}
        onMouseLeave={() => setIsOpen(false)}
        className={cn(
          "inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-medium transition-colors border select-none cursor-pointer",
          isReady
            ? "bg-emerald-50 text-emerald-700 border-emerald-200 hover:bg-emerald-100"
            : "bg-amber-50 text-amber-800 border-amber-200 hover:bg-amber-100"
        )}
      >
        {isReady ? (
          <>
            <CheckCircle2 className="size-3 text-emerald-600 shrink-0" />
            <span>DoR Listo</span>
          </>
        ) : (
          <>
            <AlertTriangle className="size-3 text-amber-600 shrink-0" />
            <span>DoR Incompleto ({missingReasons.length})</span>
          </>
        )}
      </button>

      {isOpen && !isReady && missingReasons.length > 0 && (
        <div
          className="absolute z-50 left-0 top-full mt-1.5 w-64 p-3 bg-white border border-slate-200 rounded-lg shadow-xl text-left text-xs animate-in fade-in-50 zoom-in-95 pointer-events-none"
        >
          <div className="flex items-center gap-1.5 font-semibold text-slate-800 mb-2 pb-1.5 border-b border-slate-100">
            <Info className="size-3.5 text-amber-600" />
            <span>Criterios de Ready pendientes</span>
          </div>
          <ul className="space-y-1.5">
            {missingReasons.map((reason, idx) => (
              <li key={idx} className="flex items-start gap-1.5 text-slate-600">
                <span className="text-amber-500 font-bold">•</span>
                <span className="leading-tight">{reason}</span>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
