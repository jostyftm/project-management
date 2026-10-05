"use client";

import React, { useState, useEffect, useCallback } from "react";
import Link from "next/link";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { WorkspaceReport } from "@/types/workspace-report-types";
import { ReportCard } from "@/components/plane/workspace-reports/ReportCard";
import { ReportEmptyState } from "@/components/plane/workspace-reports/ReportEmptyState";
import { Plus, Search, Filter, Loader2, FileSpreadsheet } from "lucide-react";
import { toast } from "sonner";

export default function WorkspaceReportsPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [reports, setReports] = useState<WorkspaceReport[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [visibilityFilter, setVisibilityFilter] = useState<string>("all");

  const loadReports = useCallback(async () => {
    if (!currentWorkspace?.id) return;
    setIsLoading(true);
    try {
      const data = await workspaceReportService.list(currentWorkspace.id);
      setReports(data);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar reportes");
    } finally {
      setIsLoading(false);
    }
  }, [currentWorkspace?.id]);

  useEffect(() => {
    loadReports();
  }, [loadReports]);

  const handleDuplicate = async (report: WorkspaceReport) => {
    if (!currentWorkspace?.id) return;
    try {
      await workspaceReportService.duplicate(currentWorkspace.id, report.id);
      toast.success("Reporte duplicado con éxito");
      loadReports();
    } catch (e) {
      toast.error("Error al duplicar el reporte");
    }
  };

  const handleDelete = async (report: WorkspaceReport) => {
    if (!currentWorkspace?.id) return;
    if (!confirm(`¿Estás seguro de eliminar el reporte "${report.title}"?`)) return;
    try {
      await workspaceReportService.delete(currentWorkspace.id, report.id);
      toast.success("Reporte eliminado");
      setReports((prev) => prev.filter((r) => r.id !== report.id));
    } catch (e) {
      toast.error("Error al eliminar el reporte");
    }
  };

  const filteredReports = reports.filter((r) => {
    const matchesSearch =
      r.title.toLowerCase().includes(search.toLowerCase()) ||
      (r.description || "").toLowerCase().includes(search.toLowerCase());
    const matchesVisibility =
      visibilityFilter === "all" || r.visibility === visibilityFilter;
    return matchesSearch && matchesVisibility;
  });

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-neutral-50/50 dark:bg-neutral-950 p-6 sm:p-8">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-6 border-b border-neutral-200/80 dark:border-neutral-800">
        <div>
          <h1 className="text-xl sm:text-2xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100 flex items-center gap-2.5">
            <FileSpreadsheet className="w-6 h-6 text-indigo-600 dark:text-indigo-400" />
            Reportes Dinámicos
          </h1>
          <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1">
            Diseña dashboards ejecutivos modulares con métricas, gráficos y análisis narrativo.
          </p>
        </div>

        <Link
          href="/workspace-reports/new"
          className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
        >
          <Plus className="w-4 h-4" />
          Nuevo Reporte
        </Link>
      </div>

      {/* Filter Toolbar */}
      <div className="flex flex-col sm:flex-row items-stretch sm:items-center justify-between gap-3 my-6">
        <div className="relative flex-1 max-w-md">
          <Search className="w-3.5 h-3.5 absolute left-3 top-1/2 -translate-y-1/2 text-neutral-400" />
          <input
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar por título o descripción..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 text-neutral-800 dark:text-neutral-200 placeholder:text-neutral-400 focus:outline-none focus:ring-1 focus:ring-indigo-500 shadow-xs"
          />
        </div>

        <div className="flex items-center gap-2">
          <Filter className="w-3.5 h-3.5 text-neutral-400" />
          <select
            value={visibilityFilter}
            onChange={(e) => setVisibilityFilter(e.target.value)}
            className="text-xs rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-700 dark:text-neutral-300 shadow-xs focus:outline-none"
          >
            <option value="all">Todas las visibilidades</option>
            <option value="draft">Borradores</option>
            <option value="workspace">Workspace</option>
            <option value="private">Privados</option>
            <option value="public">Públicos</option>
          </select>
        </div>
      </div>

      {/* Main Content */}
      {isLoading ? (
        <div className="flex flex-col items-center justify-center py-20 text-neutral-400">
          <Loader2 className="w-6 h-6 animate-spin mb-2" />
          <span className="text-xs">Cargando reportes...</span>
        </div>
      ) : reports.length === 0 ? (
        <ReportEmptyState />
      ) : filteredReports.length === 0 ? (
        <div className="text-center py-16 text-neutral-400 text-xs">
          No se encontraron reportes con los filtros seleccionados.
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {filteredReports.map((report) => (
            <ReportCard
              key={report.id}
              report={report}
              onDuplicate={handleDuplicate}
              onDelete={handleDelete}
            />
          ))}
        </div>
      )}
    </div>
  );
}
