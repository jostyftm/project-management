"use client";

import React from "react";
import { ReportBlock, WorkspaceReport } from "@/types/workspace-report-types";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CanvasBlock } from "./CanvasBlock";
import { PlusCircle } from "lucide-react";

interface EditorCanvasProps {
  report: WorkspaceReport;
  blocks: ReportBlock[];
  selectedBlockId: string | null;
  blocksData?: Record<string, any>;
  zoom?: number;
  onSelectBlock: (id: string | null) => void;
  onReorderBlocks: (newBlocks: ReportBlock[]) => void;
  onDeleteBlock: (blockId: string) => void;
  onDuplicateBlock: (blockId: string) => void;
  onToggleVisibility: (blockId: string) => void;
  onUpdateConfig: (blockId: string, cfg: Record<string, any>) => void;
  onOpenSidebar: () => void;
}

export function EditorCanvas({
  report,
  blocks,
  selectedBlockId,
  blocksData,
  zoom = 100,
  onSelectBlock,
  onReorderBlocks,
  onDeleteBlock,
  onDuplicateBlock,
  onToggleVisibility,
  onUpdateConfig,
  onOpenSidebar,
}: EditorCanvasProps) {
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || active.id === over.id) return;

    const oldIndex = blocks.findIndex((b) => b.id === active.id);
    const newIndex = blocks.findIndex((b) => b.id === over.id);

    if (oldIndex !== -1 && newIndex !== -1) {
      const reordered = arrayMove(blocks, oldIndex, newIndex);
      onReorderBlocks(reordered);
    }
  };

  const scale = zoom / 100;

  return (
    <main
      onClick={() => onSelectBlock(null)}
      className="flex-1 bg-neutral-100/70 dark:bg-neutral-950 overflow-y-auto p-8 flex justify-center cursor-default"
    >
      <div
        style={{
          transform: `scale(${scale})`,
          transformOrigin: "top center",
          transition: "transform 150ms ease-out",
        }}
        className="w-full max-w-5xl"
      >
        {/* Report Document Sheet */}
        <div
          style={{
            backgroundColor: report.theme?.backgroundColor || undefined,
            color: report.theme?.textColor || undefined,
            borderRadius: report.theme?.borderRadius || undefined,
            fontFamily: report.theme?.fontFamily || undefined,
          }}
          className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-8 sm:p-10 shadow-xs min-h-[700px] transition-colors"
        >
          {/* Document Header */}
          <div className="border-b border-neutral-100 dark:border-neutral-800/80 pb-6 mb-8">
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-neutral-900 dark:text-neutral-100">
              {report.title || "Reporte Sin Título"}
            </h1>
            {report.description && (
              <p className="text-sm text-neutral-500 dark:text-neutral-400 mt-2 leading-relaxed">
                {report.description}
              </p>
            )}
          </div>

          {/* Blocks Grid / Canvas */}
          {blocks.length === 0 ? (
            <div className="border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl p-12 text-center my-8">
              <PlusCircle className="w-10 h-10 text-neutral-400 mx-auto mb-3" />
              <h3 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200">
                Tu reporte aún no tiene bloques
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400 mt-1 max-w-xs mx-auto">
                Selecciona componentes desde el panel izquierdo para comenzar a componer este informe ejecutivo.
              </p>
              <button
                type="button"
                onClick={onOpenSidebar}
                className="mt-4 px-3.5 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors"
              >
                Explorar bloques
              </button>
            </div>
          ) : (
            <DndContext
              sensors={sensors}
              collisionDetection={closestCenter}
              onDragEnd={handleDragEnd}
            >
              <SortableContext
                items={blocks.map((b) => b.id)}
                strategy={verticalListSortingStrategy}
              >
                <div className="grid grid-cols-12 gap-6">
                  {blocks.map((block) => (
                    <CanvasBlock
                      key={block.id}
                      block={block}
                      isSelected={selectedBlockId === block.id}
                      data={blocksData?.[block.id]}
                      onSelect={() => onSelectBlock(block.id)}
                      onDelete={() => onDeleteBlock(block.id)}
                      onDuplicate={() => onDuplicateBlock(block.id)}
                      onToggleVisibility={() => onToggleVisibility(block.id)}
                      onUpdateConfig={(cfg) => onUpdateConfig(block.id, cfg)}
                    />
                  ))}
                </div>
              </SortableContext>
            </DndContext>
          )}
        </div>
      </div>
    </main>
  );
}
