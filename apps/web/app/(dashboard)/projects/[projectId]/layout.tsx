"use client";

import React, { useState, useEffect } from "react";
import { useParams, usePathname } from "next/navigation";
import { projectService } from "@/services/plane/projectService";
import { Project } from "@/types/plane-types";
import { ProjectNotFoundView } from "@/components/plane/ProjectNotFoundView";
import { Loader2 } from "lucide-react";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";

export default function ProjectLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const params = useParams();
  const pathname = usePathname();
  const projectId = String(params.projectId);
  const { setCurrentProject } = useWorkspaceStore();

  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isNotFound, setIsNotFound] = useState(false);

  useEffect(() => {
    if (!projectId || projectId === "new") {
      setIsLoading(false);
      return;
    }

    let isMounted = true;
    setIsLoading(true);

    projectService
      .get(projectId)
      .then((data) => {
        if (!isMounted) return;
        setProject(data);
        setCurrentProject(data);
        setIsNotFound(false);
      })
      .catch((err) => {
        if (!isMounted) return;
        setIsNotFound(true);
        setCurrentProject(null);
      })
      .finally(() => {
        if (isMounted) setIsLoading(false);
      });

    return () => {
      isMounted = false;
    };
  }, [projectId, setCurrentProject]);

  // Si no se encuentra el proyecto o el usuario no tiene permisos
  if (isNotFound) {
    return <ProjectNotFoundView />;
  }

  // Spinner mientras valida existencia y permisos
  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] py-16">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-xs font-medium text-slate-500">Cargando proyecto...</p>
      </div>
    );
  }

  // Validación de rutas restringidas exclusivamente para ADMIN
  if (project && project.current_user_role !== "ADMIN") {
    const isRestrictedRoute =
      pathname.includes(`/projects/${projectId}/settings`) ||
      pathname.includes(`/projects/${projectId}/automations`) ||
      pathname.includes(`/projects/${projectId}/activities`);

    if (isRestrictedRoute) {
      return (
        <ProjectNotFoundView
          title="Sección no disponible"
          description="Esta sección está reservada exclusivamente para administradores del proyecto o del workspace."
          actionText="Volver al Tablero del Proyecto"
          actionHref={`/projects/${projectId}`}
        />
      );
    }
  }

  return <>{children}</>;
}
