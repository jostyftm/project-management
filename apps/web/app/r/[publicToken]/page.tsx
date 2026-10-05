"use client";

import React, { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { WorkspaceReport } from "@/types/workspace-report-types";
import { blockRegistry } from "@/registry/block-registry";
import { Loader2, Maximize2, Minimize2, FileSpreadsheet, Download, Image as ImageIcon, Printer } from "lucide-react";
import { toast } from "sonner";

export default function PublicReportPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const resolvedParams = use(params);
  const [report, setReport] = useState<WorkspaceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [isExporting, setIsExporting] = useState<"pdf" | "png" | null>(null);

  useEffect(() => {
    if (!resolvedParams.publicToken) return;

    let isMounted = true;
    setIsLoading(true);

    workspaceReportService
      .getPublic(resolvedParams.publicToken)
      .then((data) => {
        if (isMounted) setReport(data);
      })
      .catch((err) => {
        console.error("Public report fetch error", err);
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [resolvedParams.publicToken]);

  if (error) {
    notFound();
  }

  if (isLoading || !report) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center bg-neutral-50 dark:bg-neutral-950 text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
        <span className="text-xs font-medium">Cargando reporte ejecutivo...</span>
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

  const handleDownloadPdf = async () => {
    setIsExporting("pdf");
    try {
      await workspaceReportService.downloadPublicPdf(resolvedParams.publicToken, report.title);
      toast.success("PDF descargado correctamente");
    } catch (e) {
      toast.error("Error al exportar PDF");
    } finally {
      setIsExporting(null);
    }
  };

  const handleDownloadPng = async () => {
    setIsExporting("png");
    try {
      await workspaceReportService.downloadPublicPng(resolvedParams.publicToken, report.title);
      toast.success("PNG descargado correctamente");
    } catch (e) {
      toast.error("Error al exportar PNG");
    } finally {
      setIsExporting(null);
    }
  };

  const visibleBlocks = (report.blocks || []).filter((b) => b.is_visible);

  return (
    <div className="min-h-screen flex flex-col bg-neutral-100/70 dark:bg-neutral-950 text-neutral-900 dark:text-neutral-100">
      {/* Top Floating Branding Bar */}
      <header className="h-14 border-b border-neutral-200/80 dark:border-neutral-800 bg-white/80 dark:bg-neutral-900/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-30">
        <div className="flex items-center gap-2.5">
          <div className="w-7 h-7 rounded-lg bg-indigo-600 flex items-center justify-center text-white">
            <FileSpreadsheet className="w-4 h-4" />
          </div>
          <span className="text-xs font-bold tracking-tight uppercase text-neutral-700 dark:text-neutral-300">
            Executive Report
          </span>
        </div>

        <div className="flex items-center gap-2">
          {/* Print Button */}
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
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50 shadow-xs"
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
        </div>
      </header>

      {/* Main Document Body */}
      <main className="flex-1 p-6 sm:p-12 flex justify-center">
        <div
          style={{
            backgroundColor: report.theme?.backgroundColor || undefined,
            color: report.theme?.textColor || undefined,
            borderRadius: report.theme?.borderRadius || undefined,
            fontFamily: report.theme?.fontFamily || undefined,
          }}
          className="w-full max-w-5xl bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-3xl p-8 sm:p-12 shadow-sm space-y-8 transition-colors"
        >
          {/* Document Header */}
          <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-6">
            <h1 className="text-3xl sm:text-4xl font-extrabold tracking-tight text-neutral-900 dark:text-neutral-100">
              {report.title}
            </h1>
            {report.description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                {report.description}
              </p>
            )}
            <div className="flex items-center gap-3 text-xs text-neutral-400 mt-4">
              <span>Publicado por {report.owner?.name || "Autor"}</span>
              <span>•</span>
              <span>
                {new Date(report.published_at || report.updated_at).toLocaleDateString("es-ES", {
                  year: "numeric",
                  month: "long",
                  day: "numeric",
                })}
              </span>
            </div>
          </div>

          {/* Document Blocks Grid */}
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
                      data={block.data}
                      isEditing={false}
                    />
                  ) : null}
                </div>
              );
            })}
          </div>

          {/* Document Footer */}
          <div className="pt-8 border-t border-neutral-100 dark:border-neutral-800 flex items-center justify-between text-[11px] text-neutral-400">
            <span>Generado con el Sistema de Reportes Dinámicos</span>
            <span>Documento Oficial</span>
          </div>
        </div>
      </main>
    </div>
  );
}
