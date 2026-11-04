"use client";

import React, { useState, useEffect } from "react";
import { ReportBlock, WorkspaceReport } from "@/types/workspace-report-types";
import { blockRegistry } from "@/registry/block-registry";
import { Sliders, Layout, Trash2, X, Globe, Lock, Shield, Filter, Folder, Repeat, Calendar, Hash } from "lucide-react";
import { projectService } from "@/services/plane/projectService";
import { cycleService } from "@/services/plane/cycleService";
import { Project, Cycle } from "@/types/plane-types";

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
  const [projects, setProjects] = useState<Project[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [isLoadingCycles, setIsLoadingCycles] = useState(false);

  const blockProjectId = block?.config?.project_ids?.[0] || block?.config?.project_id || "";

  useEffect(() => {
    projectService
      .list()
      .then((data: any) => setProjects(data || []))
      .catch((err) => console.error("Error loading projects for config panel:", err));
  }, []);

  useEffect(() => {
    if (!blockProjectId) {
      setCycles([]);
      return;
    }
    setIsLoadingCycles(true);
    cycleService
      .list(blockProjectId)
      .then((data: any) => setCycles(data || []))
      .catch((err) => console.error("Error loading cycles:", err))
      .finally(() => setIsLoadingCycles(false));
  }, [blockProjectId]);

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
          <div className="space-y-4">
            {ConfigComponent ? (
              <ConfigComponent
                config={block.config || {}}
                onChange={(newConfig: Record<string, any>) =>
                  onUpdateBlock(block.id, { config: newConfig })
                }
                workspaceId={report?.workspace_id}
                reportId={report?.id}
                block={block}
              />
            ) : (
              <p className="text-xs text-neutral-400 italic">
                Configuración general de visualización.
              </p>
            )}

            {/* Local Block Filters */}
            <div className="pt-4 border-t border-neutral-200 dark:border-neutral-800 space-y-3.5">
              <div className="flex items-center gap-1.5 text-[11px] font-bold text-neutral-700 dark:text-neutral-300 uppercase tracking-wider">
                <Filter className="w-3.5 h-3.5 text-indigo-600 dark:text-indigo-400" />
                <span>Filtros Específicos del Widget</span>
              </div>
              <p className="text-[11px] text-neutral-400 leading-relaxed">
                Personaliza los datos que muestra este bloque (proyecto, ciclo, fechas y límite de registros).
              </p>

              {/* Proyecto */}
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  <Folder className="w-3 h-3 text-neutral-400" />
                  <span>Proyecto</span>
                </label>
                <select
                  value={block.config?.project_ids?.[0] || block.config?.project_id || ""}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updated = { ...block.config };
                    if (val) {
                      updated.project_ids = [val];
                      updated.project_id = val;
                    } else {
                      delete updated.project_ids;
                      delete updated.project_id;
                    }
                    delete updated.cycle_ids;
                    delete updated.cycle_id;
                    onUpdateBlock(block.id, { config: updated });
                  }}
                  className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200"
                >
                  <option value="">Todos los proyectos del workspace</option>
                  {projects.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name} {p.identifier ? `(${p.identifier})` : ""}
                    </option>
                  ))}
                </select>
              </div>

              {/* Ciclo */}
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  <Repeat className="w-3 h-3 text-neutral-400" />
                  <span>Ciclo / Sprint</span>
                </label>
                <select
                  value={block.config?.cycle_ids?.[0] || block.config?.cycle_id || ""}
                  disabled={!blockProjectId || isLoadingCycles}
                  onChange={(e) => {
                    const val = e.target.value;
                    const updated = { ...block.config };
                    if (val) {
                      updated.cycle_ids = [val];
                      updated.cycle_id = val;
                    } else {
                      delete updated.cycle_ids;
                      delete updated.cycle_id;
                    }
                    onUpdateBlock(block.id, { config: updated });
                  }}
                  className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200 disabled:opacity-50"
                >
                  <option value="">
                    {!blockProjectId
                      ? "Selecciona un proyecto primero"
                      : isLoadingCycles
                      ? "Cargando ciclos..."
                      : "Todos los ciclos"}
                  </option>
                  {cycles.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Fechas */}
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  <Calendar className="w-3 h-3 text-neutral-400" />
                  <span>Rango de Fechas</span>
                </label>
                <div className="grid grid-cols-2 gap-2">
                  <input
                    type="date"
                    value={block.config?.start_date || block.config?.date_from || ""}
                    onChange={(e) =>
                      onUpdateBlock(block.id, {
                        config: {
                          ...block.config,
                          start_date: e.target.value || undefined,
                          date_from: e.target.value || undefined,
                        },
                      })
                    }
                    className="text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-neutral-800 dark:text-neutral-200"
                  />
                  <input
                    type="date"
                    value={block.config?.end_date || block.config?.date_to || ""}
                    onChange={(e) =>
                      onUpdateBlock(block.id, {
                        config: {
                          ...block.config,
                          end_date: e.target.value || undefined,
                          date_to: e.target.value || undefined,
                        },
                      })
                    }
                    className="text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2 py-1.5 text-neutral-800 dark:text-neutral-200"
                  />
                </div>
              </div>

              {/* Límite de registros */}
              <div>
                <label className="flex items-center gap-1 text-[11px] font-semibold text-neutral-600 dark:text-neutral-400 mb-1">
                  <Hash className="w-3 h-3 text-neutral-400" />
                  <span>Límite de Registros</span>
                </label>
                <div className="space-y-2">
                  <label className="flex items-center gap-2 cursor-pointer text-xs text-neutral-700 dark:text-neutral-300">
                    <input
                      type="checkbox"
                      checked={
                        block.config?.limit === null ||
                        block.config?.limit === undefined ||
                        block.config?.limit === 0 ||
                        block.config?.limit === "all"
                      }
                      onChange={(e) => {
                        const updated = { ...block.config };
                        if (e.target.checked) {
                          updated.limit = null;
                        } else {
                          updated.limit = 20;
                        }
                        onUpdateBlock(block.id, { config: updated });
                      }}
                      className="rounded border-neutral-300 text-indigo-600 focus:ring-indigo-500"
                    />
                    <span>Mostrar todos los registros (sin límite)</span>
                  </label>

                  {block.config?.limit !== null &&
                    block.config?.limit !== undefined &&
                    block.config?.limit !== 0 &&
                    block.config?.limit !== "all" && (
                      <input
                        type="number"
                        min="1"
                        max="500"
                        value={block.config.limit}
                        onChange={(e) => {
                          const val = parseInt(e.target.value, 10);
                          onUpdateBlock(block.id, {
                            config: {
                              ...block.config,
                              limit: isNaN(val) ? 20 : val,
                            },
                          });
                        }}
                        className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5 text-neutral-800 dark:text-neutral-200"
                        placeholder="Cantidad de registros (ej. 25)"
                      />
                    )}
                </div>
              </div>
            </div>
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
