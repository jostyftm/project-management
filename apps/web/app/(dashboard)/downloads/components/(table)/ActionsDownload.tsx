"use client";
import React from "react";
import { DownloadType } from "../../types/download-types";
import { useDownloadActions } from "../../hooks/use-download-actions";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Download, Loader2, MoreVertical, Trash2 } from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";

interface ActionsDownloadProps {
  row: DownloadType;
}

export const ActionsDownload: React.FC<ActionsDownloadProps> = ({ row }) => {
  const { handleDownload, handleDelete, isDownloading, isDeleting } =
    useDownloadActions();
  const statusCode = String(row.attributes.status_code);
  const isCompleted = statusCode === "2";
  const isProcessing = statusCode === "0";

  return (
    <div className="flex items-center justify-end gap-1">
      {isCompleted && (
        <PermissionGuard action="view">
          <Button
            variant="ghost"
            size="sm"
            className="h-8 gap-1.5 text-primary hover:text-primary hover:bg-primary/10 cursor-pointer font-medium"
            onClick={() => handleDownload(row)}
            disabled={isDownloading}
            title="Descargar archivo"
          >
            {isDownloading ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <Download className="w-4 h-4" />
            )}
            <span className="hidden sm:inline">Descargar</span>
          </Button>
        </PermissionGuard>
      )}

      {isProcessing && (
        <span className="text-xs text-muted-foreground italic flex items-center gap-1">
          <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-500" />
          <span className="hidden sm:inline">Generando</span>
        </span>
      )}

      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="ghost" size="icon" className="h-8 w-8 p-0 cursor-pointer">
            <MoreVertical className="h-4 w-4" />
            <span className="sr-only">Menú</span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          {isCompleted && (
            <PermissionGuard action="view">
              <DropdownMenuItem
                onClick={() => handleDownload(row)}
                className="gap-2 cursor-pointer"
              >
                <Download className="h-4 w-4 text-emerald-600" />
                <span>Descargar</span>
              </DropdownMenuItem>
            </PermissionGuard>
          )}
          <PermissionGuard action="delete">
            <DropdownMenuItem
              onClick={() => handleDelete(row.id)}
              disabled={isDeleting}
              className="gap-2 text-destructive focus:text-destructive cursor-pointer"
            >
              <Trash2 className="h-4 w-4" />
              <span>Eliminar</span>
            </DropdownMenuItem>
          </PermissionGuard>
        </DropdownMenuContent>
      </DropdownMenu>
    </div>
  );
};
