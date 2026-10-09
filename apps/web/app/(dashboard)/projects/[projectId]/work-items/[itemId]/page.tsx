"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { Project, State, WorkItem } from "@/types/plane-types";
import { WorkItemDetailSheet } from "@/components/plane/WorkItemDetailSheet";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { Loader2 } from "lucide-react";

export default function WorkItemDetailPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = params?.projectId as string;
  const itemId = params?.itemId as string;

  const [project, setProject] = useState<Project | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      try {
        setIsLoading(true);
        const [projData, statesData, itemsData] = await Promise.all([
          projectService.get(projectId),
          projectService.listStates(projectId),
          workItemService.list(projectId),
        ]);
        setProject(projData);
        setStates(statesData);
        setWorkItems(itemsData);
      } catch (err) {
        console.error("Error loading project context for work item", err);
      } finally {
        setIsLoading(false);
      }
    }

    loadData();
  }, [projectId]);
  const currentItem = workItems.find((w) => String(w.id) === String(itemId));

  useDocumentTitle(
    currentItem
      ? `${currentItem.identifier}: ${currentItem.title}`
      : `Work Item #${itemId} - ${project?.name || "Proyecto"}`
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[60vh]">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500">Cargando elemento de trabajo...</p>
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
          itemIdentifier={currentItem?.identifier || `#${itemId}`}
          itemTitle={currentItem?.title}
          backHref={`/projects/${projectId}/work-items`}
          backLabel="Volver a Work Items"
          useHistoryBack={true}
        />
      </div>

      {/* Full Page View of Work Item */}
      <WorkItemDetailSheet
        workItemId={itemId}
        project={project}
        states={states}
        availableItems={workItems}
        open={true}
        viewMode="page"
        onUpdated={() => {
          // Re-fetch items in background
          if (projectId) {
            workItemService.list(projectId).then(setWorkItems).catch(() => {});
          }
        }}
      />
    </div>
  );
}
