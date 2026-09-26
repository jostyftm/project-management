"use client";

import React from "react";
import { DocumentBlock } from "@/types/document-type";
import { useDocStudioStore } from "@/hooks/zustand/use-doc-studio-store";
import { TextBlockView } from "./blocks/TextBlockView";
import { ImageBlockView } from "./blocks/ImageBlockView";
import { ChartBlockView } from "./blocks/ChartBlockView";
import { TableBlockView } from "./blocks/TableBlockView";
import { DividerBlockView } from "./blocks/DividerBlockView";
import { PageBreakBlockView } from "./blocks/PageBreakBlockView";
import { Button } from "@/components/ui/button";
import { ArrowUp, ArrowDown, Trash2, GripVertical } from "lucide-react";
import { cn } from "@/lib/utils";

interface BlockRendererProps {
  block: DocumentBlock;
  onOpenDataSourceModal?: (blockId: string) => void;
}

export const BlockRenderer: React.FC<BlockRendererProps> = ({
  block,
  onOpenDataSourceModal,
}) => {
  const selectedBlockId = useDocStudioStore((state) => state.selectedBlockId);
  const setSelectedBlockId = useDocStudioStore((state) => state.setSelectedBlockId);
  const deleteBlock = useDocStudioStore((state) => state.deleteBlock);
  const moveBlock = useDocStudioStore((state) => state.moveBlock);
  const isPreviewMode = useDocStudioStore((state) => state.isPreviewMode);

  const isSelected = selectedBlockId === block.id;

  const handleSelect = (e: React.MouseEvent) => {
    if (isPreviewMode) return;
    e.stopPropagation();
    setSelectedBlockId(block.id);
  };

  const renderInnerBlock = () => {
    switch (block.type) {
      case "text":
        return (
          <TextBlockView
            block={block}
            isSelected={isSelected}
            isPreview={isPreviewMode}
          />
        );
      case "image":
        return (
          <ImageBlockView
            block={block}
            isSelected={isSelected}
            isPreview={isPreviewMode}
          />
        );
      case "chart":
        return (
          <ChartBlockView
            block={block}
            isSelected={isSelected}
            isPreview={isPreviewMode}
            onOpenDataSourceModal={onOpenDataSourceModal}
          />
        );
      case "table":
        return (
          <TableBlockView
            block={block}
            isSelected={isSelected}
            isPreview={isPreviewMode}
            onOpenDataSourceModal={onOpenDataSourceModal}
          />
        );
      case "divider":
        return <DividerBlockView block={block} />;
      case "page_break":
        return <PageBreakBlockView block={block} isPreview={isPreviewMode} />;
      default:
        return null;
    }
  };

  if (isPreviewMode) {
    return <div className="w-full">{renderInnerBlock()}</div>;
  }

  return (
    <div
      onClick={handleSelect}
      className={cn(
        "relative group/block rounded transition-all",
        isSelected
          ? "ring-2 ring-primary ring-offset-2"
          : "hover:ring-1 hover:ring-slate-300"
      )}
    >
      {/* Block quick floating action controls on hover */}
      <div
        className={cn(
          "absolute right-1 top-1 z-20 flex items-center gap-0.5 bg-white dark:bg-slate-900 border rounded shadow-xs p-0.5 opacity-0 group-hover/block:opacity-100 transition-opacity",
          isSelected && "opacity-100"
        )}
      >
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900"
          onClick={(e) => {
            e.stopPropagation();
            moveBlock(block.id, "up");
          }}
          title="Mover arriba"
        >
          <ArrowUp className="w-3 h-3" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900"
          onClick={(e) => {
            e.stopPropagation();
            moveBlock(block.id, "down");
          }}
          title="Mover abajo"
        >
          <ArrowDown className="w-3 h-3" />
        </Button>
        <Button
          type="button"
          size="sm"
          variant="ghost"
          className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
          onClick={(e) => {
            e.stopPropagation();
            deleteBlock(block.id);
          }}
          title="Eliminar bloque"
        >
          <Trash2 className="w-3 h-3" />
        </Button>
      </div>

      {renderInnerBlock()}
    </div>
  );
};
