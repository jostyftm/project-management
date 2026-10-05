"use client";

import React, { useState, useEffect } from "react";
import { Initiative } from "@/types/plane-types";
import { initiativeService } from "@/services/plane/initiativeService";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Target,
  Plus,
  Calendar,
  FolderKanban,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function InitiativesPage() {
  const { projects } = useWorkspaceStore();
  const [initiatives, setInitiatives] = useState<Initiative[]>([]);
  const [loading, setLoading] = useState(true);

  // Modal
  const [openModal, setOpenModal] = useState(false);
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [targetDate, setTargetDate] = useState("");
  const [status, setStatus] = useState("PLANNED");
  const [selectedProjectIds, setSelectedProjectIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchInitiatives = async () => {
    try {
      setLoading(true);
      const data = await initiativeService.list();
      setInitiatives(data);
    } catch (err) {
      console.error("Error loading initiatives:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInitiatives();
  }, []);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await initiativeService.create({
        title: title.trim(),
        description: description.trim() || undefined,
        target_date: targetDate || undefined,
        status,
        project_ids: selectedProjectIds,
      });

      toast.success("Iniciativa estratégica creada");
      setInitiatives((prev) => [created, ...prev]);
      setTitle("");
      setDescription("");
      setTargetDate("");
      setSelectedProjectIds([]);
      setOpenModal(false);
    } catch (err) {
      toast.error("Error al crear la iniciativa");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await initiativeService.delete(id);
      setInitiatives((prev) => prev.filter((i) => String(i.id) !== String(id)));
      toast.success("Iniciativa eliminada");
    } catch (err) {
      toast.error("Error al eliminar");
    }
  };

  const getStatusBadge = (st: string) => {
    switch (st) {
      case "ACHIEVED":
        return <span className="bg-emerald-50 text-emerald-700 border border-emerald-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">Alcanzada</span>;
      case "IN_PROGRESS":
        return <span className="bg-blue-50 text-blue-700 border border-blue-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">En Progreso</span>;
      case "CANCELLED":
        return <span className="bg-slate-100 text-slate-500 text-xs px-2.5 py-0.5 rounded-full font-semibold">Cancelada</span>;
      default:
        return <span className="bg-amber-50 text-amber-700 border border-amber-200 text-xs px-2.5 py-0.5 rounded-full font-semibold">Planificada</span>;
    }
  };

  return (
    <div className="flex-1 space-y-6 w-full">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <Target className="size-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Iniciativas Estratégicas
            </h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Agrupa múltiples proyectos bajo metas trimestrales y objetivos de alto nivel.
          </p>
        </div>

        <Button
          onClick={() => setOpenModal(true)}
          className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-semibold h-9 shadow-sm"
        >
          <Plus className="size-4" />
          <span>Nueva Iniciativa</span>
        </Button>
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <Loader2 className="size-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm">Cargando iniciativas...</p>
        </div>
      ) : initiatives.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
          <Target className="size-10 text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 text-base">No hay iniciativas registradas</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Crea tu primera iniciativa para coordinar metas estratégicas entre proyectos.
          </p>
          <Button onClick={() => setOpenModal(true)} className="mt-4 bg-indigo-600 text-white text-xs">
            <Plus className="size-4 mr-1.5" /> Crear Iniciativa
          </Button>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
          {initiatives.map((init) => (
            <div
              key={init.id}
              className="bg-white border border-slate-200 rounded-xl p-5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all flex flex-col justify-between"
            >
              <div className="space-y-3">
                <div className="flex items-center justify-between gap-2">
                  {getStatusBadge(init.status)}
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleDelete(init.id)}
                    className="size-7 text-slate-400 hover:text-red-600"
                  >
                    <Trash2 className="size-3.5" />
                  </Button>
                </div>

                <h3 className="font-bold text-slate-900 text-base leading-snug">
                  {init.title}
                </h3>

                {init.description && (
                  <p className="text-xs text-slate-500 line-clamp-2 leading-relaxed">
                    {init.description}
                  </p>
                )}

                {init.projects && init.projects.length > 0 && (
                  <div className="space-y-1.5 pt-1">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Proyectos Vinculados ({init.projects.length}):
                    </p>
                    <div className="flex flex-wrap gap-1.5">
                      {init.projects.map((proj) => (
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
                <div className="flex items-center gap-1.5">
                  <Calendar className="size-3.5 text-slate-400" />
                  <span>{init.target_date ? `Meta: ${init.target_date}` : "Sin fecha límite"}</span>
                </div>
                <span>{init.creator?.name || "Autor"}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Create Modal */}
      <Dialog open={openModal} onOpenChange={setOpenModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Target className="size-5 text-indigo-600" />
              Nueva Iniciativa Estratégica
            </DialogTitle>
            <DialogDescription>
              Define un objetivo superior y vincula los proyectos involucrados.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="init-title">Título de la Iniciativa *</Label>
              <Input
                id="init-title"
                placeholder="Ej. Rediseño de Experiencia Móvil 2026"
                value={title}
                onChange={(e) => setTitle(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="space-y-2">
                <Label htmlFor="init-status">Estado</Label>
                <Select value={status} onValueChange={setStatus}>
                  <SelectTrigger id="init-status">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PLANNED">Planificada</SelectItem>
                    <SelectItem value="IN_PROGRESS">En Progreso</SelectItem>
                    <SelectItem value="ACHIEVED">Alcanzada</SelectItem>
                    <SelectItem value="CANCELLED">Cancelada</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="init-date">Fecha Objetivo</Label>
                <Input
                  id="init-date"
                  type="date"
                  value={targetDate}
                  onChange={(e) => setTargetDate(e.target.value)}
                />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Proyectos Involucrados</Label>
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
              <Label htmlFor="init-desc">Descripción (Opcional)</Label>
              <Textarea
                id="init-desc"
                placeholder="Detalles sobre el alcance, métricas de éxito (KPIs/OKRs)..."
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
                Guardar Iniciativa
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
