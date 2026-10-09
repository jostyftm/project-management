"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import { Project, State, WorkItem, WorkItemType } from "@/types/plane-types";
import { WorkItemCreateModal } from "@/components/plane/work-items/WorkItemCreateModal";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Loader2 } from "lucide-react";

export default function WorkItemCreatePage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [projects, setProjects] = useState<Project[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [types, setTypes] = useState<WorkItemType[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useDocumentTitle(`Nuevo Work Item - ${project?.name || "Proyecto"}`);

  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      try {
        setIsLoading(true);
        const [projData, allProjects, statesData, typesData, itemsData] = await Promise.all([
          projectService.get(projectId),
          projectService.list(),
          projectService.listStates(projectId),
          workItemTypeService.list(projectId),
          workItemService.list(projectId),
        ]);
        setProject(projData);
        setProjects(allProjects);
        setStates(statesData);
        setTypes(typesData);
        setWorkItems(itemsData);
      } catch (err) {
        console.error("Error loading project context for work item creation", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando formulario de creación...</p>
      </div>
    );
  }

  return (
    <div className="w-full space-y-4">
      {/* Top Navigation & Breadcrumbs Bar */}
      <div className="w-full flex items-center justify-between gap-4">
        <ProjectBreadcrumb
          projectId={projectId}
          projectName={project?.name || "Proyecto"}
          sectionTitle="Work Items"
          sectionHref={`/projects/${projectId}/work-items`}
          itemTitle="Nuevo elemento"
          backHref={`/projects/${projectId}/work-items`}
          backLabel="Volver a Work Items"
          useHistoryBack={true}
        />
      </div>

      {/* Full Page View of Work Item Creation */}
      <WorkItemCreateModal
        open={true}
        project={project}
        projects={projects}
        states={states}
        types={types}
        availableItems={workItems}
        viewMode="page"
        onCreated={() => {
          router.push(`/projects/${projectId}/work-items`);
        }}
      />
    </div>
  );
}
