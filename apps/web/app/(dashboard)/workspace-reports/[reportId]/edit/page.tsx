"use client";

import React, { useEffect, useState, use } from "react";
import { notFound } from "next/navigation";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import { WorkspaceReport } from "@/types/workspace-report-types";
import { ReportEditor } from "@/components/plane/workspace-reports/editor/ReportEditor";
import { Loader2 } from "lucide-react";

export default function ReportEditPage({
  params,
}: {
  params: Promise<{ reportId: string }>;
}) {
  const resolvedParams = use(params);
  const { currentWorkspace } = useWorkspaceStore();
  const [report, setReport] = useState<WorkspaceReport | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<boolean>(false);

  useEffect(() => {
    if (!currentWorkspace?.id || !resolvedParams.reportId) return;

    let isMounted = true;
    setIsLoading(true);

    workspaceReportService
      .get(currentWorkspace.id, resolvedParams.reportId)
      .then((data) => {
        if (isMounted) setReport(data);
      })
      .catch((err) => {
        console.error(err);
        if (isMounted) setError(true);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [currentWorkspace?.id, resolvedParams.reportId]);

  if (error) {
    notFound();
  }

  if (isLoading || !report || !currentWorkspace) {
    return (
      <div className="flex-1 flex flex-col items-center justify-center h-full text-neutral-400 bg-neutral-100 dark:bg-neutral-950">
        <Loader2 className="w-8 h-8 animate-spin mb-3 text-indigo-600" />
        <span className="text-xs font-medium">Cargando editor de reporte...</span>
      </div>
    );
  }

  return (
    <ReportEditor initialReport={report} workspaceId={currentWorkspace.id} />
  );
}
