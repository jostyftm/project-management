"use client";

import React, { useState } from "react";
import { BlockType, ReportTheme, REPORT_THEMES } from "@/types/workspace-report-types";
import { blockRegistry, BlockCategory } from "@/registry/block-registry";
import { Search, Plus, Palette, LayoutGrid, LayoutTemplate, CheckCircle2 } from "lucide-react";

interface BlocksSidebarProps {
  onAddBlock: (type: BlockType) => void;
  activeTheme?: string;
  onSelectTheme?: (theme: ReportTheme, themeId: string) => void;
  onApplyTemplate?: (templateId: string) => void;
}

const CATEGORY_LABELS: Record<BlockCategory, string> = {
  metrics: "Métricas & KPIs",
  projects: "Proyectos & Hitos",
  work: "Gestión de Trabajo",
  context: "Contexto & Narrativa",
};

const PRESET_TEMPLATES = [
  {
    id: "weekly_exec",
    name: "Weekly Executive Report",
    description: "Resumen ejecutivo con estado general, KPIs, riesgos prioritarios y narrativa.",
    tag: "Ejecutivo",
    theme: "corporate_blue",
    blocksCount: 5,
  },
  {
    id: "sprint_review",
    name: "Sprint Review & Retrospectiva",
    description: "Análisis de sprint con velocidad de entrega, carga y tabla de tareas.",
    tag: "Agile",
    theme: "default_light",
    blocksCount: 4,
  },
  {
    id: "project_health",
    name: "Diagnóstico de Salud y Riesgos",
    description: "Auditoría de estados, tareas vencidas y cumplimiento de hitos.",
    tag: "Auditoría",
    theme: "default_dark",
    blocksCount: 4,
  },
  {
    id: "product_roadmap",
    name: "Roadmap Trimestral & Releases",
    description: "Seguimiento de roadmap de producto, hitos y cronograma de despliegues.",
    tag: "Producto",
    theme: "corporate_blue",
    blocksCount: 4,
  },
  {
    id: "team_capacity",
    name: "Capacidad y Carga de Equipo",
    description: "Supervisión de capacidad operativa, heatmap y tareas urgentes.",
    tag: "Operaciones",
    theme: "warm_neutral",
    blocksCount: 4,
  },
];

