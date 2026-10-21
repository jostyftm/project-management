"use client";

import React, { useState, useEffect, useCallback, useMemo, useRef } from "react";
import { useParams } from "next/navigation";
import { Project, WorkItem, State, WorkItemType, Milestone, Cycle, Activity, Release } from "@/types/plane-types";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { activityService } from "@/services/plane/activityService";
import { milestoneService } from "@/services/plane/milestoneService";
import { cycleService } from "@/services/plane/cycleService";
import { releaseService } from "@/services/plane/releaseService";
import { projectMemberService, ProjectMemberUser } from "@/services/plane/projectMemberService";
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import { calculateProjectHealth } from "@/lib/project-health";
import { WorkItemCreateModal } from "@/components/plane/work-items/WorkItemCreateModal";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
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
  const { currentProject } = useWorkspaceStore();

  const [project, setProject] = useState<Project | null>(() => {
    if (currentProject && String(currentProject.id) === String(projectId)) {
      return currentProject;
    }
    return null;
  });
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [releases, setReleases] = useState<Release[]>([]);
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [states, setStates] = useState<State[]>([]);
  const [types, setTypes] = useState<WorkItemType[]>([]);

  // Estados de carga independientes y progresivos por widget
  const [isProjectLoading, setIsProjectLoading] = useState(() => !project);
  const [isWorkItemsLoading, setIsWorkItemsLoading] = useState(true);
  const [isMilestonesLoading, setIsMilestonesLoading] = useState(true);
  const [isCyclesLoading, setIsCyclesLoading] = useState(true);
  const [isReleasesLoading, setIsReleasesLoading] = useState(true);
  const [isMembersLoading, setIsMembersLoading] = useState(true);
  const [isActivitiesLoading, setIsActivitiesLoading] = useState(true);

  useDocumentTitle(`${project?.name || "Proyecto"} - Overview`);

  // Floating Action Button create modal
  const [createModalOpen, setCreateModalOpen] = useState(false);

  const projectRef = useRef(project);
  useEffect(() => {
    projectRef.current = project;
  }, [project]);

  const loadAllData = useCallback(async (silent = false) => {
    if (!projectId || projectId === "new") return;

    if (!silent) {
      if (!projectRef.current) setIsProjectLoading(true);
      setIsWorkItemsLoading(true);
      setIsMilestonesLoading(true);
      setIsCyclesLoading(true);
      setIsReleasesLoading(true);
      setIsMembersLoading(true);
      setIsActivitiesLoading(true);
    }

    // 1. Proyecto
    if (!projectRef.current || String(projectRef.current.id) !== String(projectId)) {
      projectService
        .get(projectId)
        .then(setProject)
        .catch((err) => console.error("Error cargando proyecto:", err))
        .finally(() => setIsProjectLoading(false));
    } else {
      setIsProjectLoading(false);
    }

    // 2. Work Items (alimenta KPIs, Donut, Prioridades, Lista de atención y Burnup)
    workItemService
      .list(projectId)
      .then(setWorkItems)
      .catch((err) => console.error("Error cargando work items:", err))
      .finally(() => setIsWorkItemsLoading(false));

    // 3. Hitos
    milestoneService
      .list(projectId)
      .then(setMilestones)
      .catch(() => [])
      .finally(() => setIsMilestonesLoading(false));

    // 4. Ciclos / Sprints
    cycleService
      .list(projectId)
      .then(setCycles)
      .catch(() => [])
      .finally(() => setIsCyclesLoading(false));

    // 5. Releases
    releaseService
      .list(projectId)
      .then(setReleases)
      .catch(() => [])
      .finally(() => setIsReleasesLoading(false));

    // 6. Miembros
    projectMemberService
      .list(projectId)
      .then((data) => setMembers(data.members || []))
      .catch(() => setMembers([]))
      .finally(() => setIsMembersLoading(false));

    // 7. Actividades recientes
    activityService
      .listByProject(projectId)
      .then(setActivities)
      .catch(() => [])
      .finally(() => setIsActivitiesLoading(false));

    // 8 & 9. Estados y tipos para modales (en segundo plano)
    projectService.getStates(projectId).then(setStates).catch(() => []);
    workItemTypeService.list(projectId).then(setTypes as any).catch(() => []);
  }, [projectId]);

  useEffect(() => {
    loadAllData();
  }, [loadAllData]);

  const health = useMemo(
    () => calculateProjectHealth(project, workItems),
    [project, workItems]
  );

  return (
    <div className="w-full space-y-6 pb-20">
      <ProjectBreadcrumb
        projectId={projectId}
        projectName={project?.name || "Proyecto"}
        sectionTitle="Overview"
      />

      {/* 1. Project Header */}
      <ProjectOverviewHeader
        project={project}
        health={health}
        members={members}
        onProjectUpdated={(upd) => setProject(upd)}
        isLoading={isProjectLoading}
      />

      {/* 2. KPIs Row */}
      <ProjectKpiRow
        project={project}
        workItems={workItems}
        isLoading={isWorkItemsLoading}
      />

      {/* 3. Main Dashboard Grid (2/3 Left Column, 1/3 Right Column) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column (2/3) */}
        <div className="lg:col-span-2 space-y-6">
          {/* A. Burn-up / Burn-down Chart */}
          <ProjectBurnupChart
            project={project}
            workItems={workItems}
            milestones={milestones}
            releases={releases}
            cycles={cycles}
            isLoading={isWorkItemsLoading || isProjectLoading}
          />

          {/* B & C: State Donut & Priority Bar side by side */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <ProjectStateDonut
              workItems={workItems}
              projectId={projectId}
              isLoading={isWorkItemsLoading}
            />
            <ProjectPriorityBar
              workItems={workItems}
              projectId={projectId}
              isLoading={isWorkItemsLoading}
            />
          </div>

          {/* D. Requiere Atención Table */}
          <ProjectAttentionList
            workItems={workItems}
            projectId={projectId}
            isLoading={isWorkItemsLoading}
          />
        </div>

        {/* Right Column (1/3) */}
        <div className="space-y-4">
          {/* H. Current Cycle Card */}
          <ProjectCurrentCycleWidget
            cycles={cycles}
            projectId={projectId}
            isLoading={isCyclesLoading}
          />

          {/* F. Next Milestones */}
          <ProjectMilestonesWidget
            milestones={milestones}
            projectId={projectId}
            isLoading={isMilestonesLoading}
          />

          {/* G. Team Workload */}
          <ProjectTeamWorkload
            members={members}
            workItems={workItems}
            isLoading={isMembersLoading || isWorkItemsLoading}
          />

          {/* E. Recent Activity Feed */}
          <ProjectActivityFeed
            activities={activities}
            projectId={projectId}
            isLoading={isActivitiesLoading}
          />
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
