"use client";

import React from "react";
import { StickiesBoard } from "@/components/plane/stickies/StickiesBoard";
import { StickyNote } from "lucide-react";

export default function StickiesPage() {
  return (
    <div className="flex-1 space-y-6 w-full">
      {/* Header */}
      <div className="border-b border-slate-200 pb-5">
        <div className="flex items-center gap-2">
          <StickyNote className="size-6 text-amber-600" />
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">
            Stickies (Tablero de Notas Rápidas)
          </h1>
        </div>
        <p className="text-sm text-slate-500 mt-1">
          Lienzo visual estilo corcho para notas adhesivas personales y compartidas con el equipo.
        </p>
      </div>

      {/* Board */}
      <StickiesBoard />
    </div>
  );
}
