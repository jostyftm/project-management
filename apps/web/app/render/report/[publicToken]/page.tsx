"use client";

import React, { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { WorkspaceReport } from "@/types/workspace-report-types";
import { blockRegistry } from "@/registry/block-registry";
import { Loader2, Printer, Download, Image as ImageIcon } from "lucide-react";
import { toast } from "sonner";

export default function RenderReportPage({
  params,
}: {
  params: Promise<{ publicToken: string }>;
}) {
  const resolvedParams = use(params);
  const [report, setReport] = useState<WorkspaceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState(false);
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
      <div className="min-h-screen flex flex-col items-center justify-center bg-white text-neutral-400">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
        <span className="text-xs font-medium">Preparando renderizado para impresión...</span>
      </div>
    );
  }

  const handleDownloadPdf = async () => {
    setIsExporting("pdf");
    try {
      await workspaceReportService.downloadPublicPdf(resolvedParams.publicToken, report.title);
      toast.success("PDF descargado correctamente");
    } catch (e) {
      toast.error("Error al generar PDF");
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
      toast.error("Error al generar PNG");
    } finally {
      setIsExporting(null);
    }
  };

  const visibleBlocks = (report.blocks || []).filter((b) => b.is_visible);

  return (
    <div
      id="report-render-ready"
      data-ready="true"
      className="min-h-screen bg-white text-neutral-900 print:bg-white print:text-black print:p-0 p-8"
      style={{
        fontFamily: report.theme?.fontFamily || "Inter, sans-serif",
      }}
    >
      <style jsx global>{`
        @media print {
          @page {
            size: A4;
            margin: 12mm 14mm 14mm 14mm;
          }
          body {
            -webkit-print-color-adjust: exact !important;
            print-color-adjust: exact !important;
          }
          .no-print {
            display: none !important;
          }
          .report-block-wrapper {
            break-inside: avoid !important;
            page-break-inside: avoid !important;
          }
        }
      `}</style>

      {/* Floating Toolbar on Screen (hidden when printed) */}
      <div className="no-print fixed top-4 right-4 z-50 flex items-center gap-2 bg-white/95 dark:bg-neutral-900/95 border border-neutral-200 dark:border-neutral-800 p-2 rounded-xl shadow-lg backdrop-blur-xs">
        <button
          type="button"
          onClick={() => window.print()}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-neutral-100 hover:bg-neutral-200 text-neutral-800 transition-colors"
          title="Imprimir con el diálogo del navegador"
        >
          <Printer className="w-3.5 h-3.5" />
          Imprimir (Ctrl+P)
        </button>
        <button
          type="button"
          onClick={handleDownloadPdf}
          disabled={isExporting !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors disabled:opacity-50"
          title="Descargar PDF generado por el servidor"
        >
          {isExporting === "pdf" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <Download className="w-3.5 h-3.5" />
          )}
          Descargar PDF
        </button>
        <button
          type="button"
          onClick={handleDownloadPng}
          disabled={isExporting !== null}
          className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold border border-neutral-300 dark:border-neutral-700 text-neutral-700 dark:text-neutral-300 hover:bg-neutral-50 transition-colors disabled:opacity-50"
          title="Descargar PNG en alta resolución"
        >
          {isExporting === "png" ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <ImageIcon className="w-3.5 h-3.5" />
          )}
          PNG
        </button>
      </div>

      {/* Main Document Content */}
      <div className="max-w-5xl mx-auto w-full space-y-6">
        {/* Header */}
        <div className="border-b border-neutral-200 pb-5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-bold uppercase tracking-wider text-indigo-600 bg-indigo-50 px-2 py-0.5 rounded">
              Reporte Oficial
            </span>
            <span className="text-xs text-neutral-400">
              Generado:{" "}
              {new Date(report.published_at || report.updated_at).toLocaleDateString("es-ES", {
                year: "numeric",
                month: "long",
                day: "numeric",
              })}
            </span>
          </div>
          <h1 className="text-2xl sm:text-3xl font-extrabold text-neutral-950 mt-2">
            {report.title}
          </h1>
          {report.description && (
            <p className="text-xs sm:text-sm text-neutral-600 mt-1.5 leading-relaxed">
              {report.description}
            </p>
          )}
        </div>

        {/* Blocks Grid */}
        <div className="grid grid-cols-12 gap-5">
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
              <div key={block.id} className={`${colSpanClass} report-block-wrapper`}>
                {Component ? (
                  <Component block={block} data={block.data} isEditing={false} />
                ) : null}
              </div>
            );
          })}
        </div>

        {/* Footer */}
        <div className="pt-6 border-t border-neutral-200 flex items-center justify-between text-[11px] text-neutral-400">
          <span>Plane Dynamic Reports &bull; Fidelidad Idéntica</span>
          <span>Página 1</span>
        </div>
      </div>
    </div>
  );
}
