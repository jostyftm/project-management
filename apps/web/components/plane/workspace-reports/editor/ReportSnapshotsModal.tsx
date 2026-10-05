"use client";

import React, { useState, useEffect, useCallback } from "react";
import { ReportSnapshot } from "@/types/workspace-report-types";
import { workspaceReportService } from "@/services/plane/workspace-report-service";
import {
  History,
  X,
  Plus,
  RotateCcw,
  Trash2,
  Calendar,
  Layers,
  FileText,
  Loader2,
  CheckCircle2,
  AlertTriangle,
} from "lucide-react";
import { toast } from "sonner";

interface ReportSnapshotsModalProps {
  isOpen: boolean;
  onClose: () => void;
  workspaceId: string | number;
  reportId: string | number;
  onRestoreSnapshot: (snapshotId: string | number) => Promise<void>;
}

export function ReportSnapshotsModal({
  isOpen,
  onClose,
  workspaceId,
  reportId,
  onRestoreSnapshot,
}: ReportSnapshotsModalProps) {
  const [snapshots, setSnapshots] = useState<ReportSnapshot[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isRestoringId, setIsRestoringId] = useState<string | number | null>(null);

  const [showCreateForm, setShowCreateForm] = useState(false);
  const [title, setTitle] = useState("");
  const [note, setNote] = useState("");

  const loadSnapshots = useCallback(async () => {
    if (!isOpen || !workspaceId || !reportId) return;
    setIsLoading(true);
    try {
      const data = await workspaceReportService.listSnapshots(workspaceId, reportId);
      setSnapshots(data);
    } catch (e) {
      console.error(e);
      toast.error("Error al cargar versiones del reporte");
    } finally {
      setIsLoading(false);
    }
  }, [isOpen, workspaceId, reportId]);

  useEffect(() => {
    if (isOpen) {
      loadSnapshots();
    }
  }, [isOpen, loadSnapshots]);

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!title.trim()) return;

    setIsCreating(true);
    try {
      const created = await workspaceReportService.createSnapshot(workspaceId, reportId, {
        title: title.trim(),
        note: note.trim() || undefined,
      });
      setSnapshots((prev) => [created, ...prev]);
      setTitle("");
      setNote("");
      setShowCreateForm(false);
      toast.success("Versión (snapshot) creada correctamente");
    } catch (e) {
      console.error(e);
      toast.error("Error al crear snapshot");
    } finally {
      setIsCreating(false);
    }
  };

  const handleDelete = async (snapshotId: string | number) => {
    if (!confirm("¿Deseas eliminar este snapshot del historial?")) return;
    try {
      await workspaceReportService.deleteSnapshot(workspaceId, reportId, snapshotId);
      setSnapshots((prev) => prev.filter((s) => s.id !== snapshotId));
      toast.success("Snapshot eliminado");
    } catch (e) {
      console.error(e);
      toast.error("Error al eliminar snapshot");
    }
  };

  const handleRestore = async (snapshot: ReportSnapshot) => {
    const confirmed = confirm(
      `¿Deseas restaurar la versión "${snapshot.title || 'Snapshot'}"? Se sobrescribirá el diseño y bloques actuales con esta versión.`
    );
    if (!confirmed) return;

    setIsRestoringId(snapshot.id);
    try {
      await onRestoreSnapshot(snapshot.id);
      toast.success("Reporte restaurado a la versión seleccionada");
      onClose();
    } catch (e) {
      console.error(e);
      toast.error("Error al restaurar versión");
    } finally {
      setIsRestoringId(null);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-2xl max-w-xl w-full max-h-[85vh] flex flex-col shadow-2xl overflow-hidden">
        {/* Header */}
        <div className="px-6 py-4 border-b border-neutral-200 dark:border-neutral-800 flex items-center justify-between">
          <div className="flex items-center gap-2.5">
            <div className="w-8 h-8 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400 flex items-center justify-center">
              <History className="w-4 h-4" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-neutral-900 dark:text-neutral-100">
                Historial de Versiones (Snapshots)
              </h3>
              <p className="text-xs text-neutral-500 dark:text-neutral-400">
                Congela estados del reporte con sus datos resueltos para auditoría o restauración.
              </p>
            </div>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="p-1.5 text-neutral-400 hover:text-neutral-700 dark:hover:text-neutral-200 rounded-lg hover:bg-neutral-100 dark:hover:bg-neutral-800 transition-colors"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Content body */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {/* Top Actions / New Snapshot Button */}
          {!showCreateForm ? (
            <div className="flex items-center justify-between bg-neutral-50 dark:bg-neutral-800/40 p-3 rounded-xl border border-neutral-200/80 dark:border-neutral-800">
              <span className="text-xs text-neutral-600 dark:text-neutral-300">
                Guarda una instantánea inmutable del estado y datos actuales.
              </span>
              <button
                type="button"
                onClick={() => setShowCreateForm(true)}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-colors shrink-0 shadow-xs"
              >
                <Plus className="w-3.5 h-3.5" />
                Crear Snapshot
              </button>
            </div>
          ) : (
            <form
              onSubmit={handleCreate}
              className="bg-neutral-50 dark:bg-neutral-800/60 p-4 rounded-xl border border-indigo-200 dark:border-indigo-900/60 space-y-3"
            >
              <div className="flex items-center justify-between">
                <span className="text-xs font-bold text-neutral-900 dark:text-neutral-100">
                  Nuevo Snapshot
                </span>
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="text-neutral-400 hover:text-neutral-600 dark:hover:text-neutral-200 text-xs"
                >
                  Cancelar
                </button>
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nombre de la versión *
                </label>
                <input
                  type="text"
                  required
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  placeholder="Ej: Cierre Sprint 24, Presentación Directorio..."
                  className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
                  Nota / Observaciones (opcional)
                </label>
                <textarea
                  rows={2}
                  value={note}
                  onChange={(e) => setNote(e.target.value)}
                  placeholder="Notas de contexto, decisiones o conclusiones..."
                  className="w-full text-xs rounded-lg border border-neutral-200 dark:border-neutral-700 bg-white dark:bg-neutral-900 px-3 py-2 text-neutral-900 dark:text-neutral-100 focus:outline-none focus:ring-1 focus:ring-indigo-500"
                />
              </div>

              <div className="flex justify-end gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => setShowCreateForm(false)}
                  className="px-3 py-1.5 text-xs text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200/50 dark:hover:bg-neutral-800 rounded-lg transition-colors"
                >
                  Descartar
                </button>
                <button
                  type="submit"
                  disabled={isCreating || !title.trim()}
                  className="inline-flex items-center gap-1.5 px-3 py-1.5 text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white rounded-lg transition-colors disabled:opacity-50"
                >
                  {isCreating ? (
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  ) : (
                    <CheckCircle2 className="w-3.5 h-3.5" />
                  )}
                  Guardar Versión
                </button>
              </div>
            </form>
          )}

          {/* List of snapshots */}
          {isLoading ? (
            <div className="flex flex-col items-center justify-center py-12 text-neutral-400">
              <Loader2 className="w-6 h-6 animate-spin mb-2" />
              <span className="text-xs">Cargando snapshots...</span>
            </div>
          ) : snapshots.length === 0 ? (
            <div className="text-center py-12 px-4 border border-dashed border-neutral-200 dark:border-neutral-800 rounded-2xl">
              <History className="w-8 h-8 text-neutral-400 mx-auto mb-2 opacity-50" />
              <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
                Aún no hay versiones guardadas para este reporte.
              </p>
              <p className="text-[11px] text-neutral-400 dark:text-neutral-500 mt-1">
                Crea una versión para congelar los datos y poder restaurarla cuando lo necesites.
              </p>
            </div>
          ) : (
            <div className="space-y-3">
              {snapshots.map((item) => {
                const dateStr = item.created_at
                  ? new Date(item.created_at).toLocaleString()
                  : "Reciente";
                const blocksCount = Array.isArray(item.blocks_snapshot)
                  ? item.blocks_snapshot.length
                  : 0;

                return (
                  <div
                    key={item.id}
                    className="p-4 rounded-xl border border-neutral-200 dark:border-neutral-800 bg-white dark:bg-neutral-900 hover:border-neutral-300 dark:hover:border-neutral-700 transition-all flex flex-col gap-2.5 shadow-xs"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <h4 className="text-xs font-bold text-neutral-900 dark:text-neutral-100 flex items-center gap-1.5">
                          {item.title || "Snapshot sin título"}
                        </h4>
                        <div className="flex items-center gap-3 text-[11px] text-neutral-400 mt-1">
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3 h-3" />
                            {dateStr}
                          </span>
                          <span className="flex items-center gap-1">
                            <Layers className="w-3 h-3" />
                            {blocksCount} bloques
                          </span>
                          {item.creator?.name && (
                            <span>por {item.creator.name}</span>
                          )}
                        </div>
                      </div>

                      <div className="flex items-center gap-1 shrink-0">
                        <button
                          type="button"
                          onClick={() => handleRestore(item)}
                          disabled={isRestoringId === item.id}
                          className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold text-indigo-600 dark:text-indigo-400 hover:bg-indigo-50 dark:hover:bg-indigo-950/50 rounded-lg transition-colors disabled:opacity-50"
                          title="Restaurar este estado"
                        >
                          {isRestoringId === item.id ? (
                            <Loader2 className="w-3 h-3 animate-spin" />
                          ) : (
                            <RotateCcw className="w-3 h-3" />
                          )}
                          Restaurar
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(item.id)}
                          className="p-1 text-neutral-400 hover:text-red-600 dark:hover:text-red-400 rounded-lg hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors"
                          title="Eliminar snapshot"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </div>
                    </div>

                    {item.note && (
                      <div className="bg-neutral-50 dark:bg-neutral-800/40 p-2.5 rounded-lg text-xs text-neutral-600 dark:text-neutral-300 border border-neutral-100 dark:border-neutral-800">
                        <p className="line-clamp-3 leading-relaxed">{item.note}</p>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="px-6 py-3 border-t border-neutral-200 dark:border-neutral-800 bg-neutral-50/50 dark:bg-neutral-900/50 flex justify-end">
          <button
            type="button"
            onClick={onClose}
            className="px-4 py-1.5 text-xs font-medium text-neutral-700 dark:text-neutral-300 hover:bg-neutral-100 dark:hover:bg-neutral-800 rounded-xl transition-colors"
          >
            Cerrar
          </button>
        </div>
      </div>
    </div>
  );
}
