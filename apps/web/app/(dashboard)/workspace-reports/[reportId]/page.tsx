"use client";

import React, { useEffect, useState, use } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { WorkspaceReport } from "@/types/workspace-report-types";
import { blockRegistry } from "@/registry/block-registry";
import { ArrowLeft, Edit3, Share2, Loader2, Maximize2, Minimize2, Download, Image as ImageIcon, Printer } from "lucide-react";
import { toast } from "sonner";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { copyToClipboard } from "@/lib/clipboard";

export default function ReportViewPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const resolvedParams = use(params);
  const { currentWorkspace } = useWorkspaceStore();
  const [report, setReport] = useState<WorkspaceReport | null>(null);

  useDocumentTitle(report?.title ? `${report.title} - Reportes` : "Reporte Dinámico");
  const [blocksData, setBlocksData] = useState<Record<string, any>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [error, setError] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "png" | null>(null);

  useEffect(() => {
    if (!currentWorkspace?.id || !resolvedParams.reportId) return;

    let isMounted = true;
    setIsLoading(true);

    Promise.all([
      workspaceReportService.get(currentWorkspace.id, resolvedParams.reportId),
      workspaceReportService.getAllData(currentWorkspace.id, resolvedParams.reportId),
    ])
      .then(([reportData, allData]) => {
        if (isMounted) {
          setReport(reportData);
          setBlocksData(allData || {});
        }
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentWorkspace?.id, resolvedParams.reportId]);

  if (error) {
    notFound();
  }

  if (isLoading || !report) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-neutral-400 bg-neutral-50 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
        <span className="text-xs font-medium">Cargando reporte...</span>
      </div>
    );
  }

  const toggleFullscreen = () => {
    if (!document.fullscreenElement) {
      document.documentElement.requestFullscreen();
      setIsFullscreen(true);
    } else {
      document.exitFullscreen();
      setIsFullscreen(false);
    }
  };

  const handleShare = async () => {
    if (report.public_token) {
      const ok = await copyToClipboard(`${window.location.origin}/r/${report.public_token}`);
      if (ok) {
        toast.success("Enlace público copiado al portapapeles");
      } else {
        toast.error("No se pudo copiar el enlace");
      }
    } else {
      toast.info("Publica el reporte desde el editor para generar un enlace público");
    }
  };

  const handleDownloadPdf = async () => {
    if (!currentWorkspace?.id || !report) return;
    setIsExporting("pdf");
    try {
      await workspaceReportService.downloadPdf(currentWorkspace.id, report.id, report.title);
      toast.success("PDF generado y descargado correctamente");
    } catch (e) {
      toast.error("Error al exportar PDF");
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadPng = async () => {
    if (!currentWorkspace?.id || !report) return;
    setIsExporting("png");
    try {
      await workspaceReportService.downloadPng(currentWorkspace.id, report.id, report.title);
      toast.success("PNG generado y descargado correctamente");
    } catch (e) {
      toast.error("Error al exportar PNG");
    } finally {
      setIsExporting(null);
    }
  };

  const visibleBlocks = (report.blocks || []).filter((b) => b.is_visible);

  return (
    <div className="flex-1 flex flex-col h-full overflow-y-auto bg-neutral-100/70 dark:bg-neutral-950">
      {/* Top Header Bar */}
      <header className="h-14 border-b border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 px-6 flex items-center justify-between shrink-0 sticky top-0 z-20">
        <div className="flex items-center gap-3">
          <Link
            href="/workspace-reports"
            className="flex items-center gap-1.5 text-xs font-medium text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-100 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Reportes
          </Link>
          <span className="text-neutral-300 dark:text-neutral-700">/</span>
          <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100 truncate max-w-sm">
            {report.title}
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Print button */}
          <button
            type="button"
            onClick={() => window.print()}
            className="hidden sm:inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title="Imprimir reporte"
          >
            <Printer className="w-3.5 h-3.5" />
            <span className="hidden md:inline">Imprimir</span>
          </button>

          {/* Export PDF */}
          <button
            type="button"
            onClick={handleDownloadPdf}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-900 dark:bg-neutral-100 text-white dark:text-neutral-900 hover:bg-neutral-800 dark:hover:bg-white transition-colors disabled:opacity-50 shadow-xs"
            title="Descargar PDF generado en servidor"
          >
            {isExporting === "pdf" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <Download className="w-3.5 h-3.5" />
            )}
            <span>PDF</span>
          </button>

          {/* Export PNG */}
          <button
            type="button"
            onClick={handleDownloadPng}
            disabled={isExporting !== null}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-neutral-200 dark:border-neutral-800 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors disabled:opacity-50"
            title="Descargar imagen PNG completa"
          >
            {isExporting === "png" ? (
              <Loader2 className="w-3.5 h-3.5 animate-spin" />
            ) : (
              <ImageIcon className="w-3.5 h-3.5" />
            )}
            <span>PNG</span>
          </button>

          <button
            type="button"
            onClick={toggleFullscreen}
            className="p-1.5 rounded-lg border border-neutral-200 dark:border-neutral-800 text-neutral-600 dark:text-neutral-400 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
            title={isFullscreen ? "Salir de pantalla completa" : "Modo presentación"}
          >
            {isFullscreen ? (
              <Minimize2 className="w-4 h-4" />
            ) : (
              <Maximize2 className="w-4 h-4" />
            )}
          </button>
          <button
            type="button"
            onClick={handleShare}
            className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium border border-neutral-200 dark:border-neutral-800 hover:bg-neutral-100 dark:hover:bg-neutral-800 text-neutral-700 dark:text-neutral-300 transition-colors"
          >
            <Share2 className="w-3.5 h-3.5" />
            Compartir
          </button>
          <Link
            href={`/workspace-reports/${report.id}/edit`}
            className="flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shadow-xs"
          >
            <Edit3 className="w-3.5 h-3.5" />
            Editar
          </Link>
        </div>
      </header>

      {/* Main Document View */}
      <main className="flex-1 p-6 sm:p-10 flex justify-center">
        <div
          style={{
            backgroundColor: report.theme?.backgroundColor || undefined,
            color: report.theme?.textColor || undefined,
            borderRadius: report.theme?.borderRadius || undefined,
            fontFamily: report.theme?.fontFamily || undefined,
          }}
          className="w-full max-w-5xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 shadow-xs space-y-8 transition-colors"
        >
          {/* Header */}
          <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-6">
            <h1 className="text-3xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
              {report.title}
            </h1>
            {report.description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                {report.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-neutral-400 mt-4">
              <span>Por {report.owner?.name || "Autor"}</span>
              <span>•</span>
              <span>
                Actualizado el{" "}
                {new Date(report.updated_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Blocks Grid */}
          <div className="grid grid-cols-12 gap-6">
            {visibleBlocks.map((block) => {
              const def = blockRegistry[block.type];
              const Component = def?.renderComponent;

              const colSpanClass =
                block.width === 6
                  ? "col-span-12 lg:col-span-6"
                  : block.width === 4
                  ? "col-span-12 lg:col-span-4"
                  : block.width === 3
                  ? "col-span-12 lg:col-span-3"
                  : "col-span-12";

              return (
                <div key={block.id} className={colSpanClass}>
                  {Component ? (
                    <Component
                      block={block}
                      data={blocksData[block.id]}
                      isEditing={false}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>
        </div>
      </main>
    </div>
  );
}