export function BlocksSidebar({ onAddBlock, activeTheme, onSelectTheme, onApplyTemplate }: BlocksSidebarProps) {
  const [tab, setTab] = useState<"blocks" | "templates" | "themes">("blocks");
  const [search, setSearch] = useState("");

  const allBlocks = Object.values(blockRegistry);
  const filteredBlocks = allBlocks.filter(
    (b) =>
      b.label.toLowerCase().includes(search.toLowerCase()) ||
      b.description.toLowerCase().includes(search.toLowerCase())
  );

  const categories: BlockCategory[] = ["metrics", "projects", "work", "context"];

  return (
    <aside className="w-72 shrink-0 border-r border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 flex flex-col h-full overflow-hidden">
      {/* Tabs */}
      <div className="flex border-b border-neutral-200 dark:border-neutral-800 px-2 pt-2 gap-0.5 bg-neutral-50/50 dark:bg-neutral-900/50">
        <button
          type="button"
          onClick={() => setTab("blocks")}
          className={`flex items-center gap-1 pb-2.5 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === "blocks"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <LayoutGrid className="w-3.5 h-3.5" />
          Bloques
        </button>
        <button
          type="button"
          onClick={() => setTab("templates")}
          className={`flex items-center gap-1 pb-2.5 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === "templates"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <LayoutTemplate className="w-3.5 h-3.5" />
          Plantillas
        </button>
        <button
          type="button"
          onClick={() => setTab("themes")}
          className={`flex items-center gap-1 pb-2.5 px-2.5 text-xs font-semibold border-b-2 transition-colors ${
            tab === "themes"
              ? "border-indigo-600 text-indigo-600 dark:border-indigo-400 dark:text-indigo-400"
              : "border-transparent text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
          }`}
        >
          <Palette className="w-3.5 h-3.5" />
          Temas
        </button>
      </div>

      {tab === "blocks" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-4">
          {/* Search Input */}
          <div className="relative">
            <Search className="w-3.5 h-3.5 absolute left-2.5 top-1/2 -translate-y-1/2 text-neutral-400" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Buscar bloques..."
              className="w-full pl-8 pr-3 py-1.5 text-xs rounded-lg border border-neutral-200 dark:border-neutral-800 bg-neutral-50 dark:bg-neutral-800/60 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500"
            />
          </div>

          {/* Categories */}
          {categories.map((category) => {
            const blocksInCategory = filteredBlocks.filter((b) => b.category === category);
            if (blocksInCategory.length === 0) return null;

            return (
              <div key={category} className="space-y-1.5">
                <span className="text-[11px] font-bold text-neutral-400 uppercase tracking-wider px-1">
                  {CATEGORY_LABELS[category]}
                </span>
                <div className="space-y-1">
                  {blocksInCategory.map((block) => {
                    const Icon = block.icon;
                    return (
                      <button
                        key={block.type}
                        type="button"
                        onClick={() => onAddBlock(block.type)}
                        className="w-full text-left flex items-start gap-2.5 p-2 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800/70 group transition-colors border border-transparent hover:border-neutral-200/80 dark:hover:border-neutral-700/60"
                      >
                        <div className="w-7 h-7 rounded-md bg-indigo-50 dark:bg-indigo-950/40 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0 mt-0.5 group-hover:scale-105 transition-transform">
                          <Icon className="w-3.5 h-3.5" />
                        </div>
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between">
                            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 truncate">
                              {block.label}
                            </span>
                            <Plus className="w-3.5 h-3.5 text-neutral-400 opacity-0 group-hover:opacity-100 transition-opacity" />
                          </div>
                          <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-1 mt-0.5">
                            {block.description}
                          </p>
                        </div>
                      </button>
                    );
                  })}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {tab === "templates" && (
        <div className="flex-1 overflow-y-auto p-3 flex flex-col gap-3">
          <div className="px-1">
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Aplica una estructura predefinida con bloques y temas listos para usar:
            </p>
          </div>
          <div className="space-y-2.5">
            {PRESET_TEMPLATES.map((tmpl) => (
              <div
                key={tmpl.id}
                className="p-3 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col gap-2"
              >
                <div className="flex items-start justify-between gap-1">
                  <div>
                    <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                      {tmpl.tag}
                    </span>
                    <h4 className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 mt-1">
                      {tmpl.name}
                    </h4>
                  </div>
                  <span className="text-[10px] text-neutral-400 font-medium whitespace-nowrap">
                    {tmpl.blocksCount} bloques
                  </span>
                </div>
                <p className="text-[11px] text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed">
                  {tmpl.description}
                </p>
                <button
                  type="button"
                  onClick={() => onApplyTemplate && onApplyTemplate(tmpl.id)}
                  className="w-full mt-1 py-1.5 px-3 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors flex items-center justify-center gap-1.5 shadow-xs"
                >
                  <LayoutTemplate className="w-3.5 h-3.5" />
                  Aplicar Plantilla
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {tab === "themes" && (
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mb-2">
            Elige la paleta visual y tipografía de tu reporte ejecutivo:
          </p>
          {[
            { id: "default_light", name: "Claro Estándar", primary: "#6366f1", bg: "#ffffff" },
            { id: "default_dark", name: "Oscuro Elegante", primary: "#818cf8", bg: "#18181b" },
            { id: "corporate_blue", name: "Azul Corporativo", primary: "#2563eb", bg: "#f8fafc" },
            { id: "minimal_mono", name: "Minimalista Mono", primary: "#171717", bg: "#fafafa" },
            { id: "warm_neutral", name: "Cálido Editorial", primary: "#d97706", bg: "#fffbeb" },
          ].map((theme) => (
            <button
              key={theme.id}
              type="button"
              onClick={() => onSelectTheme && onSelectTheme(REPORT_THEMES[theme.id], theme.id)}
              className={`w-full p-3 rounded-xl border text-left flex items-center justify-between transition-all ${
                activeTheme === theme.id
                  ? "border-indigo-600 ring-2 ring-indigo-500/20 bg-indigo-50/20 dark:bg-indigo-950/20"
                  : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
              }`}
            >
              <div>
                <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                  {theme.name}
                </span>
              </div>
              <div className="flex items-center gap-1.5">
                <span
                  className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700"
                  style={{ backgroundColor: theme.primary }}
                />
                <span
                  className="w-4 h-4 rounded-full border border-neutral-300 dark:border-neutral-700"
                  style={{ backgroundColor: theme.bg }}
                />
              </div>
            </button>
          ))}
        </div>
      )}
    </aside>
  );
}
