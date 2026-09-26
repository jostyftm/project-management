"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { useDocumentActions } from "../../hooks/use-documents";
import {
  previewDocumentPdf,
  previewDocumentWord,
  downloadBlob,
} from "@/services/document-service";
import { StudioHeader } from "./StudioHeader";
import { StudioSidebar } from "./StudioSidebar";
import { StudioCanvas } from "./StudioCanvas";
import { StudioPropertiesDrawer } from "./StudioPropertiesDrawer";
import { PageSettingsModal } from "./PageSettingsModal";
import { ReportDataModal } from "./ReportDataModal";
import { ScheduleDialog } from "@/app/(dashboard)/reports/schedule/components/ScheduleDialog";
import { enrichSchemaWithChartImages } from "@/lib/chart-rasterizer";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";

export const DocStudio: React.FC = () => {
  const router = useRouter();
  const { user } = useAuth();
  const id = useDocStudioStore((state) => state.id);
  const name = useDocStudioStore((state) => state.name);
  const isSaving = useDocStudioStore((state) => state.isSaving);
  const setIsSaving = useDocStudioStore((state) => state.setIsSaving);
  const setIsDirty = useDocStudioStore((state) => state.setIsDirty);
  const isPreviewMode = useDocStudioStore((state) => state.isPreviewMode);
  const getSchema = useDocStudioStore((state) => state.getSchema);
  const selectedBlockId = useDocStudioStore((state) => state.selectedBlockId);
  const setSelectedBlockId = useDocStudioStore((state) => state.setSelectedBlockId);
  const rows = useDocStudioStore((state) => state.rows);
  const undo = useDocStudioStore((state) => state.undo);
  const redo = useDocStudioStore((state) => state.redo);

  const selectedBlock = React.useMemo(() => {
    if (!selectedBlockId) return null;
    for (const r of rows) {
      for (const col of r.columns) {
        const b = col.blocks.find((blk) => blk.id === selectedBlockId);
        if (b) return b;
      }
    }
    return null;
  }, [rows, selectedBlockId]);

  const { createDocument, updateDocument } = useDocumentActions();

  const [pageSettingsOpen, setPageSettingsOpen] = useState(false);
  const [scheduleDialogOpen, setScheduleDialogOpen] = useState(false);
  const [reportDataModalOpen, setReportDataModalOpen] = useState(false);
  const [targetDataSourceBlockId, setTargetDataSourceBlockId] = useState<string | null>(null);
  const [isExporting, setIsExporting] = useState(false);
  const [isSidebarOpen, setIsSidebarOpen] = useState(true);

  const handleOpenDataSourceModal = (blockId: string) => {
    setTargetDataSourceBlockId(blockId);
    setReportDataModalOpen(true);
  };

  const handleSave = async () => {
    const schema = getSchema();
    if (!schema.name.trim()) {
      toast.error("El documento debe tener un nombre");
      return;
    }

    setIsSaving(true);
    try {
      if (id) {
        await updateDocument({ id, data: schema });
        setIsDirty(false);
      } else {
        const payload = {
          ...schema,
          ...(user?.id ? { user_id: user.id } : {}),
        };
        const created = await createDocument(payload);
        if (created?.data?.id) {
          useDocStudioStore.setState({ id: created.data.id });
          setIsDirty(false);
          router.replace(`/documents/studio/${created.data.id}`);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al guardar el documento");
    } finally {
      setIsSaving(false);
    }
  };

  const handleExportPdf = async () => {
    setIsExporting(true);
    try {
      toast.info("Generando PDF en servidor...");
      const schema = await enrichSchemaWithChartImages(getSchema());
      const blob = await previewDocumentPdf(schema);
      const filename = `${(name || "documento").replace(/\s+/g, "_")}.pdf`;
      downloadBlob(blob, filename);
      toast.success("PDF generado y descargado correctamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al generar PDF");
    } finally {
      setIsExporting(false);
    }
  };

  const handleExportWord = async () => {
    setIsExporting(true);
    try {
      toast.info("Generando documento Word (.docx) en servidor...");
      const schema = await enrichSchemaWithChartImages(getSchema());
      const blob = await previewDocumentWord(schema);
      const filename = `${(name || "documento").replace(/\s+/g, "_")}.docx`;
      downloadBlob(blob, filename);
      toast.success("Documento Word generado y descargado correctamente");
    } catch (err: any) {
      toast.error(err?.message || "Error al generar Word");
    } finally {
      setIsExporting(false);
    }
  };

  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput =
        target &&
        (target.tagName === "INPUT" ||
          target.tagName === "TEXTAREA" ||
          target.isContentEditable);

      if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "z") {
        if (!isInput) {
          if (e.shiftKey) {
            e.preventDefault();
            redo();
          } else {
            e.preventDefault();
            undo();
          }
        }
      } else if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === "y") {
        if (!isInput) {
          e.preventDefault();
          redo();
        }
      } else if (e.key === "Escape") {
        setSelectedBlockId(null);
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [undo, redo, setSelectedBlockId]);

  return (
    <div className="flex flex-col h-screen w-screen overflow-hidden bg-background">
      {/* Studio Header */}
      <StudioHeader
        onOpenPageSettings={() => setPageSettingsOpen(true)}
        onOpenScheduleDialog={() => setScheduleDialogOpen(true)}
        onSave={handleSave}
        onExportPdf={handleExportPdf}
        onExportWord={handleExportWord}
        isExporting={isExporting}
        isSidebarOpen={isSidebarOpen}
        onToggleSidebar={() => setIsSidebarOpen((prev) => !prev)}
      />

      {/* Studio Body: Left Sidebar + Central Canvas + Right Properties Drawer */}
      <div className="flex flex-1 overflow-hidden relative">
        {!isPreviewMode && isSidebarOpen && <StudioSidebar />}
        <StudioCanvas onOpenDataSourceModal={handleOpenDataSourceModal} />
        {!isPreviewMode && selectedBlock && (
          <StudioPropertiesDrawer
            block={selectedBlock}
            onClose={() => setSelectedBlockId(null)}
            onOpenDataSourceModal={handleOpenDataSourceModal}
          />
        )}
      </div>

      {/* Modals */}
      <PageSettingsModal
        open={pageSettingsOpen}
        onOpenChange={setPageSettingsOpen}
      />

      <ReportDataModal
        open={reportDataModalOpen}
        onOpenChange={setReportDataModalOpen}
        targetBlockId={targetDataSourceBlockId}
      />

      <ScheduleDialog
        open={scheduleDialogOpen}
        onOpenChange={setScheduleDialogOpen}
        defaultDocumentTemplateId={id}
      />
    </div>
  );
};
