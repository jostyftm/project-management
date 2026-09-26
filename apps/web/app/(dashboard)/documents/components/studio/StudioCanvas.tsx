"use client";

import React from "react";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { RowContainer } from "./RowContainer";
import { Button } from "@/components/ui/button";
import { Plus, ZoomIn, ZoomOut, RotateCcw } from "lucide-react";
import { cn } from "@/lib/utils";

interface StudioCanvasProps {
  onOpenDataSourceModal?: (blockId: string) => void;
}

export const StudioCanvas: React.FC<StudioCanvasProps> = ({
  onOpenDataSourceModal,
}) => {
  const pageSettings = useDocStudioStore((state) => state.pageSettings);
  const rows = useDocStudioStore((state) => state.rows);
  const addRow = useDocStudioStore((state) => state.addRow);
  const setSelectedBlockId = useDocStudioStore((state) => state.setSelectedBlockId);
  const setSelectedRowId = useDocStudioStore((state) => state.setSelectedRowId);
  const isPreviewMode = useDocStudioStore((state) => state.isPreviewMode);
  const zoom = useDocStudioStore((state) => state.zoom);
  const setZoom = useDocStudioStore((state) => state.setZoom);
  const zoomIn = useDocStudioStore((state) => state.zoomIn);
  const zoomOut = useDocStudioStore((state) => state.zoomOut);
  const resetZoom = useDocStudioStore((state) => state.resetZoom);

  const { size, orientation, margins, header, footer } = pageSettings;

  // Max width calculation for realistic sheet display
  const getSheetDimensions = () => {
    const isLandscape = orientation === "landscape";

    switch (size) {
      case "a5":
        return isLandscape ? "max-w-[790px] min-h-[560px]" : "max-w-[560px] min-h-[790px]";
      case "letter":
        return isLandscape ? "max-w-[850px] min-h-[660px]" : "max-w-[660px] min-h-[850px]";
      case "legal":
        return isLandscape ? "max-w-[950px] min-h-[660px]" : "max-w-[660px] min-h-[950px]";
      case "a4":
      default:
        return isLandscape ? "max-w-[890px] min-h-[630px]" : "max-w-[630px] min-h-[890px]";
    }
  };

  const handleCanvasClick = (e: React.MouseEvent) => {
    if (e.target === e.currentTarget) {
      setSelectedBlockId(null);
      setSelectedRowId(null);
    }
  };

  return (
    <main
      className="flex-1 overflow-y-auto bg-slate-100 dark:bg-slate-950 p-6 flex justify-center items-start relative"
      onClick={handleCanvasClick}
    >
      {/* Virtual Document Sheet */}
      <div
        className={cn(
          "w-full bg-white dark:bg-card text-card-foreground shadow-lg border rounded-xs transition-transform relative flex flex-col justify-between",
          getSheetDimensions()
        )}
        style={{
          transform: `scale(${zoom / 100})`,
          transformOrigin: "top center",
          transition: "transform 0.15s ease-out",
          marginBottom: zoom > 100 ? `${(zoom - 100) * 8}px` : undefined,
          paddingTop: `${Math.max(16, margins.top * 1.5)}px`,
          paddingRight: `${Math.max(16, margins.right * 1.5)}px`,
          paddingBottom: `${Math.max(16, margins.bottom * 1.5)}px`,
          paddingLeft: `${Math.max(16, margins.left * 1.5)}px`,
        }}
      >
        {/* Header Preview */}
        {header?.enabled && header.text && (
          <header
            className={cn(
              "text-xs text-muted-foreground pb-2 mb-4 border-b",
              header.alignment === "center" && "text-center",
              header.alignment === "right" && "text-right",
              header.alignment === "left" && "text-left"
            )}
          >
            {header.text}
          </header>
        )}

        {/* Content Rows */}
        <div className="flex flex-col gap-2 flex-1">
          {rows.length === 0 ? (
            <div className="flex-1 min-h-[300px] flex flex-col items-center justify-center border-2 border-dashed rounded-lg p-8 text-center text-muted-foreground">
              <p className="text-sm font-medium mb-2">Este documento aún no tiene contenido</p>
              <p className="text-xs text-slate-400 mb-4">
                Comienza agregando una fila con columnas o arrastra bloques desde el panel lateral.
              </p>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-1 text-xs"
                onClick={() => addRow("1col")}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar primera fila</span>
              </Button>
            </div>
          ) : (
            rows.map((row, index) => (
              <RowContainer
                key={row.id}
                row={row}
                rowIndex={index}
                totalRows={rows.length}
                onOpenDataSourceModal={onOpenDataSourceModal}
              />
            ))
          )}

          {/* Quick add row button at the bottom of sheet in edit mode */}
          {!isPreviewMode && rows.length > 0 && (
            <div className="flex justify-center pt-4">
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-8 text-xs text-slate-400 hover:text-primary hover:bg-slate-50 border border-dashed border-slate-200 gap-1.5"
                onClick={() => addRow("1col")}
              >
                <Plus className="w-3.5 h-3.5" />
                <span>Agregar Fila</span>
              </Button>
            </div>
          )}
        </div>

        {/* Footer Preview */}
        {footer?.enabled && (
          <footer className="text-xs text-muted-foreground pt-3 mt-6 border-t flex items-center justify-between">
            <span>{footer.text || ""}</span>
            {footer.showPageNumber && <span>Página 1 de 1</span>}
          </footer>
        )}
      </div>

      {/* Floating Zoom Controls */}
      <div className="fixed bottom-4 right-6 z-30 flex items-center gap-1 bg-white/95 dark:bg-slate-900/95 backdrop-blur-xs border border-slate-200/80 dark:border-slate-800 shadow-md rounded-full px-2 py-1 text-xs">
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={zoom <= 50}
          onClick={zoomOut}
          className="h-6 w-6 p-0 rounded-full text-slate-600 hover:text-slate-900"
          title="Alejar (Zoom Out)"
        >
          <ZoomOut className="w-3.5 h-3.5" />
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          onClick={resetZoom}
          className="h-6 px-1.5 text-[11px] font-mono font-semibold text-slate-700 hover:text-slate-900"
          title="Restablecer al 100%"
        >
          {zoom}%
        </Button>
        <Button
          type="button"
          variant="ghost"
          size="sm"
          disabled={zoom >= 200}
          onClick={zoomIn}
          className="h-6 w-6 p-0 rounded-full text-slate-600 hover:text-slate-900"
          title="Acercar (Zoom In)"
        >
          <ZoomIn className="w-3.5 h-3.5" />
        </Button>
      </div>
    </main>
  );
};
