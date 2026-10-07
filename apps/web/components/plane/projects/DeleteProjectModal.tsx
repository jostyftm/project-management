"use client";

import React, { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { projectService } from "@/services/plane/projectService";
import { Project } from "@/types/plane-types";
import { AlertTriangle, Trash2, Loader2, ShieldAlert } from "lucide-react";
import { toast } from "sonner";

interface DeleteProjectModalProps {
  project: Project | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  redirectToProjectsOnSuccess?: boolean;
}

export function DeleteProjectModal({
  project,
  open,
  onOpenChange,
  onSuccess,
  redirectToProjectsOnSuccess = false,
}: DeleteProjectModalProps) {
  const router = useRouter();
  const { currentProject, setCurrentProject, fetchProjects } = useWorkspaceStore();
  const [confirmInput, setConfirmInput] = useState("");
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    if (open) {
      setConfirmInput("");
      setIsDeleting(false);
    }
  }, [open]);

  if (!project) return null;

  const isMatch =
    confirmInput.trim().toUpperCase() === project.identifier.trim().toUpperCase();

  const handleDelete = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isMatch || isDeleting) return;

    setIsDeleting(true);
    try {
      await projectService.delete(project.id);
      toast.success(`Proyecto "${project.name}" eliminado correctamente`);

      if (currentProject && String(currentProject.id) === String(project.id)) {
        setCurrentProject(null);
      }

      await fetchProjects();

      onOpenChange(false);
      onSuccess?.();

      if (redirectToProjectsOnSuccess) {
        router.push("/projects");
      }
    } catch (err: any) {
      toast.error(
        err?.response?.data?.message || "Error al eliminar el proyecto"
      );
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md border-rose-200">
        <DialogHeader className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="flex size-10 items-center justify-center rounded-full bg-rose-100 text-rose-600">
              <ShieldAlert className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900">
                Eliminar Proyecto
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Esta acción no se puede deshacer y es permanente.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleDelete} className="space-y-4 py-2">
          {/* Warning box */}
          <div className="rounded-lg border border-rose-200 bg-rose-50/70 p-3.5 text-xs text-rose-900 space-y-2">
            <p className="font-semibold flex items-center gap-1.5 text-rose-700">
              <AlertTriangle className="size-4 shrink-0" />
              Se eliminará definitivamente el proyecto{" "}
              <span className="font-bold underline">{project.name}</span> (
              <span className="font-mono font-bold">{project.identifier}</span>).
            </p>
            <p className="text-rose-800 leading-relaxed">
              Toda la información vinculada será borrada de forma irreversible:
            </p>
            <ul className="list-disc list-inside space-y-1 text-rose-800/90 pl-1 font-medium">
              <li>Todos los ciclos y sprints programados</li>
              <li>Todas las historias de usuario, tareas y subtareas</li>
              <li>Entregables, evidencias y archivos adjuntos</li>
              <li>Módulos, páginas de wiki y documentación</li>
              <li>Etiquetas, estados y reglas de automatización</li>
            </ul>
          </div>

          {/* Confirm input */}
          <div className="space-y-2">
            <Label htmlFor="confirm-identifier" className="text-xs font-semibold text-slate-700">
              Para confirmar, escribe{" "}
              <span className="font-mono font-bold text-rose-600 bg-rose-50 px-1 py-0.5 rounded border border-rose-200">
                {project.identifier}
              </span>{" "}
              a continuación:
            </Label>
            <Input
              id="confirm-identifier"
              value={confirmInput}
              onChange={(e) => setConfirmInput(e.target.value)}
              placeholder={project.identifier}
              autoComplete="off"
              className="font-mono font-semibold uppercase tracking-wider border-slate-300 focus-visible:ring-rose-500"
              disabled={isDeleting}
            />
          </div>

          <DialogFooter className="gap-2 sm:gap-0 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isDeleting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              variant="destructive"
              disabled={!isMatch || isDeleting}
              className="bg-rose-600 hover:bg-rose-700 text-white font-medium shadow-sm transition-all"
            >
              {isDeleting ? (
                <>
                  <Loader2 className="mr-2 size-4 animate-spin" />
                  Eliminando...
                </>
              ) : (
                <>
                  <Trash2 className="mr-2 size-4" />
                  Eliminar Proyecto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
