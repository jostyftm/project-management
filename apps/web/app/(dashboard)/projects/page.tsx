"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { projectService } from "@/services/plane/projectService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Card, CardContent, CardDescription, CardFooter, CardHeader, CardTitle } from "@/components/ui/card";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { DeleteProjectModal } from "@/components/plane/projects/DeleteProjectModal";
import { Plus, Search, FolderKanban, ArrowRight, Layers, Loader2, Hash, MoreVertical, Settings, Trash2 } from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/types/plane-types";

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const { currentWorkspace, projects, fetchProjects, isLoadingProjects } = useWorkspaceStore();
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [deleteModalOpen, setDeleteModalOpen] = useState(false);
  const [selectedProjectToDelete, setSelectedProjectToDelete] = useState<Project | null>(null);

  // New project form
  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [description, setDescription] = useState("");

  useEffect(() => {
    if (searchParams.get("new") === "true") {
      setOpenModal(true);
    }
  }, [searchParams]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchProjects();
    }
  }, [currentWorkspace, fetchProjects]);

  const handleNameChange = (val: string) => {
    setName(val);
    if (!identifier || identifier.length <= 5) {
      const generated = val
        .replace(/[^a-zA-Z0-9]/g, "")
        .substring(0, 5)
        .toUpperCase();
      setIdentifier(generated);
    }
  };

  const handleCreateProject = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !identifier.trim()) return;
    setIsSubmitting(true);
    try {
      await projectService.create({
        name: name.trim(),
        identifier: identifier.trim().toUpperCase(),
        description: description.trim() || undefined,
      });
      toast.success(`Proyecto "${name}" creado exitosamente`);
      setName("");
      setIdentifier("");
      setDescription("");
      setOpenModal(false);
      await fetchProjects();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al crear el proyecto");
    } finally {
      setIsSubmitting(false);
    }
  };

  const filteredProjects = projects.filter((p) =>
    p.name.toLowerCase().includes(search.toLowerCase()) ||
    p.identifier.toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="w-full space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold tracking-tight text-slate-900">Proyectos</h1>
          <p className="text-sm text-slate-500 mt-1">
            Gestiona los proyectos de tu workspace {currentWorkspace?.name ? `"${currentWorkspace.name}"` : ""}
          </p>
        </div>
        <Button
          onClick={() => setOpenModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
        >
          <Plus className="mr-2 size-4" />
          Nuevo Proyecto
        </Button>
      </div>

      {/* Filter bar */}
      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
          <Input
            placeholder="Buscar proyectos..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-9 bg-white border-slate-200"
          />
        </div>
      </div>

      {/* Projects Grid */}
      {isLoadingProjects ? (
        <div className="flex flex-col items-center justify-center py-20">
          <Loader2 className="size-8 text-indigo-600 animate-spin mb-2" />
          <p className="text-sm text-slate-500">Cargando proyectos...</p>
        </div>
      ) : filteredProjects.length === 0 ? (
        <div className="rounded-xl border border-dashed border-slate-300 bg-white p-12 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-xl bg-indigo-50 text-indigo-600 mb-4">
            <FolderKanban className="size-6" />
          </div>
          <h3 className="text-base font-semibold text-slate-900">
            {search ? "No se encontraron proyectos" : "Sin proyectos disponibles"}
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-md mx-auto">
            {search
              ? "No se encontraron proyectos que coincidan con la búsqueda."
              : "No perteneces a ningún proyecto en este workspace o aún no se han creado proyectos. Crea uno nuevo o solicita al administrador que te invite."}
          </p>
          {!search && (
            <Button
              onClick={() => setOpenModal(true)}
              className="mt-6 bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
            >
              <Plus className="mr-2 size-4" />
              Crear Proyecto
            </Button>
          )}
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {filteredProjects.map((proj: Project) => (
            <Card
              key={proj.id}
              className="border-slate-200 bg-white hover:border-indigo-300 hover:shadow-md transition-all flex flex-col justify-between"
            >
              <CardHeader className="pb-3">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md bg-slate-100 text-xs font-bold text-slate-700">
                    <Hash className="size-3 text-slate-400" />
                    <span>{proj.identifier}</span>
                  </div>
                  <div className="flex items-center gap-1.5">
                    {proj.current_user_role && (
                      <span
                        className={`inline-flex items-center px-2 py-0.5 rounded text-[11px] font-semibold border ${
                          proj.current_user_role === "ADMIN"
                            ? "bg-indigo-50 text-indigo-700 border-indigo-200"
                            : proj.current_user_role === "MEMBER"
                            ? "bg-emerald-50 text-emerald-700 border-emerald-200"
                            : "bg-slate-100 text-slate-600 border-slate-200"
                        }`}
                      >
                        {proj.current_user_role === "ADMIN"
                          ? "Admin"
                          : proj.current_user_role === "MEMBER"
                          ? "Miembro"
                          : "Visualizador"}
                      </span>
                    )}
                    <span className="text-xs text-slate-400">
                      {proj.work_items_count ?? 0} items
                    </span>

                    {proj.current_user_role === "ADMIN" && (
                      <DropdownMenu>
                        <DropdownMenuTrigger asChild>
                          <Button
                            variant="ghost"
                            size="icon"
                            className="size-7 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-md -mr-1"
                          >
                            <MoreVertical className="size-4" />
                            <span className="sr-only">Opciones del proyecto</span>
                          </Button>
                        </DropdownMenuTrigger>
                        <DropdownMenuContent align="end" className="w-48 bg-white shadow-md">
                          <DropdownMenuItem asChild>
                            <Link
                              href={`/projects/${proj.id}/settings`}
                              className="cursor-pointer"
                            >
                              <Settings className="size-4 mr-2 text-slate-500" />
                              <span>Configuración</span>
                            </Link>
                          </DropdownMenuItem>
                          <DropdownMenuSeparator />
                          <DropdownMenuItem
                            onClick={() => {
                              setSelectedProjectToDelete(proj);
                              setDeleteModalOpen(true);
                            }}
                            className="text-rose-600 focus:text-rose-600 focus:bg-rose-50 cursor-pointer"
                          >
                            <Trash2 className="size-4 mr-2" />
                            <span>Eliminar Proyecto</span>
                          </DropdownMenuItem>
                        </DropdownMenuContent>
                      </DropdownMenu>
                    )}
                  </div>
                </div>
                <CardTitle className="text-lg font-semibold text-slate-900 line-clamp-1">
                  {proj.name}
                </CardTitle>
                <CardDescription className="text-slate-500 text-sm line-clamp-2 mt-1">
                  {proj.description || "Sin descripción proporcionada."}
                </CardDescription>
              </CardHeader>
              <CardFooter className="pt-2 border-t border-slate-100">
                <Button
                  asChild
                  variant="ghost"
                  className="w-full justify-between text-indigo-600 hover:text-indigo-700 hover:bg-indigo-50 font-medium text-sm group"
                >
                  <Link href={`/projects/${proj.id}`}>
                    <span>Abrir Proyecto</span>
                    <ArrowRight className="size-4 transition-transform group-hover:translate-x-1" />
                  </Link>
                </Button>
              </CardFooter>
            </Card>
          ))}
        </div>
      )}

      {/* Modal Crear Proyecto */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <FolderKanban className="size-5 text-indigo-600" />
              Nuevo Proyecto
            </DialogTitle>
            <DialogDescription>
              Crea un proyecto para planificar ciclos, registrar bugs y tareas.
            </DialogDescription>
          </DialogHeader>
          <form onSubmit={handleCreateProject} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="proj-name">Nombre del Proyecto *</Label>
              <Input
                id="proj-name"
                placeholder="Ej. Plataforma Web"
                value={name}
                onChange={(e) => handleNameChange(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-identifier">Identificador del Proyecto *</Label>
              <Input
                id="proj-identifier"
                placeholder="Ej. PLT"
                value={identifier}
                onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                maxLength={12}
                required
              />
              <p className="text-xs text-slate-500">
                Prefijo único para los work items (ej. PLT-1, PLT-2).
              </p>
            </div>

            <div className="space-y-2">
              <Label htmlFor="proj-desc">Descripción (Opcional)</Label>
              <Textarea
                id="proj-desc"
                placeholder="Breve descripción de los objetivos del proyecto..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Crear Proyecto
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Eliminar Proyecto */}
      <DeleteProjectModal
        project={selectedProjectToDelete}
        open={deleteModalOpen}
        onOpenChange={(open) => {
          setDeleteModalOpen(open);
          if (!open) setSelectedProjectToDelete(null);
        }}
        onSuccess={() => fetchProjects()}
      />
    </div>
  );
}
