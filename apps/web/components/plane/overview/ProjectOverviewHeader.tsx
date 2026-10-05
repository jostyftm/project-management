"use client";

import React, { useState } from "react";
import Link from "next/link";
import { Project } from "@/types/plane-types";
import { ProjectMemberUser } from "@/services/plane/projectMemberService";
import { HealthBadgeInfo } from "@/lib/project-health";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Calendar,
  CheckSquare,
  Hash,
  Pencil,
  Loader2,
  Users,
} from "lucide-react";
import { projectService } from "@/services/plane/projectService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface ProjectOverviewHeaderProps {
  project: Project;
  health: HealthBadgeInfo;
  members: ProjectMemberUser[];
  onProjectUpdated?: (updated: Project) => void;
}

export function ProjectOverviewHeader({
  project,
  health,
  members,
  onProjectUpdated,
}: ProjectOverviewHeaderProps) {
  const [openDatesModal, setOpenDatesModal] = useState(false);
  const [startDate, setStartDate] = useState(project.start_date || "");
  const [targetDate, setTargetDate] = useState(project.target_date || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const isAdmin = project.current_user_role === "ADMIN";

  const handleSaveDates = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    try {
      const updated = await projectService.update(project.id, {
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
      });
      toast.success("Fechas del proyecto actualizadas");
      setOpenDatesModal(false);
      if (onProjectUpdated) {
        onProjectUpdated({ ...project, ...updated });
      }
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al actualizar las fechas");
    } finally {
      setIsSubmitting(false);
    }
  };

  const visibleMembers = members.slice(0, 5);
  const remainingCount = members.length > 5 ? members.length - 5 : 0;

  return (
    <div className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs">
      <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
        {/* Title, badge, and description */}
        <div className="space-y-2 flex-1 min-w-0">
          <div className="flex flex-wrap items-center gap-2.5">
            <div className="inline-flex items-center gap-1 px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 font-mono text-xs font-bold">
              <Hash className="size-3 text-slate-400" />
              <span>{project.identifier}</span>
            </div>

            <h1 className="text-2xl font-bold tracking-tight text-slate-900 truncate">
              {project.name}
            </h1>

            {/* Health Badge */}
            <div
              className={cn(
                "inline-flex items-center gap-1.5 px-2.5 py-0.5 rounded-full text-xs font-semibold border",
                health.badgeClass
              )}
            >
              <span className={cn("size-2 rounded-full", health.dotClass)} />
              <span>{health.label}</span>
            </div>
          </div>

          <p className="text-sm text-slate-500 line-clamp-2 max-w-3xl">
            {project.description || "Sin descripción proporcionada para este proyecto."}
          </p>

          {/* Dates & Members Info */}
          <div className="flex flex-wrap items-center gap-4 text-xs text-slate-500 pt-1">
            <div className="inline-flex items-center gap-1.5">
              <Calendar className="size-3.5 text-slate-400" />
              <span>
                {project.start_date || project.target_date ? (
                  <>
                    {project.start_date ? new Date(project.start_date).toLocaleDateString() : "Inicio no definido"}{" "}
                    &rarr;{" "}
                    {project.target_date ? new Date(project.target_date).toLocaleDateString() : "Objetivo no definido"}
                  </>
                ) : (
                  "Fechas de proyecto sin programar"
                )}
              </span>
              {isAdmin && (
                <button
                  onClick={() => setOpenDatesModal(true)}
                  className="text-indigo-600 hover:text-indigo-800 ml-1 p-0.5 hover:bg-indigo-50 rounded"
                  title="Editar fechas del proyecto"
                >
                  <Pencil className="size-3" />
                </button>
              )}
            </div>

            {/* Stacked avatars */}
            <div className="flex items-center gap-1.5">
              <Users className="size-3.5 text-slate-400" />
              <div className="flex -space-x-1.5 overflow-hidden">
                {visibleMembers.map((m) => (
                  <div
                    key={m.id}
                    title={`${m.name} (${m.role})`}
                    className="inline-flex size-5 items-center justify-center rounded-full bg-indigo-100 text-indigo-700 text-[10px] font-bold ring-2 ring-white"
                  >
                    {m.name.charAt(0).toUpperCase()}
                  </div>
                ))}
                {remainingCount > 0 && (
                  <div
                    title={`${remainingCount} miembros más`}
                    className="inline-flex size-5 items-center justify-center rounded-full bg-slate-200 text-slate-700 text-[9px] font-bold ring-2 ring-white"
                  >
                    +{remainingCount}
                  </div>
                )}
              </div>
              <span className="text-slate-400 text-[11px]">
                {members.length} {members.length === 1 ? "miembro" : "miembros"}
              </span>
            </div>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2 shrink-0">
          <Button
            asChild
            variant="default"
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-xs text-xs font-semibold"
          >
            <Link href={`/projects/${project.id}/work-items`}>
              <CheckSquare className="size-3.5 mr-1.5" />
              <span>Ver Work Items</span>
            </Link>
          </Button>
        </div>
      </div>

      {/* Modal para editar fechas del proyecto */}
      <Dialog open={openDatesModal} onOpenChange={setOpenDatesModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-base font-bold text-slate-900">
              <Calendar className="size-4 text-indigo-600" />
              Programar Fechas del Proyecto
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              Establece la fecha de inicio y objetivo para medir la velocidad, ritmo de entrega y estado de salud.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveDates} className="space-y-4 py-2">
            <div className="space-y-1.5">
              <Label htmlFor="hdr-start-date" className="text-xs font-medium">Fecha de Inicio</Label>
              <Input
                id="hdr-start-date"
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="hdr-target-date" className="text-xs font-medium">Fecha Objetivo</Label>
              <Input
                id="hdr-target-date"
                type="date"
                value={targetDate}
                onChange={(e) => setTargetDate(e.target.value)}
                className="text-xs"
              />
            </div>

            <DialogFooter className="pt-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setOpenDatesModal(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs"
                disabled={isSubmitting}
              >
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Guardar Fechas
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
