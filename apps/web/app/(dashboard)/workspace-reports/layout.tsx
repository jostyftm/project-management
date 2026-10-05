"use client";

import React from "react";
import { useAuth } from "@/hooks/use-auth";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { NotFoundView } from "@/components/common/NotFoundView";
import { Loader2 } from "lucide-react";

export default function WorkspaceReportsLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isLoading: isAuthLoading } = useAuth();
  const { currentWorkspace, isLoadingWorkspaces } = useWorkspaceStore();

  const isWorkspaceOwner = Boolean(
    currentWorkspace && user && (Number(currentWorkspace.owner_id) === Number(user.id) || user.is_instance_admin)
  );

  if (isAuthLoading || (isLoadingWorkspaces && !currentWorkspace)) {
    return (
      <div className="flex flex-col items-center justify-center py-28">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Validando permisos del workspace...</p>
      </div>
    );
  }

  if (!isWorkspaceOwner) {
    return (
      <NotFoundView
        title="Página no encontrada"
        description="El módulo de reportes dinámicos es accesible exclusivamente para el propietario del workspace."
        actionText="Volver al Home"
        actionHref="/overview"
      />
    );
  }

  return <div className="flex-1 flex flex-col h-full overflow-hidden">{children}</div>;
}

