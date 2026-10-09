"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Activity, Project } from "@/types/plane-types";
import { activityService } from "@/services/plane/activityService";
import { projectService } from "@/services/plane/projectService";
import {
  History,
  Clock,
  ChevronRight,
  Loader2,
  CheckCircle2,
  ArrowRight,
  MessageSquare,
  PlusCircle,
  UserCheck,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ProjectActivitiesPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [activities, setActivities] = useState<Activity[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle(`Historial de Actividades - ${project?.name || "Proyecto"}`);

  useEffect(() => {
    if (!projectId) return;

    async function loadData() {
      try {
        setLoading(true);
        const [projData, actData] = await Promise.all([
          projectService.get(projectId),
          activityService.listByProject(projectId),
        ]);
        setProject(projData);
        setActivities(actData);
      } catch (err) {
        console.error("Error loading project activities:", err);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [projectId]);

  const renderActionBadge = (action: string) => {
    switch (action) {
      case "STATE_CHANGED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded-full border border-indigo-100">
            <CheckCircle2 className="size-3 text-indigo-600" />
            Cambio de Estado
          </span>
        );
      case "COMMENTED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-blue-50 text-blue-700 px-2 py-0.5 rounded-full border border-blue-100">
            <MessageSquare className="size-3 text-blue-600" />
            Comentario
          </span>
        );
      case "CREATED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 px-2 py-0.5 rounded-full border border-emerald-100">
            <PlusCircle className="size-3 text-emerald-600" />
            Creación
          </span>
        );
      case "ASSIGNED":
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-purple-50 text-purple-700 px-2 py-0.5 rounded-full border border-purple-100">
            <UserCheck className="size-3 text-purple-600" />
            Asignación
          </span>
        );
      default:
        return (
          <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full">
            {action}
          </span>
        );
    }
  };

  const renderDescription = (act: Activity) => {
    const actorName = act.actor?.name || "Un usuario";

    if (act.action === "STATE_CHANGED") {
      const from = act.changes_diff?.from?.name || "Anterior";
      const to = act.changes_diff?.to?.name || "Nuevo";
      return (
        <span className="text-slate-700">
          <strong>{actorName}</strong> cambió el estado de{" "}
          <span className="font-semibold text-slate-800">{from}</span> a{" "}
          <span className="font-semibold text-indigo-700">{to}</span>
        </span>
      );
    }

    if (act.action === "COMMENTED") {
      return (
        <span className="text-slate-700">
          <strong>{actorName}</strong> añadió un comentario: &ldquo;{act.changes_diff?.preview}&rdquo;
        </span>
      );
    }

    return (
      <span className="text-slate-700">
        <strong>{actorName}</strong> realizó una modificación en el elemento #{act.entity_id}
      </span>
    );
  };

  return (
    <div className="w-full space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <ProjectBreadcrumb
            projectId={projectId}
            projectName={project?.name || "Proyecto"}
            sectionTitle="Historial de Actividades"
          />
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900 flex items-center gap-2.5">
              <History className="size-6 text-indigo-600" />
              <span>Historial de Actividades & Auditoría</span>
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
              {project?.identifier}
            </span>
          </div>
        </div>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <Loader2 className="size-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm">Cargando línea de tiempo de auditoría...</p>
        </div>
      ) : activities.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
          <History className="size-10 text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 text-base">No hay actividades registradas</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Las modificaciones, comentarios y transiciones de estado de las tareas aparecerán aquí en orden cronológico.
          </p>
        </div>
      ) : (
        <div className="relative pl-6 before:absolute before:left-2.5 before:top-2 before:bottom-2 before:w-0.5 before:bg-slate-200 space-y-4">
          {activities.map((act) => (
            <div key={act.id} className="relative flex items-start gap-4 group">
              <div className="absolute -left-6 top-1.5 size-5 rounded-full border-2 border-white bg-indigo-600 shadow-xs ring-2 ring-slate-100 flex items-center justify-center" />

              <div className="flex-1 p-4 rounded-xl border border-slate-200 bg-white shadow-xs transition-colors hover:border-slate-300">
                <div className="flex flex-wrap items-center justify-between gap-2 mb-1.5">
                  <div className="flex items-center gap-2">
                    <div className="flex size-6 items-center justify-center rounded-full bg-slate-100 text-slate-700 font-bold text-[10px]">
                      {act.actor?.name ? act.actor.name.substring(0, 2).toUpperCase() : "U"}
                    </div>
                    {renderActionBadge(act.action)}
                    <span className="text-xs font-mono text-slate-400">#{act.entity_id}</span>
                  </div>

                  <span className="text-xs text-slate-400">
                    {new Date(act.created_at).toLocaleString([], {
                      dateStyle: "medium",
                      timeStyle: "short",
                    })}
                  </span>
                </div>

                <div className="text-xs leading-relaxed">{renderDescription(act)}</div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
