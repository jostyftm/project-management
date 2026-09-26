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
import { Plus, Search, FolderKanban, ArrowRight, Layers, Loader2, Hash } from "lucide-react";
import { toast } from "sonner";
import { Project } from "@/types/plane-types";

export default function ProjectsPage() {
  const searchParams = useSearchParams();
  const { currentWorkspace, projects, fetchProjects, isLoadingProjects } = useWorkspaceStore();
  const [search, setSearch] = useState("");
  const [openModal, setOpenModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
    <div className="max-w-6xl mx-auto space-y-6">
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
          <h3 className="text-base font-semibold text-slate-900">No hay proyectos</h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            {search
              ? "No se encontraron proyectos que coincidan con la búsqueda."
              : "Comienza creando tu primer proyecto para organizar work items, ciclos y sprints."}
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
                  <span className="text-xs text-slate-400">
                    {proj.work_items_count ?? 0} items
                  </span>
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
                    <span>Ver Work Items</span>
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
    </div>
  );
}
