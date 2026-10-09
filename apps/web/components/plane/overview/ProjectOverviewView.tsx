"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import { useParams } from "next/navigation";
import { Project, WorkItem, State, WorkItemType, Milestone, Cycle, Activity } from "@/types/plane-types";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { activityService } from "@/services/plane/activityService";
import { milestoneService } from "@/services/plane/milestoneService";
import { cycleService } from "@/services/plane/cycleService";
import { projectMemberService, ProjectMemberUser } from "@/services/plane/projectMemberService";
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import { calculateProjectHealth } from "@/lib/project-health";
import { WorkItemCreateModal } from "@/components/plane/work-items/WorkItemCreateModal";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { ProjectOverviewHeader } from "./ProjectOverviewHeader";
import { ProjectKpiRow } from "./ProjectKpiRow";
import { ProjectBurnupChart } from "./ProjectBurnupChart";
import { ProjectStateDonut } from "./ProjectStateDonut";
import { ProjectPriorityBar } from "./ProjectPriorityBar";
import { ProjectAttentionList } from "./ProjectAttentionList";
import { ProjectActivityFeed } from "./ProjectActivityFeed";
import { ProjectMilestonesWidget } from "./ProjectMilestonesWidget";
import { ProjectTeamWorkload } from "./ProjectTeamWorkload";
import { ProjectCurrentCycleWidget } from "./ProjectCurrentCycleWidget";
import { Button } from "@/components/ui/button";
import { Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";

export function ProjectOverviewView() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [types, setTypes] = useState<WorkItemType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useDocumentTitle(`${project?.name || "Proyecto"} - Overview`);

  // Floating Action Button create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const loadAllData = useCallback(async (silent = false) => {
    if (!projectId || projectId === "new") return;
    if (!silent) setIsLoading(true);

    try {
      const [
        projData,
        itemsData,
        actsData,
        milestonesData,
        cyclesData,
        membersData,
        statesData,
        typesData,
      ] = await Promise.all([
        projectService.get(projectId),
        workItemService.list(projectId),
        activityService.listByProject(projectId).catch(() => []),
        milestoneService.list(projectId).catch(() => []),
        cycleService.list(projectId).catch(() => []),
        projectMemberService.list(projectId).catch(() => ({ members: [], invitations: [] })),
        projectService.getStates(projectId).catch(() => []),
        workItemTypeService.list(projectId).catch(() => []),
      ]);

      setProject(projData);
      setWorkItems(itemsData);
      setActivities(actsData);
      setMilestones(milestonesData);
      setCycles(cyclesData);
      setMembers(membersData.members || []);
      setStates(statesData);
      setTypes(typesData);
    } catch (err: any) {
      console.error("Error al cargar datos del Overview:", err);
      if (!silent) {
        toast.error("Error al cargar los datos del proyecto");
      }
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const health = useMemo(
    () => calculateProjectHealth(project, workItems),
    [project, workItems]
  );

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] py-16">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-500">Cargando centro de mando del proyecto...</p>
      </div>
    );
  }

  if (!project) {
    return null;
  }

  return (
    <div className="w-full space-y-6 pb-20">
      <ProjectBreadcrumb
        projectId={projectId}
        projectName={project.name}
        sectionTitle="Overview"
      />

      {/* 1. Project Header */}
      <ProjectOverviewHeader
        project={project}
        health={health}
        members={members}
        onProjectUpdated={(upd) => setProject(upd)}
      />

      {/* 2. KPIs Row */}
      <ProjectKpiRow project={project} workItems={workItems} />

      {/* 3. Main Dashboard Grid (2/3 Left Column, 1/3 Right Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. Burn-up / Burn-down Chart */}
          <ProjectBurnupChart
            project={project}
            workItems={workItems}
            milestones={milestones}
          />

          {/* B & C: State Donut & Priority Bar side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProjectStateDonut workItems={workItems} projectId={projectId} />
            <ProjectPriorityBar workItems={workItems} projectId={projectId} />
          </div>

          {/* D. Requiere Atención Table */}
          <ProjectAttentionList workItems={workItems} projectId={projectId} />
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-4">
          {/* H. Current Cycle Card */}
          <ProjectCurrentCycleWidget cycles={cycles} projectId={projectId} />

          {/* F. Next Milestones */}
          <ProjectMilestonesWidget milestones={milestones} projectId={projectId} />

          {/* G. Team Workload */}
          <ProjectTeamWorkload members={members} workItems={workItems} />

          {/* E. Recent Activity Feed */}
          <ProjectActivityFeed activities={activities} projectId={projectId} />
        </div>
      </div>

      {/* 4. Floating Action Button (FAB) for Quick Work Item Creation */}
      <Button
        onClick={() => setCreateModalOpen(true)}
        className="fixed bottom-6 right-6 z-40 size-12 rounded-full bg-indigo-600 hover:bg-indigo-500 text-white shadow-lg p-0 flex items-center justify-center transition-transform hover:scale-105"
        title="Crear nuevo Work Item"
      >
        <Plus className="size-5" />
      </Button>

      {/* Modal para crear Work Item */}
      <WorkItemCreateModal
        open={createModalOpen}
        onOpenChange={setCreateModalOpen}
        project={project}
        states={states}
        types={types}
        availableItems={workItems}
        onCreated={(created) => {
          setWorkItems((prev) => [created, ...prev]);
          toast.success("Work Item creado");
          loadAllData(true);
        }}
      />
    </div>
  );
}
