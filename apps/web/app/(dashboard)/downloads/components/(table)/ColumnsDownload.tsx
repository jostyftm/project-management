"use client";
import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { Badge } from "@/components/ui/badge";
import { DownloadType } from "../../types/download-types";
import { ActionsDownload } from "./ActionsDownload";
import { cn } from "@/lib/utils";
import { FileSpreadsheet, FileText, FileCode, File, Clock, CheckCircle2, XCircle, AlertCircle } from "lucide-react";

const getFileIcon = (fileType: string) => {
  const ext = fileType?.toLowerCase();
  switch (ext) {
    case "xlsx":
    case "csv":
      return <FileSpreadsheet className="w-4 h-4 text-emerald-600" />;
    case "pdf":
      return <FileText className="w-4 h-4 text-rose-600" />;
    case "docx":
      return <FileText className="w-4 h-4 text-blue-600" />;
    case "txt":
      return <FileCode className="w-4 h-4 text-amber-600" />;
    default:
      return <File className="w-4 h-4 text-slate-500" />;
  }
};

const renderStatusBadge = (statusCode: string | number, displayName: string) => {
  const code = String(statusCode);
  switch (code) {
    case "2": // Completado
      return (
        <Badge
          variant="outline"
          className="bg-emerald-50 text-emerald-700 border-emerald-200 gap-1.5 py-1 px-2.5 font-medium"
        >
          <CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />
          <span>{displayName || "Completado"}</span>
        </Badge>
      );
    case "0": // Procesando
      return (
        <Badge
          variant="outline"
          className="bg-blue-50 text-blue-700 border-blue-200 gap-1.5 py-1 px-2.5 font-medium animate-pulse"
        >
          <Clock className="w-3.5 h-3.5 text-blue-600 animate-spin" />
          <span>{displayName || "Procesando"}</span>
        </Badge>
      );
    case "3": // Fallida
      return (
        <Badge
          variant="outline"
          className="bg-red-50 text-red-700 border-red-200 gap-1.5 py-1 px-2.5 font-medium cursor-help"
          title="La generación no pudo completarse. Revisa el historial de ejecuciones en Reportes > Ejecuciones o intenta exportar en formato Excel/CSV."
        >
          <XCircle className="w-3.5 h-3.5 text-red-600" />
          <span>{displayName || "Fallida"}</span>
        </Badge>
      );
    default: // Pendiente u otro
      return (
        <Badge
          variant="outline"
          className="bg-amber-50 text-amber-700 border-amber-200 gap-1.5 py-1 px-2.5 font-medium"
        >
          <AlertCircle className="w-3.5 h-3.5 text-amber-600" />
          <span>{displayName || "Pendiente"}</span>
        </Badge>
      );
  }
};

export const ColumnsDownload = (): ColumnDef<DownloadType>[] => [
  {
    accessorKey: "attributes.file_name",
    header: () => <span className="font-semibold text-xs uppercase">Archivo</span>,
    cell: ({ row }) => {
      const { file_name, file_type } = row.original.attributes;
      return (
        <div className="flex items-center gap-2.5 min-w-[200px]">
          <div className="p-2 rounded-lg bg-slate-100 border border-slate-200/60 shrink-0">
            {getFileIcon(file_type)}
          </div>
          <div className="flex flex-col">
            <span className="font-medium text-sm text-slate-800 break-all leading-tight">
              {file_name}
            </span>
          </div>
        </div>
      );
    },
  },
  {
    accessorKey: "attributes.status",
    header: () => <span className="font-semibold text-xs uppercase">Estado</span>,
    cell: ({ row }) => {
      const { status_code, status_display_name } = row.original.attributes;
      return renderStatusBadge(status_code, status_display_name);
    },
  },
  {
    accessorKey: "attributes.file_type",
    header: () => <span className="font-semibold text-xs uppercase">Formato</span>,
    cell: ({ row }) => {
      const { file_type } = row.original.attributes;
      return (
        <Badge variant="secondary" className="uppercase font-mono text-[11px] tracking-wider px-2 py-0.5">
          {file_type}
        </Badge>
      );
    },
  },
  {
    accessorKey: "attributes.created_at",
    header: () => <span className="font-semibold text-xs uppercase">Fecha de Solicitud</span>,
    cell: ({ row }) => {
      const { created_at } = row.original.attributes;
      return (
        <div className="text-xs text-muted-foreground whitespace-nowrap">
          {created_at}
        </div>
      );
    },
  },
  {
    id: "actions",
    enableHiding: false,
    cell: ({ row }) => <ActionsDownload row={row.original} />,
  },
];
