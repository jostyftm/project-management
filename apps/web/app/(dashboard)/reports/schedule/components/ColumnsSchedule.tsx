"use client";
import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ReportSchedule } from "@/types/schedule-type";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import BaseIcon from "@/components/ui/base-icon";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";

export interface ScheduleActionCallbacks {
  onEdit: (schedule: ReportSchedule) => void;
  onDelete: (schedule: ReportSchedule) => void;
  onRun: (schedule: ReportSchedule) => void;
  onClone: (schedule: ReportSchedule) => void;
  isRunningId?: string | number | null;
}

const StatusBadge = ({ status }: { status: ReportSchedule["attributes"]["status"] }) => {
  const isActive = status === "active";
  return (
    <Badge
      className={
        isActive
          ? "bg-green-100 text-green-800"
          : "bg-gray-200 text-gray-600"
      }
    >
      <BaseIcon name={isActive ? "CircleCheck" : "Circle"} size={13} />
      {isActive ? "Activo" : "Inactivo"}
    </Badge>
  );
};

export const ColumnsSchedule = ({
  onEdit,
  onDelete,
  onRun,
  onClone,
  isRunningId,
}: ScheduleActionCallbacks): ColumnDef<ReportSchedule>[] => [
  {
    id: "select",
    header: ({ table }) => (
      <Checkbox
        checked={
          table.getIsAllPageRowsSelected() ||
          (table.getIsSomePageRowsSelected() && "indeterminate")
        }
        onCheckedChange={(value) => table.toggleAllPageRowsSelected(!!value)}
        aria-label="Seleccionar todos"
        className="translate-y-[2px]"
      />
    ),
    cell: ({ row }) => (
      <Checkbox
        checked={row.getIsSelected()}
        onCheckedChange={(value) => row.toggleSelected(!!value)}
        aria-label="Seleccionar fila"
        className="translate-y-[2px]"
      />
    ),
    enableSorting: false,
    enableHiding: false,
  },
  {
    accessorKey: "relationships.report.name",
    header: "Reporte",
    cell: ({ row }) => (
      <span className="font-medium">
        {row.original.relationships.report?.attributes.name ?? "—"}
      </span>
    ),
  },
  {
    accessorKey: "relationships.format",
    header: "Formato",
    cell: ({ row }) => {
      const format = row.original.relationships.format;
      const code = format?.code?.toLowerCase() || "";
      const iconName =
        code.includes("csv") || code.includes("xlsx")
          ? "FileSpreadsheet"
          : code.includes("pdf")
          ? "FileType"
          : "FileText";

      return format ? (
        <div className="flex flex-col gap-1 items-start">
          <Badge variant="outline" className="gap-1.5">
            <BaseIcon name={iconName as never} size={13} />
            {format.name}
          </Badge>
          {row.original.relationships.document_template && (
            <Badge variant="secondary" className="text-[10px] bg-purple-50 text-purple-700 border-purple-200">
              {row.original.relationships.document_template.name}
            </Badge>
          )}
        </div>
      ) : (
        <span className="text-muted-foreground">—</span>
      );
    },
  },
  {
    accessorKey: "attributes.cron_expression",
    header: "Cron",
    cell: ({ row }) => (
      <Badge className="font-mono text-[11px]">
        {row.original.attributes.cron_expression}
      </Badge>
    ),
  },
  {
    accessorKey: "attributes.include_headers",
    header: "Salida",
    cell: ({ row }) => {
      const attrs = row.original.attributes;
      const format = row.original.relationships.format;
      const isTxt = format?.code?.toLowerCase() === "txt";
      const delimiterLabel =
        attrs.delimiter === "\t" ? "Tab" : attrs.delimiter || "—";
      return (
        <div className="flex flex-wrap gap-1">
          <Badge variant="outline" className="text-[11px]">
            {attrs.include_headers ? "Encabezados" : "Sin encabez"}
          </Badge>
          {isTxt && (
            <Badge variant="outline" className="text-[11px]">
              Sep: {delimiterLabel}
            </Badge>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "attributes.status",
    header: "Estado",
    cell: ({ row }) => <StatusBadge status={row.original.attributes.status} />,
  },
  {
    accessorKey: "relationships.destinations",
    header: "Destinos",
    cell: ({ row }) => {
      const dests = row.original.relationships.destinations ?? [];
      if (dests.length === 0)
        return <span className="text-muted-foreground">—</span>;
      return (
        <div className="flex flex-wrap gap-1">
          {dests.map((d, i) => (
            <Badge key={i} variant="outline" className="text-[11px]">
              {d.type?.toUpperCase()}
            </Badge>
          ))}
        </div>
      );
    },
  },
  {
    id: "actions",
    header: "Acciones",
    cell: ({ row }) => {
      const schedule = row.original;
      return (
        <div className="flex items-center gap-1">
          <PermissionGuard action="update">
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 cursor-pointer"
              title="Editar"
              onClick={() => onEdit(schedule)}
            >
              <BaseIcon name="Pencil" size={16} />
            </button>
          </PermissionGuard>

          <PermissionGuard action="create">
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-purple-600 cursor-pointer"
              title="Duplicar programación"
              onClick={() => onClone(schedule)}
            >
              <BaseIcon name="Copy" size={16} />
            </button>
          </PermissionGuard>

          <PermissionGuard action="execute">
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-green-600 cursor-pointer"
              title="Probar ejecución"
              disabled={isRunningId !== undefined && isRunningId !== null && isRunningId === schedule.id}
              onClick={() => onRun(schedule)}
            >
              {isRunningId !== undefined && isRunningId !== null && isRunningId === schedule.id ? (
                <BaseIcon name="Loader" size={16} className="animate-spin" />
              ) : (
                <BaseIcon name="Play" size={16} />
              )}
            </button>
          </PermissionGuard>

          <PermissionGuard action="delete">
            <button
              type="button"
              className="p-2 rounded-md text-gray-500 hover:bg-gray-100 hover:text-red-600 cursor-pointer"
              title="Eliminar"
              onClick={() => onDelete(schedule)}
            >
              <BaseIcon name="Trash2" size={16} />
            </button>
          </PermissionGuard>
        </div>
      );
    },
  },
];
