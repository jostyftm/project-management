"use client";

import React from "react";
import Link from "next/link";
import { Activity } from "@/types/plane-types";
import { WidgetCard } from "./WidgetCard";
import {
  CheckCircle2,
  Clock,
  History,
  MessageSquare,
  PlusCircle,
  UserCheck,
  Zap,
} from "lucide-react";
import { formatDistanceToNow } from "date-fns";
import { es } from "date-fns/locale";

interface ProjectActivityFeedProps {
  activities: Activity[];
  projectId: string | number;
}

export function ProjectActivityFeed({
  activities,
  projectId,
}: ProjectActivityFeedProps) {
  const recentActivities = activities.slice(0, 8);

  const getActionIcon = (action: string) => {
    switch (action) {
      case "STATE_CHANGED":
        return <CheckCircle2 className="size-3.5 text-indigo-600" />;
      case "COMMENTED":
        return <MessageSquare className="size-3.5 text-blue-600" />;
      case "CREATED":
        return <PlusCircle className="size-3.5 text-emerald-600" />;
      case "ASSIGNED":
        return <UserCheck className="size-3.5 text-purple-600" />;
      default:
        return <Zap className="size-3.5 text-slate-500" />;
    }
  };

  const formatActivityText = (act: Activity) => {
    const actorName = act.actor?.name || "Usuario";
    const action = act.action;
    const diff = act.changes_diff || {};

    if (action === "STATE_CHANGED") {
      const newState = diff.state_to || diff.state || "un nuevo estado";
      return (
        <span>
          <strong className="text-slate-800">{actorName}</strong> cambió de estado a{" "}
          <span className="font-medium text-indigo-600">{newState}</span>
        </span>
      );
    }

    if (action === "COMMENTED") {
      return (
        <span>
          <strong className="text-slate-800">{actorName}</strong> comentó en una tarea
        </span>
      );
    }

    if (action === "CREATED") {
      return (
        <span>
          <strong className="text-slate-800">{actorName}</strong> creó el elemento
        </span>
      );
    }

    if (action === "ASSIGNED") {
      const assignedTo = diff.assignee_name || "un colaborador";
      return (
        <span>
          <strong className="text-slate-800">{actorName}</strong> asignó la tarea a{" "}
          <strong className="text-slate-700">{assignedTo}</strong>
        </span>
      );
    }

    return (
      <span>
        <strong className="text-slate-800">{actorName}</strong> actualizó un elemento
      </span>
    );
  };

  return (
    <WidgetCard
      title="Actividad Reciente"
      description="Últimos cambios y colaboraciones en el proyecto"
      exportFilename="actividad-reciente"
      actions={
        <Link
          href={`/projects/${projectId}/activities`}
          className="text-xs text-indigo-600 hover:text-indigo-800 font-medium"
        >
          Historial
        </Link>
      }
    >
      {recentActivities.length === 0 ? (
        <div className="py-6 text-center text-xs text-slate-400">
          No hay actividades recientes registradas.
        </div>
      ) : (
        <div className="space-y-3 pt-1">
          {recentActivities.map((act) => {
            let timeAgo = "";
            try {
              timeAgo = formatDistanceToNow(new Date(act.created_at), {
                addSuffix: true,
                locale: es,
              });
            } catch {
              timeAgo = "recientemente";
            }

            return (
              <div key={act.id} className="flex items-start gap-2.5 text-xs">
                <div className="size-6 rounded-full bg-slate-100 flex items-center justify-center shrink-0 mt-0.5">
                  {getActionIcon(act.action)}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="text-slate-600 leading-snug line-clamp-2">
                    {formatActivityText(act)}
                  </p>
                  <span className="text-[10px] text-slate-400 mt-0.5 inline-flex items-center gap-1">
                    <Clock className="size-2.5" />
                    {timeAgo}
                  </span>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </WidgetCard>
  );
}
