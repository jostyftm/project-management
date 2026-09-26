"use client";

import React from "react";
import { PageBreakBlock } from "@/types/document-type";
import { Scissors } from "lucide-react";

export const PageBreakBlockView: React.FC<{
  block: PageBreakBlock;
  isPreview: boolean;
}> = ({ isPreview }) => {
  if (isPreview) {
    return <div className="my-8 border-b-2 border-dashed border-slate-300" />;
  }

  return (
    <div className="py-4 my-2 flex items-center justify-center gap-2 border-y border-dashed border-slate-300 bg-slate-50 text-slate-500 text-xs">
      <Scissors className="w-3.5 h-3.5" />
      <span className="font-semibold uppercase tracking-wider text-[10px]">
        Salto de Página (Impresión / PDF)
      </span>
    </div>
  );
};
