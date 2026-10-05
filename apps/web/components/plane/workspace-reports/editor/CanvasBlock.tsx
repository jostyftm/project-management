"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { GripVertical, Trash2, Copy, Eye, EyeOff } from "lucide-react";
import { blockRegistry } from "@/registry/block-registry";

interface CanvasBlockProps {
  block: ReportBlock;
  isSelected: boolean;
  data?: any;
  onSelect: () => void;
  onDelete: () => void;
  onDuplicate: () => void;
  onToggleVisibility: () => void;
  onUpdateConfig?: (cfg: Record<string, any>) => void;
}

export function CanvasBlock({
  block,
  isSelected,
  data,
  onSelect,
  onDelete,
  onDuplicate,
  onToggleVisibility,
  onUpdateConfig,
}: CanvasBlockProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: block.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : block.is_visible ? 1 : 0.6,
  };

  const blockDef = blockRegistry[block.type];
  const Component = blockDef?.renderComponent;

  // Grid width class
  const colSpanClass =
    block.width === 6
      ? "col-span-12 lg:col-span-6"
      : block.width === 4
      ? "col-span-12 lg:col-span-4"
      : block.width === 3
      ? "col-span-12 lg:col-span-3"
      : "col-span-12";

  return (
    <div
      ref={setNodeRef}
      style={style}
      onClick={(e) => {
        e.stopPropagation();
        onSelect();
      }}
      className={`${colSpanClass} group relative rounded-xl transition-all duration-150 ${
        isSelected
          ? "ring-2 ring-indigo-500 shadow-md ring-offset-2 ring-offset-neutral-100 dark:ring-offset-neutral-950"
          : "hover:ring-1 hover:ring-neutral-300 dark:hover:ring-neutral-700"
      }`}
    >
      {/* Floating Toolbar on Hover / Select */}
      <div
        className={`absolute -top-3 right-3 z-20 flex items-center gap-0.5 bg-neutral-900/90 text-neutral-200 backdrop-blur-xs px-1.5 py-0.5 rounded-md text-[11px] shadow-sm transition-opacity ${
          isSelected ? "opacity-100" : "opacity-0 group-hover:opacity-100"
        }`}
      >
        <button
          type="button"
          {...attributes}
          {...listeners}
          className="p-1 hover:text-white cursor-grab active:cursor-grabbing"
          title="Arrastrar para mover"
        >
          <GripVertical className="w-3.5 h-3.5" />
        </button>
        <div className="w-px h-3 bg-neutral-700 mx-0.5" />
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onToggleVisibility();
          }}
          className="p-1 hover:text-white"
          title={block.is_visible ? "Ocultar bloque" : "Mostrar bloque"}
        >
          {block.is_visible ? (
            <Eye className="w-3.5 h-3.5" />
          ) : (
            <EyeOff className="w-3.5 h-3.5 text-amber-400" />
          )}
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDuplicate();
          }}
          className="p-1 hover:text-white"
          title="Duplicar bloque"
        >
          <Copy className="w-3.5 h-3.5" />
        </button>
        <button
          type="button"
          onClick={(e) => {
            e.stopPropagation();
            onDelete();
          }}
          className="p-1 hover:text-rose-400"
          title="Eliminar bloque"
        >
          <Trash2 className="w-3.5 h-3.5" />
        </button>
      </div>

      {/* Render Component */}
      <div className="w-full">
        {Component ? (
          <Component
            block={block}
            data={data}
            isEditing={true}
            onUpdateConfig={onUpdateConfig}
          />
        ) : (
          <div className="p-4 bg-neutral-100 dark:bg-neutral-800 rounded-lg text-xs text-neutral-500">
            Bloque: {block.type}
          </div>
        )}
      </div>
    </div>
  );
}
