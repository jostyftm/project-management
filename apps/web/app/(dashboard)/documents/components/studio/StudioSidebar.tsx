"use client";

import React from "react";
import {
  RowLayoutType,
  useDocStudioStore,
} from "@/hooks/zustand/use-doc-studio-store";
import { DocumentBlock } from "@/types/document-type";
import { Button } from "@/components/ui/button";
import {
  Type,
  Image as ImageIcon,
  BarChart3,
  Table as TableIcon,
  Minus,
  Scissors,
  Columns,
  Square,
  LayoutGrid,
} from "lucide-react";

export const StudioSidebar: React.FC = () => {
  const addRow = useDocStudioStore((state) => state.addRow);
  const rows = useDocStudioStore((state) => state.rows);
  const addBlock = useDocStudioStore((state) => state.addBlock);

  const handleAddRow = (layout: RowLayoutType) => {
    addRow(layout);
  };

  const handleAddBlockToLastRow = (type: DocumentBlock["type"]) => {
    if (rows.length === 0) {
      const newRowId = addRow("1col");
      // Find the row just added
      const state = useDocStudioStore.getState();
      const targetRow = state.rows.find((r) => r.id === newRowId);
      if (targetRow && targetRow.columns.length > 0) {
        addBlock(newRowId, targetRow.columns[0].id, type);
      }
      return;
    }

    const lastRow = rows[rows.length - 1];
    const targetCol = lastRow.columns[0];
    addBlock(lastRow.id, targetCol.id, type);
  };

  return (
    <aside className="w-64 border-r bg-card p-4 flex flex-col gap-6 overflow-y-auto shrink-0 select-none">
      {/* Estructura / Layout */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Columns className="w-3.5 h-3.5" />
          <span>Estructura (Filas)</span>
        </h4>
        <div className="grid grid-cols-1 gap-1.5 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddRow("1col")}
          >
            <Square className="w-4 h-4 text-primary" />
            <span>Fila (1 columna)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddRow("2col-equal")}
          >
            <Columns className="w-4 h-4 text-primary" />
            <span>Fila 2 col (50% / 50%)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddRow("2col-70-30")}
          >
            <Columns className="w-4 h-4 text-primary" />
            <span>Fila 2 col (70% / 30%)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddRow("3col")}
          >
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span>Fila (3 columnas)</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddRow("4col")}
          >
            <LayoutGrid className="w-4 h-4 text-primary" />
            <span>Fila (4 columnas)</span>
          </Button>
        </div>
      </div>

      {/* Bloques de Contenido */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <Type className="w-3.5 h-3.5" />
          <span>Contenido</span>
        </h4>
        <div className="grid grid-cols-1 gap-1.5 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddBlockToLastRow("text")}
          >
            <Type className="w-4 h-4 text-blue-600" />
            <span>Texto enriquecido</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddBlockToLastRow("image")}
          >
            <ImageIcon className="w-4 h-4 text-emerald-600" />
            <span>Imagen</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddBlockToLastRow("divider")}
          >
            <Minus className="w-4 h-4 text-slate-500" />
            <span>Separador horizontal</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddBlockToLastRow("page_break")}
          >
            <Scissors className="w-4 h-4 text-amber-600" />
            <span>Salto de página</span>
          </Button>
        </div>
      </div>

      {/* Widgets con Datos Dinámicos */}
      <div className="space-y-2">
        <h4 className="text-xs font-bold uppercase tracking-wider text-muted-foreground flex items-center gap-1.5">
          <BarChart3 className="w-3.5 h-3.5" />
          <span>Datos Dinámicos</span>
        </h4>
        <div className="grid grid-cols-1 gap-1.5 pt-1">
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddBlockToLastRow("table")}
          >
            <TableIcon className="w-4 h-4 text-purple-600" />
            <span>Widget de Tabla</span>
          </Button>
          <Button
            type="button"
            variant="outline"
            size="sm"
            className="w-full justify-start text-xs h-9 gap-2"
            onClick={() => handleAddBlockToLastRow("chart")}
          >
            <BarChart3 className="w-4 h-4 text-indigo-600" />
            <span>Widget de Gráfica</span>
          </Button>
        </div>
      </div>
    </aside>
  );
};
