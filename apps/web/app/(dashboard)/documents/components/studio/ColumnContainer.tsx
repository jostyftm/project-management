"use client";

import React from "react";
import { DocumentBlock, DocumentColumn } from "@/types/document-type";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { BlockRenderer } from "./BlockRenderer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Plus,
  Type,
  Image as ImageIcon,
  BarChart,
  Table as TableIcon,
  Minus,
  Scissors,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface ColumnContainerProps {
  rowId: string;
  column: DocumentColumn;
  onOpenDataSourceModal?: (blockId: string) => void;
}

export const ColumnContainer: React.FC<ColumnContainerProps> = ({
  rowId,
  column,
  onOpenDataSourceModal,
}) => {
  const addBlock = useDocStudioStore((state) => state.addBlock);
  const isPreviewMode = useDocStudioStore((state) => state.isPreviewMode);

  const handleAddBlock = (type: DocumentBlock["type"]) => {
    addBlock(rowId, column.id, type);
  };

  const widthStyle: React.CSSProperties = {
    width: `${column.widthPercent}%`,
    flexBasis: `${column.widthPercent}%`,
  };

  return (
    <div
      style={widthStyle}
      className={cn(
        "flex flex-col min-h-[40px] px-2 py-1 transition-all",
        !isPreviewMode &&
          "border border-dashed border-slate-200 hover:border-slate-300 rounded"
      )}
    >
      {/* Column header tag in edit mode */}
      {!isPreviewMode && (
        <div className="flex justify-between items-center text-[10px] text-muted-foreground pb-1 select-none">
          <span className="font-mono">{Math.round(column.widthPercent)}%</span>
        </div>
      )}

      {/* Render blocks inside column */}
      <div className="flex flex-col gap-2 flex-1">
        {column.blocks.map((block) => (
          <BlockRenderer
            key={block.id}
            block={block}
            onOpenDataSourceModal={onOpenDataSourceModal}
          />
        ))}

        {/* Empty placeholder / Add block button */}
        {!isPreviewMode && (
          <div className="pt-1">
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  className="w-full h-8 border border-dashed border-slate-300 hover:border-primary hover:text-primary text-xs gap-1 text-slate-400"
                >
                  <Plus className="w-3.5 h-3.5" />
                  <span>Añadir bloque</span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-48 text-xs">
                <DropdownMenuItem onClick={() => handleAddBlock("text")}>
                  <Type className="w-3.5 h-3.5 mr-2 text-primary" />
                  <span>Texto con formato</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock("image")}>
                  <ImageIcon className="w-3.5 h-3.5 mr-2 text-primary" />
                  <span>Imagen</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock("chart")}>
                  <BarChart className="w-3.5 h-3.5 mr-2 text-primary" />
                  <span>Widget Gráfica</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock("table")}>
                  <TableIcon className="w-3.5 h-3.5 mr-2 text-primary" />
                  <span>Widget Tabla</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock("divider")}>
                  <Minus className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>Línea divisoria</span>
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => handleAddBlock("page_break")}>
                  <Scissors className="w-3.5 h-3.5 mr-2 text-slate-400" />
                  <span>Salto de página</span>
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        )}
      </div>
    </div>
  );
};
