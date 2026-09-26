"use client";

import React, { useState } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
} from "@/components/ui/sidebar";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { workspaceService } from "@/services/plane/workspaceService";
import { Building2, Check, ChevronsUpDown, Plus, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { useRouter } from "next/navigation";

export function WorkspaceSwitcher() {
  const router = useRouter();
  const { currentWorkspace, workspaces, setCurrentWorkspace, fetchWorkspaces } = useWorkspaceStore();
  const [openModal, setOpenModal] = useState(false);
  const [workspaceName, setWorkspaceName] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSelectWorkspace = (w: any) => {
    setCurrentWorkspace(w);
    router.push("/projects");
  };

  const handleCreateWorkspace = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!workspaceName.trim()) return;
    setIsSubmitting(true);
    try {
      const created = await workspaceService.create({ name: workspaceName.trim() });
      toast.success(`Workspace "${created.name}" creado`);
      setWorkspaceName("");
      setOpenModal(false);
      await fetchWorkspaces();
      setCurrentWorkspace(created);
      router.push("/projects");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al crear el workspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <>
      <SidebarMenu>
        <SidebarMenuItem>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <SidebarMenuButton
                size="lg"
                className="data-[state=open]:bg-sidebar-accent data-[state=open]:text-sidebar-accent-foreground hover:bg-slate-100"
              >
                <div className="flex aspect-square size-8 items-center justify-center rounded-lg bg-indigo-600 text-white font-bold text-sm shadow-sm">
                  {currentWorkspace?.name ? currentWorkspace.name.substring(0, 2).toUpperCase() : "PL"}
                </div>
                <div className="grid flex-1 text-left text-sm leading-tight">
                  <span className="truncate font-semibold text-slate-800">
                    {currentWorkspace?.name || "Seleccionar Workspace"}
                  </span>
                  <span className="truncate text-xs text-slate-500">
                    {currentWorkspace?.slug ? `/${currentWorkspace.slug}` : "Workspace"}
                  </span>
                </div>
                <ChevronsUpDown className="ml-auto size-4 text-slate-400" />
              </SidebarMenuButton>
            </DropdownMenuTrigger>
            <DropdownMenuContent
              className="w-64 rounded-lg p-2"
              align="start"
              sideOffset={4}
            >
              <DropdownMenuLabel className="text-xs font-medium text-slate-500 px-2 py-1">
                Tus Workspaces
              </DropdownMenuLabel>
              <div className="space-y-1 my-1">
                {workspaces.map((w) => {
                  const isActive = String(w.id) === String(currentWorkspace?.id);
                  return (
                    <DropdownMenuItem
                      key={w.id}
                      onClick={() => handleSelectWorkspace(w)}
                      className="flex items-center gap-2 px-2 py-2 cursor-pointer rounded-md hover:bg-slate-100 text-sm"
                    >
                      <div className="flex size-7 items-center justify-center rounded bg-slate-200 text-slate-700 font-semibold text-xs">
                        {w.name.substring(0, 2).toUpperCase()}
                      </div>
                      <div className="flex-1 truncate">
                        <p className="font-medium text-slate-800 truncate">{w.name}</p>
                        <p className="text-xs text-slate-400 truncate">/{w.slug}</p>
                      </div>
                      {isActive && <Check className="size-4 text-indigo-600 shrink-0" />}
                    </DropdownMenuItem>
                  );
                })}
              </div>

              <DropdownMenuSeparator />

              <DropdownMenuItem
                onClick={() => setOpenModal(true)}
                className="flex items-center gap-2 px-2 py-2 cursor-pointer text-indigo-600 font-medium text-sm hover:bg-indigo-50"
              >
                <div className="flex size-7 items-center justify-center rounded border border-dashed border-indigo-300">
                  <Plus className="size-4" />
                </div>
                <span>Crear nuevo workspace</span>
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </SidebarMenuItem>
      </SidebarMenu>

      {/* Modal para crear Workspace */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <Building2 className="size-5 text-indigo-600" />
              Crear Workspace
            </DialogTitle>
            <DialogDescription>
              Un workspace agrupa todos tus proyectos, miembros y ciclos de trabajo.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateWorkspace}>
            <div className="space-y-4 py-3">
              <div className="space-y-2">
                <Label htmlFor="ws-name">Nombre del Workspace</Label>
                <Input
                  id="ws-name"
                  placeholder="Ej. Producto & Ingeniería"
                  value={workspaceName}
                  onChange={(e) => setWorkspaceName(e.target.value)}
                  required
                />
              </div>
            </div>
            <DialogFooter>
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Crear Workspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </>
  );
}
