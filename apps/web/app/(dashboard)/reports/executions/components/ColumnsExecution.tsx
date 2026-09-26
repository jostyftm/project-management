"use client";
import React from "react";
import { ColumnDef } from "@tanstack/react-table";
import { ReportExecution, TriggerType } from "@/types/execution-type";
import { Badge } from "@/components/ui/badge";
import BaseIcon from "@/components/ui/base-icon";
import { formatDate } from "@/lib/utils";
import ExecutionStatusBadge from "./ExecutionStatusBadge";
import { useDownloadFile } from "@/hooks/use-download-file";
import { API_URL } from "@/config/enviroments";

import PermissionGuard from "@/components/common/permision-guard/permission-guard";

interface Props {
  onViewError?: (execution: ReportExecution) => void;
}

const formatDuration = (seconds: number | null): string => {
  if (seconds === null || seconds === undefined) return "—";
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return s > 0 ? `${m}m ${s}s` : `${m}m`;
};

const formatFileSize = (bytes: number | null): string => {
  if (bytes === null || bytes === undefined) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
};

const formatRowCount = (count: number | null): string => {
  if (count === null || count === undefined) return "—";
  return new Intl.NumberFormat("es-MX").format(count);
};

const TriggerBadge = ({ type }: { type: TriggerType }) => (
  <Badge
    variant="outline"
    className={
      type === "manual"
        ? "bg-blue-50 text-blue-700 border-blue-200"
        : "bg-gray-50 text-gray-600 border-gray-200"
    }
  >
    <BaseIcon name={type === "manual" ? "Zap" : "Clock"} size={12} className="mr-1" />
    {type === "manual" ? "Manual" : "Programado"}
  </Badge>
);

const ParamsCell = ({ execution }: { execution: ReportExecution }) => {
  const params = execution.attributes.params_used;
  const entries = params
    ? Object.entries(params).filter(([, v]) => v !== null && v !== undefined)
    : [];

  if (entries.length === 0) return <span className="text-muted-foreground">—</span>;

  return (
    <div className="flex flex-wrap gap-1">
      {entries.slice(0, 3).map(([key, value]) => (
        <Badge key={key} variant="outline" className="font-mono text-[11px]">
          <span className="text-gray-500">{key}:</span>{" "}
          <span className="font-medium">{String(value)}</span>
        </Badge>
      ))}
      {entries.length > 3 && (
        <Badge variant="secondary" className="text-[11px]">
          +{entries.length - 3}
        </Badge>
      )}
    </div>
  );
};

const ActionsCell = ({
  exec,
  onViewError,
}: {
  exec: ReportExecution;
  onViewError?: (execution: ReportExecution) => void;
}) => {
  const { downloadFile, isLoading } = useDownloadFile();

  const reportEndpoint = API_URL("report", "v1");
  const downloadUrl =
    exec.attributes.status === "success"
      ? `${reportEndpoint}/report-executions/${exec.id}/download`
      : null;

  const hasLog =
    exec.attributes.error_log !== null &&
    exec.attributes.error_log !== undefined &&
    exec.attributes.error_log.trim() !== "";
  const hasFile = Boolean(downloadUrl);
  const filename = downloadUrl
    ? downloadUrl.split("/").pop() ?? "reporte"
    : "reporte";

  return (
    <div className="flex items-center justify-end gap-1">
      {hasLog && (
        <button
          type="button"
          onClick={() => onViewError?.(exec)}
          className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:bg-blue-50 hover:text-blue-600"
          title="Ver log"
        >
          <BaseIcon name="Eye" size={16} />
        </button>
      )}
      {hasFile && (
        <PermissionGuard action="view">
          <button
            type="button"
            disabled={isLoading}
            onClick={() =>
              downloadFile({
                url: downloadUrl as string,
                customFilename: filename,
              })
            }
            className="inline-flex items-center justify-center h-8 w-8 rounded-md text-gray-500 hover:bg-gray-100 hover:text-blue-600 disabled:opacity-50 disabled:cursor-not-allowed"
            title="Descargar archivo"
          >
            <BaseIcon name={isLoading ? "Loader2" : "Download"} size={16} className={isLoading ? "animate-spin" : ""} />
          </button>
        </PermissionGuard>
      )}
    </div>
  );
};

export const ColumnsExecution = ({
  onViewError,
}: Props): ColumnDef<ReportExecution>[] => [
  {
    accessorKey: "relationships.schedule.report",
    header: "Reporte",
    cell: ({ row }) => (
      <div>
        <span className="font-medium">
          {row.original.relationships.schedule?.report ?? "—"}
        </span>
        {row.original.relationships.schedule && (
          <span className="block text-[11px] text-muted-foreground">
            Programación #{row.original.relationships.schedule.id}
          </span>
        )}
      </div>
    ),
  },
  {
    accessorKey: "attributes.started_at",
    header: "Fecha",
    cell: ({ row }) => {
      const started = row.original.attributes.started_at;
      const duration = row.original.attributes.duration;
      return (
        <div>
          <span>{started ? formatDate(started, "dd/MM/yyyy HH:mm") : "—"}</span>
          {duration !== null && (
            <span className="block text-[11px] text-muted-foreground">
              {formatDuration(duration)}
            </span>
          )}
        </div>
      );
    },
  },
  {
    accessorKey: "attributes.row_count",
    header: "Filas",
    cell: ({ row }) => (
      <span className="tabular-nums">{formatRowCount(row.original.attributes.row_count)}</span>
    ),
  },
  {
    accessorKey: "attributes.file_size",
    header: "Tamaño",
    cell: ({ row }) => (
      <span className="tabular-nums text-[13px]">{formatFileSize(row.original.attributes.file_size)}</span>
    ),
  },
  {
    accessorKey: "attributes.params_used",
    header: "Parámetros",
    cell: ({ row }) => <ParamsCell execution={row.original} />,
  },
  {
    accessorKey: "attributes.trigger_type",
    header: "Tipo",
    cell: ({ row }) => <TriggerBadge type={row.original.attributes.trigger_type} />,
  },
  {
    accessorKey: "attributes.status",
    header: "Estado",
    cell: ({ row }) => (
      <ExecutionStatusBadge status={row.original.attributes.status} />
    ),
  },
  {
    id: "actions",
    header: "",
    cell: ({ row }) => (
      <ActionsCell exec={row.original} onViewError={onViewError} />
    ),
  },
];
