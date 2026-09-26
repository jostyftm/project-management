"use client";
import React from "react";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { ExecutionStatus } from "@/types/execution-type";
import BaseIcon from "@/components/ui/base-icon";

const statusConfig: Record<
  ExecutionStatus,
  { style: string; label: string; icon: string }
> = {
  success: {
    style: "bg-green-100 text-green-800",
    label: "Exitoso",
    icon: "CircleCheck",
  },
  processing: {
    style: "bg-yellow-100 text-yellow-800",
    label: "Procesando",
    icon: "Loader",
  },
  failed: {
    style: "bg-red-100 text-red-800",
    label: "Fallido",
    icon: "CircleX",
  },
  skipped: {
    style: "bg-slate-100 text-slate-800 border border-slate-300 dark:bg-slate-800 dark:text-slate-300",
    label: "Omitido",
    icon: "ShieldAlert",
  },
};

interface Props {
  status: ExecutionStatus;
  onViewError?: () => void;
}

const ExecutionStatusBadge = ({ status, onViewError }: Props) => {
  const config = statusConfig[status] ?? {
    style: "bg-gray-100 text-gray-800",
    label: status,
    icon: "CircleAlert",
  };

  const canViewLog = (status === "failed" || status === "skipped") && Boolean(onViewError);

  return (
    <Badge
      onClick={canViewLog ? onViewError : undefined}
      className={cn(
        "gap-1.5",
        config.style,
        canViewLog
          ? "cursor-pointer hover:opacity-80 transition-opacity"
          : "cursor-default"
      )}
    >
      <BaseIcon
        name={config.icon as never}
        size={13}
        className={status === "processing" ? "animate-spin" : ""}
      />
      {config.label}
    </Badge>
  );
};

export default ExecutionStatusBadge;
