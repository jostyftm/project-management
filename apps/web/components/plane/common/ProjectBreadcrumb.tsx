"use client";

import React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronRight, ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";

export interface ProjectBreadcrumbProps {
  projectId: string | number;
  projectName?: string;
  sectionTitle?: string;
  sectionHref?: string;
  itemIdentifier?: string;
  itemTitle?: string;
  backHref?: string;
  backLabel?: string;
  useHistoryBack?: boolean;
}

export function ProjectBreadcrumb({
  projectId,
  projectName = "Proyecto",
  sectionTitle,
  sectionHref,
  itemIdentifier,
  itemTitle,
  backHref,
  backLabel,
  useHistoryBack = false,
}: ProjectBreadcrumbProps) {
  const router = useRouter();

  const handleBack = () => {
    if (useHistoryBack && window.history.length > 1) {
      router.back();
    } else if (backHref) {
      router.push(backHref);
    } else if (sectionHref) {
      router.push(sectionHref);
    } else {
      router.push(`/projects/${projectId}`);
    }
  };

  return (
    <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400 flex-wrap">
      {(backHref || backLabel || useHistoryBack) && (
        <>
          <Button
            variant="ghost"
            size="sm"
            onClick={handleBack}
            className="h-7 px-2 gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>{backLabel || "Volver"}</span>
          </Button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
        </>
      )}

      {/* Root: Proyectos */}
      <Link
        href="/projects"
        className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
      >
        Proyectos
      </Link>
      <ChevronRight className="size-3 text-slate-300 dark:text-slate-700 shrink-0" />

      {/* Level 1: Project Overview */}
      {sectionTitle || itemTitle || itemIdentifier ? (
        <Link
          href={`/projects/${projectId}`}
          className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors font-medium max-w-[200px] truncate"
          title={projectName}
        >
          {projectName}
        </Link>
      ) : (
        <span className="font-semibold text-slate-800 dark:text-slate-200 max-w-[200px] truncate">
          {projectName}
        </span>
      )}

      {/* Level 2: Section (e.g. Work Items, Cycles, Modules) */}
      {sectionTitle && (
        <>
          <ChevronRight className="size-3 text-slate-300 dark:text-slate-700 shrink-0" />
          {sectionHref && (itemTitle || itemIdentifier) ? (
            <Link
              href={sectionHref}
              className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors"
            >
              {sectionTitle}
            </Link>
          ) : (
            <span className="font-semibold text-slate-800 dark:text-slate-200">
              {sectionTitle}
            </span>
          )}
        </>
      )}

      {/* Level 3: Item Identifier / Title */}
      {(itemIdentifier || itemTitle) && (
        <>
          <ChevronRight className="size-3 text-slate-300 dark:text-slate-700 shrink-0" />
          <div className="flex items-center gap-1.5">
            {itemIdentifier && (
              <span className="font-semibold text-slate-800 dark:text-slate-200 font-mono">
                {itemIdentifier}
              </span>
            )}
            {itemTitle && (
              <span className="text-slate-700 dark:text-slate-300 max-w-xs truncate hidden sm:inline" title={itemTitle}>
                {itemTitle}
              </span>
            )}
          </div>
        </>
      )}
    </div>
  );
}
