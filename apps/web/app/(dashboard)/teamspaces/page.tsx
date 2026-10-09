"use client";

import React, { useState, useEffect } from "react";
import { Teamspace } from "@/types/plane-types";
import { teamspaceService } from "@/services/plane/teamspaceService";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
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
  Users2,
  Plus,
  FolderKanban,
  Trash2,
  Loader2,
  Hash,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function TeamspacesPage() {
  const { projects } = useWorkspaceStore();
  const [teamspaces, setTeamspaces] = useState<Teamspace[]>([]);
  const [loading, setLoading] = useState(true);

  useDocumentTitle("Teamspaces");

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [name, setName] = useState("");
  const [icon, setIcon] = useState("👥");
  const [description, setDescription] = useState("");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchTeamspaces = async () => {
    try {
      setLoading(true);
      const data = await teamspaceService.list();
      setTeamspaces(data);
    } catch (err) {
      console.error("Error loading teamspaces:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTeamspaces();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await teamspaceService.create({
        name: name.trim(),
        icon: icon || "👥",
        description: description.trim() || undefined,
        project_ids: selectedProjectIds,
      });

      toast.success("Teamspace creado");
      setTeamspaces((prev) => [...prev, created]);
      setName("");
      setDescription("");
      setSelectedProjectIds([]);
      setOpenModal(false);
    } catch (err) {
      toast.error("Error al crear el teamspace");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await teamspaceService.delete(id);
      setTeamspaces((prev) => prev.filter((t) => String(t.id) !== String(id)));
      toast.success("Teamspace eliminado");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  return (
    <div className="flex-1 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Users2 className="size-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Teamspaces (Equipos)
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Organiza y agrupa proyectos por equipo multidisciplinario o área funcional.
          </p>
        </div>

        <Button
          onClick={() => setOpenModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-semibold h-9 shadow-sm"
        >
          <Plus className="size-4" />
          <span>Nuevo Teamspace</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <Loader2 className="size-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm">Cargando teamspaces...</p>
        </div>
      ) : teamspaces.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
          <Users2 className="size-10 text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 text-base">No hay teamspaces definidos</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Crea espacios de equipo como "Frontend", "Plataforma" o "Diseño" para agrupar proyectos.
          </p>
          <Button onClick={() => setOpenModal(true)} className="mt-4 bg-indigo-600 text-white text-xs">
            <Plus className="size-4 mr-1.5" /> Crear Teamspace
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {teamspaces.map((ts) => (
            <div
              key={ts.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-2xl">{ts.icon || "👥"}</span>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(ts.id)}
                    className="size-7 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <div>
                  <h3 className="font-bold text-slate-900 text-base">{ts.name}</h3>
                  <span className="font-mono text-xs text-slate-400">/{ts.slug}</span>
                </div>

                {ts.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {ts.description}
                  </p>
                )}

                {ts.projects && ts.projects.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Proyectos Asignados ({ts.projects.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {ts.projects.map((proj) => (
                        <span
                          key={proj.id}
                          className="font-mono text-[10px] font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded border border-slate-200"
                        >
                          {proj.identifier}
                        </span>
                      ))}
                    </div>
                  </div>
                )}
              </div>

              <div className="flex items-center justify-between pt-4 mt-4 border-t border-slate-100 text-xs text-slate-400">
                <span>{ts.projects?.length || 0} proyectos</span>
                <span>{ts.created_at ? new Date(ts.created_at).toLocaleDateString() : ""}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Users2 className="size-5 text-indigo-600" />
              Nuevo Teamspace
            </DialogTitle>
            <DialogDescription>
              Crea una división para proyectos de un equipo especializado.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-4 gap-3">
              <div className="space-y-2 col-span-1">
                <Label htmlFor="ts-icon">Icono</Label>
                <Input
                  id="ts-icon"
                  value={icon}
                  onChange={(e) => setIcon(e.target.value)}
                  className="text-center text-lg"
                />
              </div>

              <div className="space-y-2 col-span-3">
                <Label htmlFor="ts-name">Nombre del Equipo *</Label>
                <Input
                  id="ts-name"
                  placeholder="Ej. Core Infrastructure"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Proyectos del Equipo</Label>
              <div className="flex flex-wrap gap-1.5 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-36 overflow-y-auto">
                {projects.map((proj) => {
                  const isSelected = selectedProjectIds.includes(String(proj.id));
                  return (
                    <button
                      key={proj.id}
                      type="button"
                      onClick={() => {
                        setSelectedProjectIds((prev) =>
                          isSelected ? prev.filter((id) => id !== String(proj.id)) : [...prev, String(proj.id)]
                        );
                      }}
                      className={cn(
                        "text-xs px-2.5 py-1 rounded-md font-medium border transition-colors cursor-pointer",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600"
                          : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                      )}
                    >
                      {proj.identifier} • {proj.name}
                    </button>
                  );
                })}
              </div>
            </div>

            <div className="space-y-2">
              <Label htmlFor="ts-desc">Descripción (Opcional)</Label>
              <Textarea
                id="ts-desc"
                placeholder="Objetivo y responsabilidades del equipo..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Guardar Teamspace
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
