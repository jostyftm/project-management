"use client";

import React from "react";
import Link from "next/link";
import { WorkspaceReport } from "@/types/workspace-report-types";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { toast } from "sonner";
import {
  ChevronRight,
  RotateCcw,
  RotateCw,
  Eye,
  Share2,
  Save,
  Check,
  Loader2,
  History,
  Download,
} from "lucide-react";

interface EditorTopBarProps {
  report: WorkspaceReport;
  workspaceId: string | number;
  isDirty: boolean;
  isSaving: boolean;
  zoom: number;
  canUndo: boolean;
  canRedo: boolean;
  onUndo: () => void;
  onRedo: () => void;
  onZoomChange: (z: number) => void;
  onSave: () => void;
  onPublish: () => void;
  onTitleChange: (title: string) => void;
  onOpenSnapshots?: () => void;
}

export function EditorTopBar({
  report,
  workspaceId,
  isDirty,
  isSaving,
  zoom,
  canUndo,
  canRedo,
  onUndo,
  onRedo,
  onZoomChange,
  onSave,
  onPublish,
  onTitleChange,
  onOpenSnapshots,
}: EditorTopBarProps) {
  return (
    <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-4 flex items-center justify-between shrink-0 z-30">
      {/* Left: Breadcrumbs & Inline Title */}
      <div className="flex items-center gap-2 min-w-0">
        <Link
          href={`/workspace-reports`}
          className="text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
        >
          Reportes
        </Link>
        <ChevronRight className="w-3.5 h-3.5 text-neutral-400 shrink-0" />
        <input
          type="text"
          value={report.title}
          onChange={(e) => onTitleChange(e.target.value)}
          className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 bg-transparent border-b border-transparent hover:border-neutral-300 focus:border-indigo-500 focus:outline-none px-1 py-0.5 max-w-[200px] sm:max-w-xs truncate"
          title="Haz clic para editar el título"
        />

        {/* Save indicator */}
        <div className="ml-2 flex items-center text-[11px] text-neutral-400">
          {isSaving ? (
            <span className="flex items-center gap-1 text-indigo-500">
              <Loader2 className="w-3 h-3 animate-spin" />
              Guardando...
            </span>
          ) : isDirty ? (
            <span className="text-amber-500 font-medium">Cambios sin guardar</span>
          ) : (
            <span className="flex items-center gap-0.5 text-neutral-400">
              <Check className="w-3 h-3 text-emerald-500" />
              Guardado
            </span>
          )}
        </div>
      </div>

      {/* Right: Actions */}
      <div className="flex items-center gap-1.5 sm:gap-2">
        {/* Undo / Redo */}
        <div className="flex items-center border border-neutral-200 dark:border-neutral-800 rounded-lg p-0.5">
          <button
            type="button"
            disabled={!canUndo}
            onClick={onUndo}
            className="p-1 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:hover:text-neutral-500"
            title="Deshacer (Ctrl+Z)"
          >
            <RotateCcw className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={!canRedo}
            onClick={onRedo}
            className="p-1 rounded text-neutral-500 hover:text-neutral-800 dark:hover:text-neutral-200 disabled:opacity-30 disabled:hover:text-neutral-500"
            title="Rehacer (Ctrl+Y)"
          >
            <RotateCw className="w-3.5 h-3.5" />
          </button>
        </div>

        {/* Zoom */}
        <select
          value={zoom}
          onChange={(e) => onZoomChange(Number(e.target.value))}
          className="text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-800 px-2 py-1 text-neutral-700 dark:text-neutral-300"
        >
          <option value={75}>75%</option>
          <option value={100}>100%</option>
          <option value={125}>125%</option>
        </select>

        {/* Snapshots / Versions */}
        {onOpenSnapshots && (
          <button
            type="button"
            onClick={onOpenSnapshots}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
            title="Historial de versiones y snapshots"
          >
            <History className="w-3.5 h-3.5" />
            <span className="hidden sm:inline">Versiones</span>
          </button>
        )}

        {/* Preview Link */}
        <Link
          href={`/workspace-reports/${report.id}`}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
        >
          <Eye className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Vista Previa</span>
        </Link>

        {/* Share / Publish */}
        <button
          type="button"
          onClick={onPublish}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
        >
          <Share2 className="w-3.5 h-3.5" />
          <span className="hidden sm:inline">Compartir</span>
        </button>

        {/* Export PDF */}
        <button
          type="button"
          onClick={async () => {
            try {
              toast.info("Generando PDF en servidor...");
              await workspaceReportService.downloadPdf(workspaceId, report.id, report.title);
              toast.success("PDF exportado con éxito");
            } catch (e) {
              toast.error("Error al exportar PDF");
            }
          }}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          title="Exportar documento en PDF fiel 1:1"
        >
          <Download className="w-3.5 h-3.5" />
          <span className="hidden md:inline">PDF</span>
        </button>

        {/* Save */}
        <button
          type="button"
          onClick={onSave}
          disabled={!isDirty || isSaving}
          className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 disabled:hover:bg-indigo-600 transition-colors shadow-xs"
        >
          <Save className="w-3.5 h-3.5" />
          Guardar
        </button>
      </div>
    </header>
  );
}
