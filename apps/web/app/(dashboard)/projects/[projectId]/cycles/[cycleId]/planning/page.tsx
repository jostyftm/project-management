"use client";

import React, { useState, useEffect } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { projectService } from "@/services/plane/projectService";
import { cycleService } from "@/services/plane/cycleService";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { SprintPlanningView } from "@/components/plane/agile/SprintPlanningView";
import { Project, Cycle } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { ArrowLeft, Target, Calendar } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function CyclePlanningPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params.projectId);
  const cycleId = String(params.cycleId);

  const [project, setProject] = useState<Project | null>(null);
  const [cycle, setCycle] = useState<Cycle | null>(null);

  useDocumentTitle(`${cycle?.name || "Sprint"} - Planificación Ágil`);

  useEffect(() => {
    projectService.get(projectId).then(setProject).catch(console.error);
    cycleService.get(cycleId).then(setCycle).catch(console.error);
  }, [projectId, cycleId]);

  return (
    <div className="flex-1 w-full min-w-0 p-4 md:p-8 pt-6">
      {/* Breadcrumb & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-2 border-b border-slate-200">
        <div>
          <ProjectBreadcrumb
            projectId={projectId}
            projectName={project?.name}
            sectionTitle="Ciclos"
            sectionHref={`/projects/${projectId}/cycles`}
            itemTitle={cycle?.name ? `${cycle.name} - Planificación` : "Planificación"}
          />
          <div className="flex items-center gap-2 mt-1">
            <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
              <Target className="size-6 text-indigo-600" />
              Planificación del Sprint: {cycle?.name}
            </h1>
          </div>
        </div>

        <div className="flex items-center gap-2">
          <Link href={`/projects/${projectId}/cycles/${cycleId}`}>
            <Button variant="outline" size="sm" className="text-xs">
              <ArrowLeft className="size-3.5 mr-1" />
              Ver Tablero del Ciclo
            </Button>
          </Link>
        </div>
      </div>

      {/* Vista de Planificación */}
      <SprintPlanningView
        projectId={projectId}
        cycleId={cycleId}
        isAdmin={project?.current_user_role === "ADMIN"}
      />
    </div>
  );
}
