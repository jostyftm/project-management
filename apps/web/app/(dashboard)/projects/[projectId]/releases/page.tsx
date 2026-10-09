"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import { Release, Project, WorkItem } from "@/types/plane-types";
import { releaseService } from "@/services/plane/releaseService";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { ReleasePublishModal } from "@/components/plane/releases/ReleasePublishModal";
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
  Rocket,
  Plus,
  Calendar,
  CheckCircle2,
  Clock,
  Trash2,
  Loader2,
  ChevronRight,
  Check,
  FileText,
  Tag,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { ProjectBreadcrumb } from "@/components/plane/common/ProjectBreadcrumb";
import { useDocumentTitle } from "@/hooks/use-document-title";

export default function ProjectReleasesPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [releases, setReleases] = useState<Release[]>([]);

  useDocumentTitle(`Releases - ${project?.name || "Proyecto"}`);
  const [availableItems, setAvailableItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState(true);

  // Create Release Modal
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [name, setName] = useState("");
  const [version, setVersion] = useState("");
  const [description, setDescription] = useState("");
  const [selectedItemIds, setSelectedItemIds] = useState<string[]>([]);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Publish / Changelog Modal
  const [selectedReleaseForPublish, setSelectedReleaseForPublish] = useState<Release | null>(null);
  const [openPublishModal, setOpenPublishModal] = useState(false);

  const loadData = async () => {
    if (!projectId) return;
    try {
      setLoading(true);
      const [projData, releasesData, itemsData] = await Promise.all([
        projectService.get(projectId),
        releaseService.list(projectId),
        workItemService.list(projectId),
      ]);
      setProject(projData);
      setReleases(releasesData);
      setAvailableItems(itemsData);
    } catch (err) {
      console.error("Error loading releases:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [projectId]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !version.trim()) {
      toast.error("Por favor completa el nombre y la versión");
      return;
    }

    setIsSubmitting(true);
    try {
      const created = await releaseService.create(projectId, {
        name: name.trim(),
        version: version.trim(),
        description: description.trim() || undefined,
        status: "DRAFT",
        work_item_ids: selectedItemIds,
      });

      toast.success(`Release ${created.version} creado exitosamente`);
      setReleases((prev) => [created, ...prev]);
      setName("");
      setVersion("");
      setDescription("");
      setSelectedItemIds([]);
      setOpenCreateModal(false);
    } catch (err) {
      toast.error("Error al crear el release");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (id: string | number) => {
    try {
      await releaseService.delete(id);
      setReleases((prev) => prev.filter((r) => String(r.id) !== String(id)));
      toast.success("Release eliminado");
    } catch (err) {
      toast.error("Error al eliminar el release");
    }
  };

  const handleOpenPublishModal = (release: Release) => {
    setSelectedReleaseForPublish(release);
    setOpenPublishModal(true);
  };

  const handlePublishedSuccess = (updated: Release) => {
    setReleases((prev) =>
      prev.map((r) => (String(r.id) === String(updated.id) ? updated : r))
    );
  };

  const isAdmin = project?.current_user_role === "ADMIN";

  return (
    <div className="space-y-6">
      {/* Breadcrumb Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div className="space-y-2">
          <ProjectBreadcrumb
            projectId={projectId}
            projectName={project?.name || "Proyecto"}
            sectionTitle="Releases"
          />
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Releases y Changelog
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
              {project?.identifier}
            </span>
          </div>
        </div>

        {isAdmin && (
          <Button
            onClick={() => setOpenCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white gap-1.5 text-xs font-semibold h-9 shadow-sm"
          >
            <Plus className="size-4" />
            <span>Nuevo Release</span>
          </Button>
        )}
      </div>

      {loading ? (
        <div className="flex flex-col items-center justify-center p-20 text-slate-400">
          <Loader2 className="size-8 animate-spin text-indigo-600 mb-2" />
          <p className="text-sm">Cargando versiones y releases...</p>
        </div>
      ) : releases.length === 0 ? (
        <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
          <Rocket className="size-10 text-slate-300 mb-3" />
          <h3 className="font-semibold text-slate-700 text-base">No hay releases en este proyecto</h3>
          <p className="text-sm text-slate-500 max-w-sm mt-1">
            Empaqueta entregables, vincula work items y genera notas de versión estructuradas automáticamente.
          </p>
          {isAdmin && (
            <Button onClick={() => setOpenCreateModal(true)} className="mt-4 bg-indigo-600 text-white text-xs">
              <Plus className="size-4 mr-1.5" /> Crear Release
            </Button>
          )}
        </div>
      ) : (
        <div className="space-y-4">
          {releases.map((rel) => {
            const isPublished = rel.status === "PUBLISHED";
            const itemCount = Array.isArray(rel.work_items) ? rel.work_items.length : 0;

            return (
              <div
                key={rel.id}
                className={cn(
                  "p-5 rounded-xl border transition-all bg-white flex flex-col md:flex-row md:items-start justify-between gap-5 shadow-xs hover:border-slate-300",
                  isPublished && "border-emerald-200/80 bg-emerald-50/20"
                )}
              >
                <div className="space-y-2 flex-1 min-w-0">
                  <div className="flex flex-wrap items-center gap-2.5">
                    <span className="inline-flex items-center gap-1 font-mono text-xs font-bold px-2.5 py-1 rounded-md bg-indigo-50 text-indigo-700 border border-indigo-100">
                      <Tag className="size-3" />
                      {rel.version}
                    </span>
                    <h3 className="text-base font-bold text-slate-900 truncate">{rel.name}</h3>

                    {isPublished ? (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200 px-2 py-0.5 rounded-full">
                        <CheckCircle2 className="size-3 text-emerald-600" />
                        Publicado
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 text-[11px] font-semibold bg-amber-50 text-amber-700 border border-amber-200 px-2 py-0.5 rounded-full">
                        <Clock className="size-3 text-amber-600" />
                        Borrador
                      </span>
                    )}
                  </div>

                  {rel.description && (
                    <p className="text-xs text-slate-600 leading-relaxed">{rel.description}</p>
                  )}

                  <div className="flex flex-wrap items-center gap-4 text-xs text-slate-400 pt-1">
                    <div className="flex items-center gap-1.5">
                      <FileText className="size-3.5 text-slate-400" />
                      <span className="font-medium text-slate-600">{itemCount} items incluidos</span>
                    </div>

                    {isPublished && rel.published_at && (
                      <div className="flex items-center gap-1.5 text-emerald-700">
                        <Calendar className="size-3.5" />
                        <span>Publicado el {new Date(rel.published_at).toLocaleDateString()}</span>
                      </div>
                    )}
                  </div>

                  {/* Changelog preview snippet if available */}
                  {rel.changelog && (
                    <div className="mt-3 p-3 rounded-lg bg-slate-50 border border-slate-200/80 text-xs font-mono text-slate-700 line-clamp-3 whitespace-pre-line">
                      {rel.changelog}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center gap-2 shrink-0 pt-2 md:pt-0 self-end md:self-center">
                  {(isPublished || isAdmin) && (
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleOpenPublishModal(rel)}
                      className="h-8 text-xs font-semibold gap-1.5 border-slate-200 text-slate-700 hover:text-indigo-600 hover:border-indigo-200"
                    >
                      <Sparkles className="size-3.5 text-indigo-600" />
                      <span>{isPublished ? "Ver Changelog" : "Publicar / Changelog"}</span>
                    </Button>
                  )}

                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDelete(rel.id)}
                      className="size-8 text-slate-400 hover:text-red-600 cursor-pointer"
                    >
                      <Trash2 className="size-4" />
                    </Button>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Modal Crear Release */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Rocket className="size-5 text-indigo-600" />
              Nuevo Release
            </DialogTitle>
            <DialogDescription>
              Crea una nueva versión para el proyecto {project?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreate} className="space-y-4 py-2">
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div className="space-y-1.5">
                <Label htmlFor="rel-version">Versión *</Label>
                <Input
                  id="rel-version"
                  placeholder="Ej. v1.2.0"
                  value={version}
                  onChange={(e) => setVersion(e.target.value)}
                  required
                />
              </div>

              <div className="space-y-1.5">
                <Label htmlFor="rel-name">Nombre de Versión *</Label>
                <Input
                  id="rel-name"
                  placeholder="Ej. Lanzamiento Q3"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  required
                />
              </div>
            </div>

            <div className="space-y-1.5">
              <Label htmlFor="rel-desc">Descripción (Opcional)</Label>
              <Textarea
                id="rel-desc"
                placeholder="Resumen del alcance o cambios destacados..."
                value={description}
                onChange={(e) => setDescription(e.target.value)}
                rows={2}
              />
            </div>

            <div className="space-y-1.5">
              <Label>Vincular Work Items a esta Versión</Label>
              <div className="flex flex-col gap-1 p-2 bg-slate-50 border border-slate-200 rounded-lg max-h-44 overflow-y-auto">
                {availableItems.length === 0 ? (
                  <p className="text-xs text-slate-400 p-2">No hay work items en este proyecto.</p>
                ) : (
                  availableItems.map((item) => {
                    const isSelected = selectedItemIds.includes(String(item.id));
                    return (
                      <div
                        key={item.id}
                        onClick={() => {
                          setSelectedItemIds((prev) =>
                            isSelected ? prev.filter((id) => id !== String(item.id)) : [...prev, String(item.id)]
                          );
                        }}
                        className={cn(
                          "flex items-center justify-between p-1.5 rounded text-xs cursor-pointer transition-colors",
                          isSelected ? "bg-indigo-50 text-indigo-900 font-semibold" : "hover:bg-slate-100/70 text-slate-700"
                        )}
                      >
                        <div className="flex items-center gap-2 truncate">
                          <span className="font-mono text-[10px] text-slate-500">{item.identifier}</span>
                          <span className="truncate">{item.title}</span>
                        </div>
                        {isSelected && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                      </div>
                    );
                  })
                )}
              </div>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" disabled={isSubmitting} className="bg-indigo-600 hover:bg-indigo-500 text-white">
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Guardar Release
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal Publicar Changelog */}
      <ReleasePublishModal
        release={selectedReleaseForPublish}
        open={openPublishModal}
        onOpenChange={setOpenPublishModal}
        onPublished={handlePublishedSuccess}
      />
    </div>
  );
}
