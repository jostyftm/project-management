"use client";

import React, { useState, useEffect, useCallback } from "react";
import {
  WorkItemDeliverable,
  WorkItemDodItem,
  DeliverableType,
  DeliverableStatus,
} from "@/types/deliverable-types";
import { workItemDeliverableService } from "@/services/plane/workItemDeliverableService";
import {
  Rocket,
  GitPullRequest,
  Palette,
  FileText,
  FlaskConical,
  ExternalLink,
  Download,
  Plus,
  Trash2,
  CheckCircle2,
  AlertCircle,
  Clock,
  Check,
  X,
  FileCode,
  ShieldCheck,
  MessageSquare,
  Upload,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";

interface Props {
  projectId: string | number;
  workItemId: string | number;
  isAdmin?: boolean;
}

export function WorkItemDeliverablesSection({
  projectId,
  workItemId,
  isAdmin = false,
}: Props) {
  const [deliverables, setDeliverables] = useState<WorkItemDeliverable[]>([]);
  const [dodItems, setDodItems] = useState<WorkItemDodItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // Form states for new deliverable
  const [isAddModalOpen, setIsAddModalOpen] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newType, setNewType] = useState<DeliverableType>("PREVIEW_URL");
  const [newUrl, setNewUrl] = useState("");
  const [newFile, setNewFile] = useState<File | null>(null);
  const [newDescription, setNewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Review modal state
  const [reviewModalOpen, setReviewModalOpen] = useState(false);
  const [selectedDeliverable, setSelectedDeliverable] = useState<WorkItemDeliverable | null>(null);
  const [reviewStatus, setReviewStatus] = useState<DeliverableStatus>("APPROVED");
  const [reviewNotes, setReviewNotes] = useState("");
  const [isReviewing, setIsReviewing] = useState(false);

  // New DoD item state
  const [newDodTitle, setNewDodTitle] = useState("");
  const [isAddingDod, setIsAddingDod] = useState(false);

  const loadData = useCallback(async () => {
    try {
      setIsLoading(true);
      const res = await workItemDeliverableService.list(projectId, workItemId);
      setDeliverables(res.deliverables);
      setDodItems(res.dod_items);
    } catch (err) {
      console.error("Error loading deliverables:", err);
    } finally {
      setIsLoading(false);
    }
  }, [projectId, workItemId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleCreateDeliverable = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) {
      toast.error("Por favor ingresa un título para el entregable.");
      return;
    }

    try {
      setIsSubmitting(true);
      const created = await workItemDeliverableService.create(projectId, workItemId, {
        title: newTitle.trim(),
        type: newType,
        url: newUrl.trim() || undefined,
        file: newFile,
        description: newDescription.trim() || undefined,
      });

      setDeliverables((prev) => [created, ...prev]);
      setIsAddModalOpen(false);
      setNewTitle("");
      setNewUrl("");
      setNewFile(null);
      setNewDescription("");
      toast.success("Entregable registrado exitosamente.");
    } catch (err) {
      console.error("Error creating deliverable:", err);
      toast.error("Error al registrar el entregable.");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteDeliverable = async (id: number) => {
    try {
      await workItemDeliverableService.delete(projectId, workItemId, id);
      setDeliverables((prev) => prev.filter((d) => d.id !== id));
      toast.success("Entregable eliminado.");
    } catch (err) {
      console.error("Error deleting deliverable:", err);
      toast.error("No se pudo eliminar el entregable.");
    }
  };

  const handleOpenReview = (del: WorkItemDeliverable, status: DeliverableStatus) => {
    setSelectedDeliverable(del);
    setReviewStatus(status);
    setReviewNotes(del.review_notes || "");
    setReviewModalOpen(true);
  };

  const handleSubmitReview = async () => {
    if (!selectedDeliverable) return;
    try {
      setIsReviewing(true);
      const updated = await workItemDeliverableService.review(
        projectId,
        workItemId,
        selectedDeliverable.id,
        {
          status: reviewStatus,
          review_notes: reviewNotes.trim() || undefined,
        }
      );

      setDeliverables((prev) =>
        prev.map((d) => (d.id === updated.id ? updated : d))
      );
      setReviewModalOpen(false);
      toast.success(
        reviewStatus === "APPROVED"
          ? "Entregable certificado y aprobado."
          : "Entregable marcado con observaciones."
      );
    } catch (err) {
      console.error("Error reviewing deliverable:", err);
      toast.error("Error al guardar la revisión.");
    } finally {
      setIsReviewing(false);
    }
  };

  const handleCreateDod = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newDodTitle.trim()) return;

    try {
      setIsAddingDod(true);
      const item = await workItemDeliverableService.createDod(
        projectId,
        workItemId,
        newDodTitle.trim()
      );
      setDodItems((prev) => [...prev, item]);
      setNewDodTitle("");
    } catch (err) {
      console.error("Error creating DoD item:", err);
      toast.error("Error al añadir criterio DoD.");
    } finally {
      setIsAddingDod(false);
    }
  };

  const handleToggleDod = async (id: number) => {
    try {
      const updated = await workItemDeliverableService.toggleDod(projectId, workItemId, id);
      setDodItems((prev) => prev.map((item) => (item.id === id ? updated : item)));
    } catch (err) {
      console.error("Error toggling DoD item:", err);
    }
  };

  const handleDeleteDod = async (id: number) => {
    try {
      await workItemDeliverableService.deleteDod(projectId, workItemId, id);
      setDodItems((prev) => prev.filter((item) => item.id !== id));
    } catch (err) {
      console.error("Error deleting DoD item:", err);
    }
  };

  const getTypeIcon = (type: DeliverableType) => {
    switch (type) {
      case "PREVIEW_URL":
        return <Rocket className="size-4 text-blue-500" />;
      case "PULL_REQUEST":
        return <GitPullRequest className="size-4 text-purple-500" />;
      case "DESIGN":
        return <Palette className="size-4 text-pink-500" />;
      case "DOCUMENT":
        return <FileText className="size-4 text-emerald-500" />;
      case "QA_EVIDENCE":
        return <FlaskConical className="size-4 text-amber-500" />;
      default:
        return <FileCode className="size-4 text-slate-500" />;
    }
  };

  const getTypeLabel = (type: DeliverableType) => {
    switch (type) {
      case "PREVIEW_URL":
        return "Entorno / Staging";
      case "PULL_REQUEST":
        return "Pull Request / Git";
      case "DESIGN":
        return "Diseño / Figma";
      case "DOCUMENT":
        return "Documento / Spec";
      case "QA_EVIDENCE":
        return "Evidencia QA";
      default:
        return "Entregable";
    }
  };

  const approvedCount = deliverables.filter((d) => d.status === "APPROVED").length;
  const completedDodCount = dodItems.filter((i) => i.is_completed).length;

  return (
    <div className="space-y-6 pt-2">
      {/* Resumen Superior de Certificación */}
      <div className="p-4 rounded-xl border border-slate-200 dark:border-neutral-800 bg-slate-50/50 dark:bg-neutral-900/40 flex flex-wrap items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-5 text-indigo-600" />
            <h4 className="text-sm font-semibold text-slate-900 dark:text-slate-100">
              Certificación de Entregables & Definition of Done
            </h4>
          </div>
          <p className="text-xs text-slate-500 dark:text-slate-400 mt-1">
            {deliverables.length} entregables registrados ({approvedCount} aprobados) •{" "}
            {dodItems.length} criterios DoD ({completedDodCount} cumplidos)
          </p>
        </div>

        <Button
          onClick={() => setIsAddModalOpen(true)}
          size="sm"
          className="text-xs gap-1.5 bg-indigo-600 hover:bg-indigo-700 text-white"
        >
          <Plus className="size-3.5" />
          <span>Añadir Entregable</span>
        </Button>
      </div>

      {/* Lista de Entregables Registrados */}
      <div className="space-y-3">
        <div className="flex items-center justify-between">
          <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
            Artefactos & Evidencias ({deliverables.length})
          </h5>
          <span className="text-[11px] text-slate-400">
            URLs de prueba, PRs de código y documentación
          </span>
        </div>

        {isLoading ? (
          <div className="space-y-2">
            {[1, 2].map((i) => (
              <div
                key={i}
                className="h-20 bg-slate-100 dark:bg-neutral-800 rounded-xl animate-pulse"
              />
            ))}
          </div>
        ) : deliverables.length === 0 ? (
          <div className="p-6 rounded-xl border border-dashed border-slate-200 dark:border-neutral-800 text-center space-y-2 bg-white dark:bg-neutral-900">
            <div className="p-2.5 rounded-full bg-slate-50 dark:bg-neutral-800 w-fit mx-auto text-slate-400">
              <Upload className="size-5" />
            </div>
            <p className="text-xs font-medium text-slate-700 dark:text-slate-300">
              Sin entregables registrados para esta historia
            </p>
            <p className="text-[11px] text-slate-400 max-w-sm mx-auto">
              Sube evidencias de QA, URLs de staging o enlaces a Pull Requests para que el equipo certifique la entrega.
            </p>
          </div>
        ) : (
          <div className="space-y-2.5">
            {deliverables.map((del) => {
              const targetUrl = del.url || del.file_url;
              return (
                <div
                  key={del.id}
                  className="p-3.5 rounded-xl border border-slate-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 space-y-2 shadow-2xs hover:border-slate-300 transition-colors"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div className="flex items-start gap-2.5 min-w-0">
                      <div className="p-1.5 rounded-lg bg-slate-50 dark:bg-neutral-800 border border-slate-100 dark:border-neutral-800 shrink-0 mt-0.5">
                        {getTypeIcon(del.type)}
                      </div>
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="font-semibold text-xs text-slate-900 dark:text-slate-100 truncate">
                            {del.title}
                          </span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-neutral-800 text-slate-600 dark:text-slate-400 font-medium shrink-0">
                            {getTypeLabel(del.type)}
                          </span>
                        </div>
                        {del.description && (
                          <p className="text-xs text-slate-600 dark:text-slate-400 mt-0.5">
                            {del.description}
                          </p>
                        )}
                        <div className="flex items-center gap-3 text-[11px] text-slate-400 mt-1">
                          <span>Por {del.creator?.name || "Autor"}</span>
                          {del.file_name && <span>• {del.file_name}</span>}
                          {del.file_size && (
                            <span>• {Math.round(del.file_size / 1024)} KB</span>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Status Badge */}
                    <div className="flex items-center gap-2 shrink-0">
                      {del.status === "APPROVED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-emerald-50 text-emerald-700 dark:bg-emerald-950/40 dark:text-emerald-400 border border-emerald-200 dark:border-emerald-800">
                          <CheckCircle2 className="size-3 text-emerald-600" />
                          Aprobado
                        </span>
                      ) : del.status === "REJECTED" ? (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-rose-50 text-rose-700 dark:bg-rose-950/40 dark:text-rose-400 border border-rose-200 dark:border-rose-800">
                          <AlertCircle className="size-3 text-rose-600" />
                          Observaciones
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[11px] font-semibold bg-amber-50 text-amber-700 dark:bg-amber-950/40 dark:text-amber-400 border border-amber-200 dark:border-amber-800">
                          <Clock className="size-3 text-amber-600" />
                          En Revisión
                        </span>
                      )}
                    </div>
                  </div>

                  {/* Observaciones de revisión si las hay */}
                  {del.review_notes && (
                    <div className="p-2 rounded-lg bg-slate-50 dark:bg-neutral-800/60 border border-slate-100 dark:border-neutral-800 text-[11px] text-slate-600 dark:text-slate-300 flex items-start gap-1.5">
                      <MessageSquare className="size-3 text-slate-400 shrink-0 mt-0.5" />
                      <div>
                        <span className="font-semibold text-slate-800 dark:text-slate-200">
                          Revisado por {del.reviewer?.name || "Revisor"}:
                        </span>{" "}
                        {del.review_notes}
                      </div>
                    </div>
                  )}

                  {/* Barra de Acciones */}
                  <div className="pt-2 border-t border-slate-100 dark:border-neutral-800 flex items-center justify-between text-xs">
                    <div>
                      {targetUrl && (
                        <a
                          href={targetUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-1 text-indigo-600 dark:text-indigo-400 hover:underline font-medium text-xs"
                        >
                          {del.file_path ? (
                            <>
                              <Download className="size-3" />
                              <span>Descargar archivo</span>
                            </>
                          ) : (
                            <>
                              <ExternalLink className="size-3" />
                              <span>Abrir recurso</span>
                            </>
                          )}
                        </a>
                      )}
                    </div>

                    <div className="flex items-center gap-1.5">
                      {/* Acciones de Certificación (Para Admin o QA) */}
                      {isAdmin && (
                        <>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReview(del, "APPROVED")}
                            className="h-7 px-2 text-[11px] text-emerald-700 hover:text-emerald-800 hover:bg-emerald-50"
                          >
                            <Check className="size-3 mr-1" />
                            Aprobar
                          </Button>
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleOpenReview(del, "REJECTED")}
                            className="h-7 px-2 text-[11px] text-amber-700 hover:text-amber-800 hover:bg-amber-50"
                          >
                            <AlertCircle className="size-3 mr-1" />
                            Observar
                          </Button>
                        </>
                      )}

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteDeliverable(del.id)}
                        className="size-7 text-slate-400 hover:text-rose-600"
                      >
                        <Trash2 className="size-3.5" />
                      </Button>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>

      {/* Sección Definition of Done (DoD) */}
      <div className="space-y-3 pt-3 border-t border-slate-100 dark:border-neutral-800">
        <div className="flex items-center justify-between">
          <div>
            <h5 className="text-xs font-semibold text-slate-700 dark:text-slate-300 uppercase tracking-wider">
              Definition of Done (DoD) & Criterios de Calidad
            </h5>
            <p className="text-[11px] text-slate-400">
              Checklist que certifica el cumplimiento de los estándares de entrega
            </p>
          </div>
          <span className="text-xs font-bold text-indigo-600 bg-indigo-50 dark:bg-indigo-950/40 px-2 py-0.5 rounded-full border border-indigo-200 dark:border-indigo-800">
            {completedDodCount} / {dodItems.length} listos
          </span>
        </div>

        {/* Formulario rápido para añadir criterio DoD */}
        <form onSubmit={handleCreateDod} className="flex gap-2">
          <Input
            value={newDodTitle}
            onChange={(e) => setNewDodTitle(e.target.value)}
            placeholder="Añadir criterio (ej. Pruebas unitarias al 90%, desplegado en staging)..."
            className="text-xs h-8 bg-white dark:bg-neutral-900"
          />
          <Button
            type="submit"
            size="sm"
            disabled={isAddingDod || !newDodTitle.trim()}
            className="h-8 text-xs bg-slate-900 dark:bg-slate-100 text-white dark:text-slate-900"
          >
            Añadir
          </Button>
        </form>

        {/* Lista de criterios DoD */}
        <div className="space-y-1.5">
          {dodItems.map((item) => (
            <div
              key={item.id}
              className={cn(
                "flex items-center justify-between p-2.5 rounded-lg border text-xs transition-colors group",
                item.is_completed
                  ? "bg-emerald-50/40 dark:bg-emerald-950/20 border-emerald-200 dark:border-emerald-800/60"
                  : "bg-white dark:bg-neutral-900 border-slate-200 dark:border-neutral-800"
              )}
            >
              <div
                className="flex items-center gap-2.5 flex-1 cursor-pointer"
                onClick={() => handleToggleDod(item.id)}
              >
                <div
                  className={cn(
                    "size-4 rounded border flex items-center justify-center transition-colors",
                    item.is_completed
                      ? "bg-emerald-600 border-emerald-600 text-white"
                      : "border-slate-300 dark:border-neutral-700 bg-white dark:bg-neutral-800"
                  )}
                >
                  {item.is_completed && <Check className="size-3" />}
                </div>
                <div>
                  <span
                    className={cn(
                      "font-medium",
                      item.is_completed
                        ? "line-through text-slate-500 dark:text-slate-400"
                        : "text-slate-800 dark:text-slate-200"
                    )}
                  >
                    {item.title}
                  </span>
                  {item.completed_by && (
                    <span className="block text-[10px] text-slate-400">
                      Validado por {item.completed_by.name}
                    </span>
                  )}
                </div>
              </div>

              <Button
                variant="ghost"
                size="icon"
                onClick={() => handleDeleteDod(item.id)}
                className="size-6 text-slate-300 hover:text-rose-600 opacity-0 group-hover:opacity-100 transition-opacity"
              >
                <Trash2 className="size-3" />
              </Button>
            </div>
          ))}
        </div>
      </div>

      {/* Modal para Crear Entregable */}
      <Dialog open={isAddModalOpen} onOpenChange={setIsAddModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 z-[80]" overlayClassName="z-[80]">
          <form onSubmit={handleCreateDeliverable}>
            <DialogHeader>
              <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
                Registrar Nuevo Entregable
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Añade el enlace o archivo que evidencia el cumplimiento de esta historia.
              </DialogDescription>
            </DialogHeader>

            <div className="space-y-3.5 py-4 text-xs">
              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Tipo de Entregable
                </label>
                <Select
                  value={newType}
                  onValueChange={(val) => setNewType(val as DeliverableType)}
                >
                  <SelectTrigger className="h-8 text-xs">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="PREVIEW_URL">🚀 Enlace de Staging / Preview</SelectItem>
                    <SelectItem value="PULL_REQUEST">🔀 Pull Request / Código</SelectItem>
                    <SelectItem value="DESIGN">🎨 Prototipo / Figma</SelectItem>
                    <SelectItem value="DOCUMENT">📄 Documento Técnico (PDF/Doc)</SelectItem>
                    <SelectItem value="QA_EVIDENCE">🧪 Evidencia de Pruebas QA</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Título del Entregable
                </label>
                <Input
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  placeholder="Ej. Despliegue en Staging v1.2, PR #42 en GitHub"
                  className="text-xs h-8"
                  required
                />
              </div>

              {/* Si es tipo documento o evidencia QA, permite subir archivo */}
              {(newType === "DOCUMENT" || newType === "QA_EVIDENCE") && (
                <div>
                  <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                    Archivo Adjunto (Opcional si usas URL)
                  </label>
                  <Input
                    type="file"
                    onChange={(e) => setNewFile(e.target.files?.[0] || null)}
                    className="text-xs h-8 cursor-pointer"
                  />
                </div>
              )}

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  URL / Enlace Externo {newFile ? "(Opcional)" : "(Requerido si no subes archivo)"}
                </label>
                <Input
                  type="url"
                  value={newUrl}
                  onChange={(e) => setNewUrl(e.target.value)}
                  placeholder="https://..."
                  className="text-xs h-8"
                />
              </div>

              <div>
                <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                  Notas de Entrega / Instrucciones de Prueba
                </label>
                <Textarea
                  value={newDescription}
                  onChange={(e) => setNewDescription(e.target.value)}
                  placeholder="Observaciones para el revisor o credenciales de prueba..."
                  rows={3}
                  className="text-xs resize-none"
                />
              </div>
            </div>

            <DialogFooter className="gap-2">
              <Button
                type="button"
                variant="outline"
                size="sm"
                onClick={() => setIsAddModalOpen(false)}
                className="text-xs"
              >
                Cancelar
              </Button>
              <Button
                type="submit"
                size="sm"
                disabled={isSubmitting || (!newUrl.trim() && !newFile)}
                className="text-xs bg-indigo-600 hover:bg-indigo-700 text-white"
              >
                {isSubmitting ? "Guardando..." : "Guardar Entregable"}
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Modal para Revisar Entregable (Aprobar / Rechazar) */}
      <Dialog open={reviewModalOpen} onOpenChange={setReviewModalOpen}>
        <DialogContent className="sm:max-w-md bg-white dark:bg-neutral-900 z-[80]" overlayClassName="z-[80]">
          <DialogHeader>
            <DialogTitle className="text-base font-bold text-slate-900 dark:text-slate-100">
              {reviewStatus === "APPROVED"
                ? "Aprobar y Certificar Entregable"
                : "Solicitar Ajustes u Observaciones"}
            </DialogTitle>
            <DialogDescription className="text-xs text-slate-500">
              {selectedDeliverable?.title}
            </DialogDescription>
          </DialogHeader>

          <div className="space-y-3 py-3 text-xs">
            <div>
              <label className="font-semibold text-slate-700 dark:text-slate-300 block mb-1">
                Observaciones del Revisor (Feedback)
              </label>
              <Textarea
                value={reviewNotes}
                onChange={(e) => setReviewNotes(e.target.value)}
                placeholder={
                  reviewStatus === "APPROVED"
                    ? "Criterios validados conforme a lo requerido."
                    : "Detalla qué ajustes o pruebas adicionales son necesarias..."
                }
                rows={3}
                className="text-xs resize-none"
              />
            </div>
          </div>

          <DialogFooter className="gap-2">
            <Button
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setReviewModalOpen(false)}
              className="text-xs"
            >
              Cancelar
            </Button>
            <Button
              onClick={handleSubmitReview}
              size="sm"
              disabled={isReviewing}
              className={cn(
                "text-xs text-white",
                reviewStatus === "APPROVED"
                  ? "bg-emerald-600 hover:bg-emerald-700"
                  : "bg-amber-600 hover:bg-amber-700"
              )}
            >
              {isReviewing
                ? "Guardando..."
                : reviewStatus === "APPROVED"
                ? "Certificar Aprobación"
                : "Guardar Observaciones"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
