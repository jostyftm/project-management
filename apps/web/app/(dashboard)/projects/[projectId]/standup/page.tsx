"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { projectService } from "@/services/plane/projectService";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { DailyStandupView } from "@/components/plane/agile/DailyStandupView";
import { Project } from "@/types/plane-types";
import { Users2 } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function DailyStandupPage() {
  const params = useParams();
  const projectId = String(params.projectId);
  const [project, setProject] = useState<Project | null>(null);

  useDocumentTitle(`${project?.name || "Proyecto"} - Daily Standup`);

  useEffect(() => {
    projectService.get(projectId).then(setProject).catch(console.error);
  }, [projectId]);

  return (
    <div className="flex-1 space-y-6 p-4 md:p-8 pt-6 w-full min-w-0">
      {/* Breadcrumb & Header */}
      <div className="pb-2 border-b border-slate-200">
        <ProjectBreadcrumb
          projectId={projectId}
          projectName={project?.name}
          sectionTitle="Daily Standup"
        />
        <div className="flex items-center gap-2 mt-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users2 className="size-6 text-indigo-600" />
            Daily Standup Ágil
          </h1>
        </div>
      </div>

      {/* Vista principal de Standup */}
      <DailyStandupView projectId={projectId} />
    </div>
  );
}
