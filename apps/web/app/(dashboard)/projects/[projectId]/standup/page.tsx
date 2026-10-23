"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import { projectService } from "@/services/plane/projectService";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { DailyStandupView } from "@/components/plane/agile/DailyStandupView";
import { DailyStandupHistoryView } from "@/components/plane/agile/DailyStandupHistoryView";
import { Project } from "@/types/plane-types";
import { Users2, Calendar, History } from "lucide-react";
import { useDocumentTitle } from "@/hooks/use-document-title";
import { cn } from "@/lib/utils";

export default function DailyStandupPage() {
  const params = useParams();
  const projectId = String(params.projectId);
  const [project, setProject] = useState<Project | null>(null);
  const [activeTab, setActiveTab] = useState<"today" | "history">("today");

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
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 mt-1">
          <h1 className="text-xl md:text-2xl font-bold text-slate-900 tracking-tight flex items-center gap-2">
            <Users2 className="size-6 text-indigo-600" />
            Daily Standup Ágil
          </h1>

          {/* Navegación por Pestañas */}
          <div className="flex items-center gap-1 p-1 bg-slate-100 rounded-xl border border-slate-200/80 self-start sm:self-auto">
            <button
              type="button"
              onClick={() => setActiveTab("today")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "today"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Calendar className="size-3.5" />
              <span>Standup de Hoy</span>
            </button>
            <button
              type="button"
              onClick={() => setActiveTab("history")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer",
                activeTab === "history"
                  ? "bg-white text-indigo-700 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <History className="size-3.5" />
              <span>Historial & Días Trabajados</span>
            </button>
          </div>
        </div>
      </div>

      {/* Contenido según la pestaña activa */}
      {activeTab === "today" ? (
        <DailyStandupView projectId={projectId} />
      ) : (
        <DailyStandupHistoryView projectId={projectId} />
      )}
    </div>
  );
}
