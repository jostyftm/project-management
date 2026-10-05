"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { ArrowLeft, Sparkles, FileText, Check, Loader2 } from "lucide-react";
import { toast } from "sonner";

export default function NewReportPage() {
  const router = useRouter();
  const { currentWorkspace } = useWorkspaceStore();

  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [visibility, setVisibility] = useState<"draft" | "workspace" | "private">("draft");
  const [selectedTemplate, setSelectedTemplate] = useState<string>("blank");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!currentWorkspace?.id || !title.trim()) return;

    setIsSubmitting(true);
    try {
      // 1. Create base report (with template if selected)
      const newReport = await workspaceReportService.create(currentWorkspace.id, {
        title: title.trim(),
        description: description.trim() || undefined,
        visibility,
        template: selectedTemplate !== "blank" ? selectedTemplate : undefined,
      });

      // 2. If blank template, add a starting narrative block
      if (selectedTemplate === "blank") {
        await workspaceReportService.createBlock(currentWorkspace.id, newReport.id, {
          type: "narrative",
          title: "Introducción",
          position: 0,
          width: 12,
          config: {
            content: "<p>Comienza escribiendo aquí el contenido de tu reporte...</p>",
          },
        });
      }

      toast.success("Reporte creado con éxito");
      router.push(`/workspace-reports/${newReport.id}/edit`);
    } catch (err) {
      console.error(err);
      toast.error("Error al crear el reporte");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto w-full">
      <div className="w-full">
        {/* Back Link */}
        <Link
          href="/workspace-reports"
          className="inline-flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 mb-6 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          Volver a Reportes
        </Link>

        {/* Title */}
        <div className="mb-8">
          <h1 className="text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
            Crear Nuevo Reporte Dinámico
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Empieza desde un lienzo en blanco o utiliza una plantilla prediseñada.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Form Card */}
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-6 shadow-xs space-y-4">
            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                Título del reporte *
              </label>
              <input
                type="text"
                required
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                placeholder="Ej. Reporte Ejecutivo Semanal - Q3"
                className="w-full text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/60 px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                Descripción (opcional)
              </label>
              <textarea
                rows={3}
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                placeholder="Propósito, audiencia y alcance de este informe..."
                className="w-full text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-neutral-50/60 dark:bg-neutral-800/60 px-3.5 py-2.5 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500 leading-relaxed"
              />
            </div>

            <div>
              <label className="block text-xs font-semibold text-neutral-800 dark:text-neutral-200 mb-1.5">
                Visibilidad inicial
              </label>
              <div className="grid grid-cols-3 gap-3">
                {[
                  { id: "draft", label: "Borrador", desc: "Solo visible por ti" },
                  { id: "workspace", label: "Workspace", desc: "Todo el equipo" },
                  { id: "private", label: "Privado", desc: "Acceso restringido" },
                ].map((item) => (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => setVisibility(item.id as any)}
                    className={`p-3 rounded-xl border text-left transition-all ${
                      visibility === item.id
                        ? "border-indigo-600 bg-indigo-50/30 dark:bg-indigo-950/30 ring-1 ring-indigo-500"
                        : "border-neutral-200 dark:border-neutral-800 hover:border-neutral-300"
                    }`}
                  >
                    <div className="text-xs font-semibold text-neutral-900 dark:text-neutral-100">
                      {item.label}
                    </div>
                    <div className="text-[11px] text-neutral-500 dark:text-neutral-400 mt-0.5">
                      {item.desc}
                    </div>
                  </button>
                ))}
              </div>
            </div>
          </div>

          {/* Template Selection */}
          <div className="space-y-3">
            <span className="text-xs font-semibold text-neutral-800 dark:text-neutral-200 block">
              Elige cómo iniciar
            </span>

            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5">
              {[
                {
                  id: "blank",
                  name: "En Blanco",
                  tag: "Lienzo",
                  desc: "Comienza con un documento limpio y añade los bloques que necesites a tu medida.",
                },
                {
                  id: "weekly_exec",
                  name: "Weekly Executive Report",
                  tag: "Ejecutivo",
                  desc: "Resumen de estado con KPIs de rendimiento, riesgos prioritarios y narrativa ejecutiva.",
                },
                {
                  id: "sprint_review",
                  name: "Sprint Review & Retrospectiva",
                  tag: "Agile",
                  desc: "Análisis de ciclos y sprints con velocidad de entrega, carga y tabla detallada de tareas.",
                },
                {
                  id: "project_health",
                  name: "Diagnóstico de Salud y Riesgos",
                  tag: "Auditoría",
                  desc: "Auditoría de estados, tareas críticas bloqueadas, vencimientos y avance de hitos.",
                },
                {
                  id: "product_roadmap",
                  name: "Roadmap Trimestral & Releases",
                  tag: "Producto",
                  desc: "Seguimiento de roadmap de producto, hitos clave y cronograma temporal de lanzamientos.",
                },
                {
                  id: "team_capacity",
                  name: "Capacidad y Carga de Equipo",
                  tag: "Operaciones",
                  desc: "Supervisión de capacidad operativa, mapa de calor y distribución de tareas por miembro.",
                },
              ].map((tmpl) => (
                <button
                  key={tmpl.id}
                  type="button"
                  onClick={() => setSelectedTemplate(tmpl.id)}
                  className={`p-3.5 rounded-xl border text-left flex flex-col justify-between gap-2 transition-all ${
                    selectedTemplate === tmpl.id
                      ? "border-indigo-600 bg-white dark:bg-neutral-900 ring-2 ring-indigo-500/20 shadow-xs"
                      : "border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700"
                  }`}
                >
                  <div className="flex items-start justify-between gap-1 w-full">
                    <div>
                      <span className="text-[10px] font-bold uppercase tracking-wider text-indigo-600 dark:text-indigo-400 bg-indigo-50 dark:bg-indigo-950/60 px-1.5 py-0.5 rounded">
                        {tmpl.tag}
                      </span>
                      <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 mt-1">
                        {tmpl.name}
                      </h4>
                    </div>
                    {selectedTemplate === tmpl.id && (
                      <Check className="w-4 h-4 text-indigo-600 shrink-0 mt-0.5" />
                    )}
                  </div>
                  <p className="text-[11px] text-neutral-500 dark:text-neutral-400 leading-relaxed">
                    {tmpl.desc}
                  </p>
                </button>
              ))}
            </div>
          </div>

          {/* Actions */}
          <div className="flex items-center justify-end gap-3 pt-2">
            <Link
              href="/workspace-reports"
              className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-200/60 dark:hover:bg-neutral-800 rounded-xl transition-colors"
            >
              Cancelar
            </Link>
            <button
              type="submit"
              disabled={isSubmitting || !title.trim()}
              className="inline-flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-50 transition-colors shadow-xs"
            >
              {isSubmitting && <Loader2 className="w-3.5 h-3.5 animate-spin" />}
              Crear y Abrir Editor
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
