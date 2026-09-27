"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import { Project, State, WorkItem, WorkItemType } from "@/types/plane-types";
import { WorkItemCreateModal } from "@/components/plane/work-items/WorkItemCreateModal";
import { Button } from "@/components/ui/button";
import { ArrowLeft, ChevronRight, Loader2 } from "lucide-react";

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
    <div className="min-h-screen bg-slate-50/50 dark:bg-slate-950 p-4 sm:p-6 lg:p-8 space-y-4">
      {/* Top Navigation & Breadcrumbs Bar */}
      <div className="max-w-4xl mx-auto flex items-center justify-between gap-4">
        <div className="flex items-center gap-2 text-xs sm:text-sm text-slate-500 dark:text-slate-400">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(`/projects/${projectId}`)}
            className="h-8 gap-1.5 text-xs text-slate-600 hover:text-slate-900 dark:text-slate-400 dark:hover:text-slate-100 cursor-pointer"
          >
            <ArrowLeft className="size-3.5" />
            <span>Volver al proyecto</span>
          </Button>
          <span className="text-slate-300 dark:text-slate-700">/</span>
          <Link
            href={`/projects/${projectId}`}
            className="hover:text-slate-800 dark:hover:text-slate-200 transition-colors font-medium"
          >
            {project?.name || "Proyecto"}
          </Link>
          <ChevronRight className="size-3 text-slate-300 dark:text-slate-700" />
          <span className="font-semibold text-slate-800 dark:text-slate-200">
            Nuevo elemento
          </span>
        </div>
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
          router.push(`/projects/${projectId}`);
        }}
      />
    </div>
  );
}
