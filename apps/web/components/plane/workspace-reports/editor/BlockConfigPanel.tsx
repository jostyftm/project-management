"use client";

import React, { useState } from "react";
import { ReportBlock, WorkspaceReport } from "@/types/workspace-report-types";
import { blockRegistry } from "@/registry/block-registry";
import { Sliders, Layout, Trash2, X, Globe, Lock, Shield } from "lucide-react";

interface BlockConfigPanelProps {
  block: ReportBlock | null;
  report: WorkspaceReport | null;
  onUpdateBlock: (blockId: string, partial: Partial<ReportBlock>) => void;
  onDeleteBlock: (blockId: string) => void;
  onUpdateReport: (partial: Partial<WorkspaceReport>) => void;
  onClose: () => void;
}

export function BlockConfigPanel({
  block,
  report,
  onUpdateBlock,
  onDeleteBlock,
  onUpdateReport,
  onClose,
}: BlockConfigPanelProps) {
  const [tab, setTab] = useState<"config" | "layout">("config");

  if (!block) {
    // Panel de propiedades del reporte general
    return (
      <aside className="w-80 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full overflow-y-auto p-4">
        <div className="flex items-center justify-between pb-3 border-b border-neutral-200 dark:border-neutral-800 mb-4">
          <span className="text-xs font-bold text-neutral-800 dark:text-neutral-200 uppercase tracking-wider">
            Propiedades del Reporte
          </span>
        </div>

        {report && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Título del reporte
              </label>
              <input
                type="text"
                value={report.title}
                onChange={(e) => onUpdateReport({ title: e.target.value })}
                className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Descripción
              </label>
              <textarea
                rows={3}
                value={report.description || ""}
                onChange={(e) => onUpdateReport({ description: e.target.value })}
                placeholder="Breve explicación del objetivo del reporte..."
                className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-2 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Visibilidad
              </label>
              <select
                value={report.visibility}
                onChange={(e) => onUpdateReport({ visibility: e.target.value as any })}
                className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-2 text-neutral-800 dark:text-neutral-200"
              >
                <option value="draft">Borrador (Solo tú)</option>
                <option value="private">Privado</option>
                <option value="workspace">Workspace (Todos los miembros)</option>
                <option value="public">Público (Vía enlace web)</option>
              </select>
            </div>
          </div>
        )}
      </aside>
    );
  }

  const blockDef = blockRegistry[block.type];
  const ConfigComponent = blockDef?.configPanelComponent;

  return (
    <aside className="w-80 shrink-0 border-l border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="flex items-center justify-between p-3.5 border-b border-neutral-200 dark:border-neutral-800">
        <div>
          <span className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 uppercase tracking-wider block">
            {blockDef?.label || block.type}
          </span>
          <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
            Configuración de bloque
          </span>
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-1 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded"
        >
          <X className="w-4 h-4" />
        </button>
      </div>

      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-3 pt-2 gap-1 bg-neutral-50/50 dark:bg-neutral-900/50">
        <button
          type="button"
          onClick={() => setTab("config")}
          className={`flex items-center gap-1.5 pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            tab === "config"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Sliders className="w-3.5 h-3.5" />
          Datos
        </button>
        <button
          type="button"
          onClick={() => setTab("layout")}
          className={`flex items-center gap-1.5 pb-2 px-3 text-xs font-semibold border-b-2 transition-colors ${
            tab === "layout"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900"
          }`}
        >
          <Layout className="w-3.5 h-3.5" />
          Diseño
        </button>
      </div>

      {/* Content */}
      <div className="flex-1 overflow-y-auto p-4 space-y-4">
        {/* Title Input */}
        <div>
          <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
            Título del bloque
          </label>
          <input
            type="text"
            value={block.title || ""}
            onChange={(e) => onUpdateBlock(block.id, { title: e.target.value })}
            placeholder="Ej. Resumen de Desempeño"
            className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-neutral-50 dark:bg-neutral-800 px-3 py-1.5 text-neutral-800 dark:text-neutral-200 focus:outline-none focus:ring-1 focus:ring-indigo-500"
          />
        </div>

        {tab === "config" && (
          <div>
            {ConfigComponent ? (
              <ConfigComponent
                config={block.config || {}}
                onChange={(newConfig) =>
                  onUpdateBlock(block.id, { config: newConfig })
                }
              />
            ) : (
              <p className="text-xs text-neutral-400 italic">
                Este tipo de bloque no tiene parámetros de datos adicionales en esta fase.
              </p>
            )}
          </div>
        )}

        {tab === "layout" && (
          <div className="space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                Ancho del bloque en cuadrícula (12 columnas)
              </label>
              <div className="grid grid-cols-3 gap-2">
                {[
                  { width: 12, label: "100% (12 col)" },
                  { width: 6, label: "50% (6 col)" },
                  { width: 4, label: "33% (4 col)" },
                ].map((w) => (
                  <button
                    key={w.width}
                    type="button"
                    onClick={() => onUpdateBlock(block.id, { width: w.width })}
                    className={`py-2 px-1 text-xs rounded-lg border text-center transition-all ${
                      block.width === w.width
                        ? "border-indigo-600 bg-indigo-50/40 text-indigo-700 dark:border-indigo-400 dark:bg-indigo-950/40 dark:text-indigo-300 font-semibold"
                        : "border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:border-neutral-300"
                    }`}
                  >
                    {w.label}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer / Delete */}
      <div className="p-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50">
        <button
          type="button"
          onClick={() => onDeleteBlock(block.id)}
          className="w-full flex items-center justify-center gap-1.5 py-2 px-3 rounded-lg text-xs font-medium text-rose-600 dark:text-rose-400 hover:bg-rose-50 dark:hover:bg-rose-950/30 transition-colors"
        >
          <Trash2 className="w-3.5 h-3.5" />
          Eliminar este bloque
        </button>
      </div>
    </aside>
  );
}
