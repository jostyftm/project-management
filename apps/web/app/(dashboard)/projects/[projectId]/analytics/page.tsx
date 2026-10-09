"use client";

import React, { useEffect, useState, useCallback } from "react";
import { useParams } from "next/navigation";
import {
  KpiPeriod,
  ProjectKpiOverview,
  VelocityTrendCycle,
  CycleTimeStats,
  TeamMemberKpi,
} from "@/types/analytics-types";
import { projectAnalyticsService } from "@/services/plane/projectAnalyticsService";
import { projectService } from "@/services/plane/projectService";
import { Project } from "@/types/plane-types";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { ProjectKpiHeroRow } from "@/components/plane/analytics/ProjectKpiHeroRow";
import { ProjectVelocityChart } from "@/components/plane/analytics/ProjectVelocityChart";
import { CycleTimeDistributionChart } from "@/components/plane/analytics/CycleTimeDistributionChart";
import { ProjectMembersMatrixTable } from "@/components/plane/analytics/ProjectMembersMatrixTable";
import { MemberPerformanceDrawer } from "@/components/plane/analytics/MemberPerformanceDrawer";
import { BarChart3, RefreshCw, Calendar, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function ProjectAnalyticsPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [period, setPeriod] = useState<KpiPeriod>("30d");
  const [overview, setOverview] = useState<ProjectKpiOverview | null>(null);
  const [velocityTrend, setVelocityTrend] = useState<VelocityTrendCycle[]>([]);
  const [cycleTimeStats, setCycleTimeStats] = useState<CycleTimeStats | null>(null);
  const [members, setMembers] = useState<TeamMemberKpi[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [isRefreshing, setIsRefreshing] = useState(false);

  useDocumentTitle(`Métricas & KPIs - ${project?.name || "Proyecto"}`);

  // Selected member for detail drawer
  const [selectedMember, setSelectedMember] = useState<TeamMemberKpi | null>(null);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  const loadAllAnalytics = useCallback(async (isSilent = false) => {
    if (!projectId || projectId === "new") return;

    if (!isSilent) setIsLoading(true);
    else setIsRefreshing(true);

    try {
      projectService.get(projectId).then(setProject).catch(() => {});
      const [overviewData, velocityData, cycleData, membersData] = await Promise.all([
        projectAnalyticsService.getOverview(projectId, { period }),
        projectAnalyticsService.getVelocityTrend(projectId, 6),
        projectAnalyticsService.getCycleTimeStats(projectId, { period }),
        projectAnalyticsService.getTeamPerformanceMatrix(projectId, { period }),
      ]);

      setOverview(overviewData);
      setVelocityTrend(velocityData);
      setCycleTimeStats(cycleData);
      setMembers(membersData);
    } catch (err) {
      console.error("Error loading project analytics:", err);
    } finally {
      setIsLoading(false);
      setIsRefreshing(false);
    }
  }, [projectId, period]);

  useEffect(() => {
    loadAllAnalytics();
  }, [loadAllAnalytics]);

  const handleSelectMember = (member: TeamMemberKpi) => {
    setSelectedMember(member);
    setIsDrawerOpen(true);
  };

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto w-full">
      {/* Header de la vista */}
      <div className="space-y-4 pb-2 border-b border-slate-100 dark:border-neutral-800">
        <ProjectBreadcrumb
          projectId={projectId}
          projectName={project?.name || "Proyecto"}
          sectionTitle="Métricas & KPIs"
        />
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 bg-indigo-50 dark:bg-indigo-950/50 rounded-lg text-indigo-600 dark:text-indigo-400">
              <BarChart3 className="size-5" />
            </div>
            <div>
              <h1 className="text-xl font-bold text-slate-900 dark:text-slate-100">
                Métricas & KPIs de Desempeño
              </h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Evaluación grupal e individual del proyecto: velocidad, tiempos de ciclo, calidad y balance de trabajo
              </p>
            </div>
          </div>

        <div className="flex items-center gap-2.5">
          {/* Selector de periodo */}
          <div className="inline-flex rounded-lg border border-slate-200 dark:border-neutral-800 p-0.5 bg-slate-50 dark:bg-neutral-800/50 text-xs">
            <button
              onClick={() => setPeriod("14d")}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                period === "14d"
                  ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              14 días
            </button>
            <button
              onClick={() => setPeriod("30d")}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                period === "30d"
                  ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              30 días
            </button>
            <button
              onClick={() => setPeriod("90d")}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                period === "90d"
                  ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              90 días
            </button>
            <button
              onClick={() => setPeriod("all")}
              className={`px-3 py-1 font-medium rounded-md transition-colors ${
                period === "all"
                  ? "bg-white dark:bg-neutral-900 text-slate-900 dark:text-slate-100 shadow-xs"
                  : "text-slate-500 hover:text-slate-900"
              }`}
            >
              Histórico
            </button>
          </div>

          {/* Botón de actualizar datos */}
          <Button
            variant="outline"
            size="sm"
            onClick={() => loadAllAnalytics(true)}
            disabled={isRefreshing}
            className="text-xs gap-1.5 h-8 border-slate-200 dark:border-neutral-700"
          >
            <RefreshCw className={`size-3.5 ${isRefreshing ? "animate-spin" : ""}`} />
            <span>Actualizar</span>
          </Button>
        </div>
      </div>
    </div>

      {/* Fila 1: Resumen ejecutivo y 4 pilares de KPIs */}
      <ProjectKpiHeroRow overview={overview} isLoading={isLoading} />

      {/* Fila 2: Gráficos de Flujo y Tiempos */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <ProjectVelocityChart trend={velocityTrend} isLoading={isLoading} />
        <CycleTimeDistributionChart stats={cycleTimeStats} isLoading={isLoading} />
      </div>

      {/* Fila 3: Matriz de Rendimiento Individual y Balance de Carga */}
      <ProjectMembersMatrixTable
        members={members}
        isLoading={isLoading}
        onSelectMember={handleSelectMember}
      />

      {/* Drawer de Rendimiento Individual */}
      <MemberPerformanceDrawer
        projectId={projectId}
        member={selectedMember}
        period={period}
        isOpen={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
      />
    </div>
  );
}
