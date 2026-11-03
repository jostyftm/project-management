"use client";

import React, { useEffect, useState, useCallback, useRef } from "react";
import { BlockType, ReportBlock, WorkspaceReport } from "@/types/workspace-report-types";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { useReportEditorStore } from "@/store/report-editor-store";
import { EditorTopBar } from "./EditorTopBar";
import { BlocksSidebar } from "./BlocksSidebar";
import { EditorCanvas } from "./EditorCanvas";
import { BlockConfigPanel } from "./BlockConfigPanel";
import { ReportSnapshotsModal } from "./ReportSnapshotsModal";
import { blockRegistry } from "@/registry/block-registry";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

interface ReportEditorProps {
  initialReport: WorkspaceReport;
  workspaceId: string | number;
}

export function ReportEditor({ initialReport, workspaceId }: ReportEditorProps) {
  const {
    report,
    blocks,
    selectedBlockId,
    isDirty,
    isSaving,
    zoom,
    setReport,
    setBlocks,
    selectBlock,
    updateBlockLocal,
    addBlockLocal,
    removeBlockLocal,
    reorderBlocksLocal,
    setZoom,
    setIsSaving,
    markSaved,
    undo,
    redo,
    canUndo,
    canRedo,
  } = useReportEditorStore();

  const [blocksData, setBlocksData] = useState<Record<string, any>>({});
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [snapshotsModalOpen, setSnapshotsModalOpen] = useState(false);
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Initialize store with server data
  useEffect(() => {
    setReport(initialReport);
    setBlocks(initialReport.blocks || []);
  }, [initialReport, setReport, setBlocks]);

  // Fetch all block resolved data
  const refreshBlocksData = useCallback(async () => {
    if (!initialReport.id) return;
    try {
      const data = await workspaceReportService.getAllData(workspaceId, initialReport.id);
      setBlocksData(data || {});
    } catch (e) {
      console.error("Error fetching report data", e);
    }
  }, [workspaceId, initialReport.id]);

  useEffect(() => {
    refreshBlocksData();
  }, [refreshBlocksData]);

  // Save changes to API
  const handleSave = useCallback(async () => {
    if (!report) return;
    setIsSaving(true);
    try {
      // 1. Update report header
      await workspaceReportService.update(workspaceId, report.id, {
        title: report.title,
        description: report.description || undefined,
        visibility: report.visibility,
        theme: report.theme,
      });

      // 2. Persist blocks configurations
      for (const block of blocks) {
        await workspaceReportService.updateBlock(workspaceId, report.id, block.id, {
          title: block.title || undefined,
          width: block.width,
          config: block.config,
          is_visible: block.is_visible,
        });
      }

      markSaved();
      toast.success("Reporte guardado correctamente");
      refreshBlocksData();
    } catch (e) {
      console.error("Failed to save report", e);
      toast.error("Error al guardar el reporte");
    } finally {
      setIsSaving(false);
    }
  }, [report, blocks, workspaceId, setIsSaving, markSaved, refreshBlocksData]);

  // Debounced auto-save every 3s if dirty
  useEffect(() => {
    if (!isDirty) return;

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      handleSave();
    }, 3000);

    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
    };
  }, [isDirty, handleSave]);

  // Add block
  const handleAddBlock = async (type: BlockType) => {
    if (!report) return;
    const def = blockRegistry[type];
    try {
      const newBlock = await workspaceReportService.createBlock(workspaceId, report.id, {
        type,
        title: def.label,
        width: def.defaultWidth || 12,
        config: def.defaultConfig || {},
      });
      addBlockLocal(newBlock);
      toast.success(`Bloque "${def.label}" agregado`);
      refreshBlocksData();
    } catch (e) {
      toast.error("Error al agregar bloque");
    }
  };

  // Reorder blocks
  const handleReorderBlocks = async (newBlocks: ReportBlock[]) => {
    if (!report) return;
    reorderBlocksLocal(newBlocks);
    try {
      const order = newBlocks.map((b, idx) => ({ id: b.id, position: idx }));
      await workspaceReportService.reorderBlocks(workspaceId, report.id, order);
    } catch (e) {
      toast.error("Error al reordenar bloques");
    }
  };

  // Delete block
  const handleDeleteBlock = async (blockId: string) => {
    if (!report) return;
    try {
      await workspaceReportService.deleteBlock(workspaceId, report.id, blockId);
      removeBlockLocal(blockId);
      toast.success("Bloque eliminado");
    } catch (e) {
      toast.error("Error al eliminar bloque");
    }
  };

  // Duplicate block
  const handleDuplicateBlock = async (blockId: string) => {
    if (!report) return;
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    try {
      const newBlock = await workspaceReportService.createBlock(workspaceId, report.id, {
        type: block.type,
        title: block.title ? `${block.title} (copia)` : undefined,
        width: block.width,
        config: block.config,
      });
      addBlockLocal(newBlock);
      toast.success("Bloque duplicado");
      refreshBlocksData();
    } catch (e) {
      toast.error("Error al duplicar bloque");
    }
  };

  // Toggle visibility
  const handleToggleVisibility = async (blockId: string) => {
    if (!report) return;
    const block = blocks.find((b) => b.id === blockId);
    if (!block) return;
    const nextVal = !block.is_visible;
    updateBlockLocal(blockId, { is_visible: nextVal });
    try {
      await workspaceReportService.updateBlock(workspaceId, report.id, blockId, {
        is_visible: nextVal,
      });
    } catch (e) {
      toast.error("Error al cambiar visibilidad");
    }
  };

  // Publish / Share
  const handlePublish = async () => {
    if (!report) return;
    try {
      const updated = await workspaceReportService.publish(workspaceId, report.id);
      setReport(updated);
      setShareModalOpen(true);
      toast.success("Reporte publicado con enlace público");
    } catch (e) {
      toast.error("Error al publicar reporte");
    }
  };

  // Apply Template
  const handleApplyTemplate = async (templateId: string) => {
    if (!report) return;
    const confirmed = confirm(
      "¿Deseas aplicar esta plantilla? Se reemplazarán los bloques actuales del reporte con los bloques definidos en la plantilla seleccionada."
    );
    if (!confirmed) return;

    try {
      const updated = await workspaceReportService.applyTemplate(
        workspaceId,
        report.id,
        templateId
      );
      setReport(updated);
      setBlocks(updated.blocks || []);
      toast.success("Plantilla aplicada con éxito");
      refreshBlocksData();
    } catch (e) {
      console.error(e);
      toast.error("Error al aplicar la plantilla");
    }
  };

  // Restore Snapshot
  const handleRestoreSnapshot = async (snapshotId: string | number) => {
    if (!report) return;
    const restored = await workspaceReportService.restoreSnapshot(
      workspaceId,
      report.id,
      snapshotId
    );
    setReport(restored);
    setBlocks(restored.blocks || []);
    refreshBlocksData();
  };

  const selectedBlock = blocks.find((b) => b.id === selectedBlockId) || null;

  return (
    <div className="flex flex-col h-[calc(100vh-3.5rem)] w-full overflow-hidden bg-neutral-100 dark:bg-neutral-950">
      {/* Top Bar */}
      {report && (
        <EditorTopBar
          report={report}
          workspaceId={workspaceId}
          isDirty={isDirty}
          isSaving={isSaving}
          zoom={zoom}
          canUndo={canUndo()}
          canRedo={canRedo()}
          onUndo={undo}
          onRedo={redo}
          onZoomChange={setZoom}
          onSave={handleSave}
          onPublish={handlePublish}
          onOpenSnapshots={() => setSnapshotsModalOpen(true)}
          onTitleChange={(title) => {
            if (report) setReport({ ...report, title });
          }}
        />
      )}

      {/* Main 3-Column Layout */}
      <div className="flex flex-1 overflow-hidden">
        {/* Left Column: Blocks & Themes */}
        <BlocksSidebar
          onAddBlock={handleAddBlock}
          onApplyTemplate={handleApplyTemplate}
          activeTheme={report?.theme?.primaryColor || "default_light"}
          onSelectTheme={(theme) => {
            if (report) {
              setReport({
                ...report,
                theme,
              });
            }
          }}
        />

        {/* Center Column: Interactive Canvas */}
        {report && (
          <EditorCanvas
            report={report}
            blocks={blocks}
            selectedBlockId={selectedBlockId}
            blocksData={blocksData}
            zoom={zoom}
            onSelectBlock={selectBlock}
            onReorderBlocks={handleReorderBlocks}
            onDeleteBlock={handleDeleteBlock}
            onDuplicateBlock={handleDuplicateBlock}
            onToggleVisibility={handleToggleVisibility}
            onUpdateConfig={(blockId, cfg) => {
              updateBlockLocal(blockId, { config: cfg });
            }}
            onOpenSidebar={() => selectBlock(null)}
          />
        )}

        {/* Right Column: Block or Report Config Panel */}
        <BlockConfigPanel
          block={selectedBlock}
          report={report}
          onUpdateBlock={(id, partial) => updateBlockLocal(id, partial)}
          onDeleteBlock={handleDeleteBlock}
          onUpdateReport={(partial) => {
            if (report) setReport({ ...report, ...partial });
          }}
          onClose={() => selectBlock(null)}
        />
      </div>

      {/* Share Modal Dialog */}
      {shareModalOpen && report && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4">
          <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-md w-full p-6 shadow-xl space-y-4">
            <h3 className="text-base font-bold text-neutral-900 dark:text-neutral-100">
              Compartir Reporte Ejecutivo
            </h3>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              Cualquier persona con este enlace podrá ver este informe sin necesidad de iniciar sesión:
            </p>
            <div className="flex items-center gap-2 bg-neutral-100 dark:bg-neutral-800 p-2.5 rounded-xl border border-neutral-200 dark:border-neutral-700">
              <input
                readOnly
                type="text"
                value={`${typeof window !== "undefined" ? window.location.origin : ""}/r/${report.public_token}`}
                className="text-xs bg-transparent w-full text-neutral-800 dark:text-neutral-200 focus:outline-none"
              />
              <button
                type="button"
                onClick={async () => {
                  const url = `${window.location.origin}/r/${report.public_token}`;
                  const ok = await copyToClipboard(url);
                  if (ok) {
                    toast.success("Enlace copiado al portapapeles");
                  } else {
                    toast.error("No se pudo copiar el enlace");
                  }
                }}
                className="px-2.5 py-1 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors shrink-0"
              >
                Copiar
              </button>
            </div>
            <div className="flex justify-end pt-2">
              <button
                type="button"
                onClick={() => setShareModalOpen(false)}
                className="px-4 py-2 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Snapshots / Versioning Modal */}
      {report && (
        <ReportSnapshotsModal
          isOpen={snapshotsModalOpen}
          onClose={() => setSnapshotsModalOpen(false)}
          workspaceId={workspaceId}
          reportId={report.id}
          onRestoreSnapshot={handleRestoreSnapshot}
        />
      )}
    </div>
  );
}
