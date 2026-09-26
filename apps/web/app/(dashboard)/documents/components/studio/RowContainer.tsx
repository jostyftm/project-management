"use client";

import React from "react";
import { DocumentRow } from "@/types/document-type";
import {
  RowLayoutType,
  useDocStudioStore,
} from "@/hooks/zustand/use-doc-studio-store";
import { ColumnContainer } from "./ColumnContainer";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  ArrowUp,
  ArrowDown,
  Trash2,
  Columns,
  GripHorizontal,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface RowContainerProps {
  row: DocumentRow;
  rowIndex: number;
  totalRows: number;
  onOpenDataSourceModal?: (blockId: string) => void;
}

export const RowContainer: React.FC<RowContainerProps> = ({
  row,
  rowIndex,
  totalRows,
  onOpenDataSourceModal,
}) => {
  const deleteRow = useDocStudioStore((state) => state.deleteRow);
  const moveRow = useDocStudioStore((state) => state.moveRow);
  const setRowColumns = useDocStudioStore((state) => state.setRowColumns);
  const selectedRowId = useDocStudioStore((state) => state.selectedRowId);
  const setSelectedRowId = useDocStudioStore((state) => state.setSelectedRowId);
  const isPreviewMode = useDocStudioStore((state) => state.isPreviewMode);

  const isSelected = selectedRowId === row.id;

  const handleLayoutChange = (layout: RowLayoutType) => {
    setRowColumns(row.id, layout);
  };

  return (
    <div
      onClick={() => !isPreviewMode && setSelectedRowId(row.id)}
      className={cn(
        "relative group/row rounded-md transition-all my-2",
        !isPreviewMode &&
          "p-1 border border-transparent hover:border-slate-300",
        isSelected && !isPreviewMode && "border-slate-400 bg-slate-50/40"
      )}
    >
      {/* Row Controls Toolbar (Left/Top) */}
      {!isPreviewMode && (
        <div
          className={cn(
            "absolute -top-3.5 right-2 z-20 flex items-center gap-1 bg-white dark:bg-slate-900 border rounded shadow-xs px-1.5 py-0.5 opacity-0 group-hover/row:opacity-100 transition-opacity text-xs",
            isSelected && "opacity-100"
          )}
        >
          {/* Layout Column Selector */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="h-6 px-1.5 text-xs text-slate-600 hover:text-slate-900 gap-1"
                title="Cambiar distribución de columnas"
              >
                <Columns className="w-3 h-3 text-primary" />
                <span>Columnas</span>
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 text-xs">
              <DropdownMenuItem onClick={() => handleLayoutChange("1col")}>
                <span>1 Columna (100%)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLayoutChange("2col-equal")}>
                <span>2 Columnas (50% / 50%)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLayoutChange("2col-70-30")}>
                <span>2 Columnas (70% / 30%)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLayoutChange("3col")}>
                <span>3 Columnas (33% c/u)</span>
              </DropdownMenuItem>
              <DropdownMenuItem onClick={() => handleLayoutChange("4col")}>
                <span>4 Columnas (25% c/u)</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={rowIndex === 0}
            className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900 disabled:opacity-30"
            onClick={(e) => {
              e.stopPropagation();
              moveRow(row.id, "up");
            }}
            title="Mover fila arriba"
          >
            <ArrowUp className="w-3 h-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={rowIndex === totalRows - 1}
            className="h-6 w-6 p-0 text-slate-500 hover:text-slate-900 disabled:opacity-30"
            onClick={(e) => {
              e.stopPropagation();
              moveRow(row.id, "down");
            }}
            title="Mover fila abajo"
          >
            <ArrowDown className="w-3 h-3" />
          </Button>

          <Button
            type="button"
            variant="ghost"
            size="sm"
            className="h-6 w-6 p-0 text-red-500 hover:text-red-700"
            onClick={(e) => {
              e.stopPropagation();
              deleteRow(row.id);
            }}
            title="Eliminar fila"
          >
            <Trash2 className="w-3 h-3" />
          </Button>
        </div>
      )}

      {/* Row Columns Container */}
      <div className="flex flex-row w-full gap-2 items-stretch">
        {row.columns.map((col) => (
          <ColumnContainer
            key={col.id}
            rowId={row.id}
            column={col}
            onOpenDataSourceModal={onOpenDataSourceModal}
          />
        ))}
      </div>
    </div>
  );
};
