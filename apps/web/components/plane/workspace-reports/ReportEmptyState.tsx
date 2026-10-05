"use client";

import React from "react";
import Link from "next/link";
import { FileText, Plus } from "lucide-react";

export function ReportEmptyState() {
  return (
    <div className="border border-dashed border-neutral-300 dark:border-neutral-800 rounded-3xl p-12 text-center max-w-lg mx-auto my-12 bg-white/50 dark:bg-neutral-900/50">
      <div className="w-12 h-12 rounded-2xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center mx-auto mb-4">
        <FileText className="w-6 h-6" />
      </div>
      <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
        No hay reportes dinámicos creados
      </h3>
      <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1.5 leading-relaxed max-w-sm mx-auto">
        Construye informes ejecutivos modulares componiendo métricas, gráficos, listas de tareas y análisis narrativo.
      </p>
      <div className="mt-6">
        <Link
          href="/workspace-reports/new"
          className="inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
        >
          <Plus className="w-3.5 h-3.5" />
          Crear Nuevo Reporte
        </Link>
      </div>
    </div>
  );
}
