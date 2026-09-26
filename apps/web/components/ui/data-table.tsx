"use client";

import {
  ColumnDef,
  flexRender,
  getCoreRowModel,
  useReactTable,
  getPaginationRowModel,
  RowSelectionState,
} from "@tanstack/react-table";

import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Skeleton } from "./skeleton";
import { useCallback, useEffect, useMemo, useState } from "react";
import { MetaPaginateType } from "@/types/paginate";
import PaginationButtons from "./pagination-buttons";

type WithRowIndex<T> = T & { rowIndex: number };
interface DataTableProps<TData, TValue> {
  columns: ColumnDef<TData, TValue>[];
  data: TData[];
  defaultPageSize?: number;
  isLoading?: boolean;
  pagination?: boolean;
  metaPagination?: Partial<MetaPaginateType>;
  onPressPage?: (page: number) => void;
  onSelectRows?: (rows: WithRowIndex<TData>[]) => void;
  highlightedRowIndexes?: number[];
}

export function DataTable<TData, TValue>({
  columns,
  data,
  defaultPageSize = 10,
  isLoading,
  pagination = true,
  metaPagination,
  onPressPage,
  onSelectRows,
  highlightedRowIndexes = [],
}: DataTableProps<TData, TValue>) {
  const [rowSelection, setRowSelection] = useState<RowSelectionState>({});
  const table = useReactTable({
    data,
    columns,
    getCoreRowModel: getCoreRowModel(),
    getPaginationRowModel: getPaginationRowModel(),
    onRowSelectionChange: setRowSelection,
    state: {
      rowSelection,
    },
    initialState: {
      pagination: { pageSize: defaultPageSize },
    },
  });

  // Memoriza las filas seleccionadas (filas completas)
  const selectedRows = useMemo(() => {
    return table
      .getSelectedRowModel()
      .rows.map((row) => ({ ...row.original, rowIndex: row.index }));
  }, [rowSelection]);

  // Callback al cambiar la selección
  useEffect(() => {
    if (onSelectRows) {
      onSelectRows(selectedRows);
    }
  }, [selectedRows]);

  const renderSkeleton = useCallback(() => {
    return Array.from({ length: defaultPageSize }).map((_, r) => (
      <TableRow key={`${r}`}>
        {Array.from({ length: columns.length }).map((_, c) => (
          <TableCell key={`${c}${r}`} className="min-w-[80px]">
            <Skeleton className=" rounded-sm h-[40px] bg-gray-300" />
          </TableCell>
        ))}
      </TableRow>
    ));
  }, [columns.length, defaultPageSize]);

  return (
    <div>
      <div className="rounded-md border">
        <Table>
          <TableHeader>
            {table.getHeaderGroups().map((headerGroup) => (
              <TableRow key={headerGroup.id}>
                {headerGroup.headers.map((header) => {
                  return (
                    <TableHead
                      key={header.id}
                      className={cn("bg-slate-100 font-bold text-gray-600")}
                    >
                      {header.isPlaceholder
                        ? null
                        : flexRender(
                            header.column.columnDef.header,
                            header.getContext()
                          )}
                    </TableHead>
                  );
                })}
              </TableRow>
            ))}
          </TableHeader>
          <TableBody>
            {isLoading ? (
              renderSkeleton()
            ) : table.getRowModel().rows?.length ? (
              table.getRowModel().rows.map((row) => {
                const highlightedRow = highlightedRowIndexes
                  ? highlightedRowIndexes.includes(row.index)
                  : false;
                return (
                  <TableRow
                    key={row.id}
                    data-state={
                      row.getIsSelected() && !highlightedRow && "selected"
                    }
                    className={cn(
                      "tespace-nowrap ",
                      highlightedRow && "bg-red-50  hover:bg-red-100 "
                    )}
                  >
                    {row.getVisibleCells().map((cell) => (
                      <TableCell key={cell.id}>
                        {flexRender(
                          cell.column.columnDef.cell,
                          cell.getContext()
                        )}
                      </TableCell>
                    ))}
                  </TableRow>
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={columns.length}
                  className="h-24 text-center"
                >
                  Sin resultados.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>
      {pagination && !metaPagination && (
        <div className="flex items-center justify-end space-x-2 py-4">
          <Button
            variant="outline"
            size="sm"
            onClick={() => table.previousPage()}
            disabled={!table.getCanPreviousPage() || isLoading}
          >
            Anterior
          </Button>
          <Button
            variant="default"
            size="sm"
            onClick={() => table.nextPage()}
            disabled={!table.getCanNextPage() || isLoading}
          >
            Siguiente
          </Button>
        </div>
      )}

      {pagination && metaPagination && (
        <PaginationButtons meta={metaPagination} onPressPage={onPressPage} />
      )}
    </div>
  );
}
