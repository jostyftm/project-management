"use client";

import React from "react";
import Link from "next/link";
import { WorkspaceReport } from "@/types/workspace-report-types";
import {
  FileText,
  MoreVertical,
  Edit3,
  Copy,
  Trash2,
  ExternalLink,
  Lock,
  Globe,
  Users,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

interface ReportCardProps {
  report: WorkspaceReport;
  onDuplicate: (report: WorkspaceReport) => void;
  onDelete: (report: WorkspaceReport) => void;
}

export function ReportCard({ report, onDuplicate, onDelete }: ReportCardProps) {
  const visibilityBadge = () => {
    switch (report.visibility) {
      case "public":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-emerald-600 dark:text-emerald-400 bg-emerald-50 dark:bg-emerald-950/40 px-2 py-0.5 rounded-full">
            <Globe className="w-3 h-3" />
            Público
          </span>
        );
      case "workspace":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-blue-600 dark:text-blue-400 bg-blue-50 dark:bg-blue-950/40 px-2 py-0.5 rounded-full">
            <Users className="w-3 h-3" />
            Workspace
          </span>
        );
      case "private":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-purple-600 dark:text-purple-400 bg-purple-50 dark:bg-purple-950/40 px-2 py-0.5 rounded-full">
            <Lock className="w-3 h-3" />
            Privado
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-medium text-neutral-500 dark:text-neutral-400 bg-neutral-100 dark:bg-neutral-800 px-2 py-0.5 rounded-full">
            Borrador
          </span>
        );
    }
  };

  return (
    <div className="bg-white dark:bg-neutral-900 border border-neutral-200/90 dark:border-neutral-800 rounded-2xl p-5 shadow-xs hover:shadow-md transition-all duration-200 flex flex-col justify-between group">
      <div>
        <div className="flex items-start justify-between gap-2 mb-3">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center shrink-0">
              <FileText className="w-4 h-4" />
            </div>
            <div>
              <Link
                href={`/workspace-reports/${report.id}`}
                className="text-sm font-semibold text-neutral-900 dark:text-neutral-100 hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors line-clamp-1"
              >
                {report.title}
              </Link>
              <div className="flex items-center gap-2 mt-0.5">
                {visibilityBadge()}
                <span className="text-[11px] text-neutral-400">
                  {report.blocks_count ?? report.blocks?.length ?? 0} bloques
                </span>
              </div>
            </div>
          </div>

          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="p-1 rounded-lg text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
              >
                <MoreVertical className="w-4 h-4" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 text-xs">
              <DropdownMenuItem asChild>
                <Link
                  href={`/workspace-reports/${report.id}/edit`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <Edit3 className="w-3.5 h-3.5" />
                  Editar Reporte
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem asChild>
                <Link
                  href={`/workspace-reports/${report.id}`}
                  className="flex items-center gap-2 cursor-pointer"
                >
                  <ExternalLink className="w-3.5 h-3.5" />
                  Ver Reporte
                </Link>
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDuplicate(report)}
                className="flex items-center gap-2 cursor-pointer"
              >
                <Copy className="w-3.5 h-3.5" />
                Duplicar
              </DropdownMenuItem>
              <DropdownMenuItem
                onClick={() => onDelete(report)}
                className="flex items-center gap-2 text-rose-600 dark:text-rose-400 cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                Eliminar
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {report.description && (
          <p className="text-xs text-neutral-500 dark:text-neutral-400 line-clamp-2 leading-relaxed mb-4">
            {report.description}
          </p>
        )}
      </div>

      <div className="pt-3 border-t border-neutral-100 dark:border-neutral-800/80 flex items-center justify-between text-[11px] text-neutral-400">
        <span>Por {report.owner?.name || "Autor"}</span>
        <Link
          href={`/workspace-reports/${report.id}/edit`}
          className="font-medium text-indigo-600 dark:text-indigo-400 hover:underline flex items-center gap-1"
        >
          Editar <Edit3 className="w-3 h-3" />
        </Link>
      </div>
    </div>
  );
}
