"use client";

import React, { useState, useEffect } from "react";
import { SavedView } from "@/types/plane-types";
import { viewService } from "@/services/plane/viewService";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
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
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Bookmark, Plus, Trash2, Check, RotateCcw, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface SavedViewsBarProps {
  projectId: string | number;
  currentLayout: "kanban" | "list" | "calendar" | "gantt";
  currentGroupBy: "state" | "priority";
  currentPriority: string;
  currentType: string;
  currentSearch: string;
  onApplyView: (view: SavedView) => void;
  onResetView: () => void;
}

export function SavedViewsBar({
  projectId,
  currentLayout,
  currentGroupBy,
  currentPriority,
  currentType,
  currentSearch,
  onApplyView,
  onResetView,
}: SavedViewsBarProps) {
  const [savedViews, setSavedViews] = useState<SavedView[]>([]);
  const [activeViewId, setActiveViewId] = useState<string | number | null>(null);
  const [loading, setLoading] = useState(false);

  // Create Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [viewName, setViewName] = useState("");
  const [viewDescription, setViewDescription] = useState("");
  const [isSubmitting, setIsSubmitting] = useState(false);

  const fetchViews = async () => {
    try {
      setLoading(true);
      const data = await viewService.list(projectId);
      setSavedViews(data);
    } catch (err) {
      console.error("Error loading saved views:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (projectId) {
      fetchViews();
    }
  }, [projectId]);

  const handleSaveCurrentView = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!viewName.trim()) return;

    setIsSubmitting(true);
    try {
      const created = await viewService.create(projectId, {
        name: viewName.trim(),
        description: viewDescription.trim() || undefined,
        filters: {
          priority: currentPriority,
          type_id: currentType,
          search: currentSearch,
        },
        display_filters: {
          layout: currentLayout,
          group_by: currentGroupBy,
        },
      });

      toast.success(`Vista "${created.name}" guardada (privada para ti)`);
      setViewName("");
      setViewDescription("");
      setModalOpen(false);
      await fetchViews();
      setActiveViewId(created.id);
    } catch (err: any) {
      toast.error("Error al guardar la vista");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDeleteView = async (viewId: string | number, e: React.MouseEvent) => {
    e.stopPropagation();
    try {
      await viewService.delete(viewId);
      toast.success("Vista eliminada");
      if (activeViewId === viewId) {
        setActiveViewId(null);
        onResetView();
      }
      setSavedViews((prev) => prev.filter((v) => String(v.id) !== String(viewId)));
    } catch (err) {
      toast.error("Error al eliminar la vista");
    }
  };

  const handleSelectView = (view: SavedView) => {
    setActiveViewId(view.id);
    onApplyView(view);
    toast.info(`Vista aplicada: ${view.name}`);
  };

  const handleReset = () => {
    setActiveViewId(null);
    onResetView();
    toast.info("Filtros restablecidos a la vista predeterminada");
  };

  return (
    <div className="flex items-center gap-2">
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button variant="outline" size="sm" className="h-9 gap-1.5 text-xs font-semibold bg-white border-slate-200">
            <Bookmark className="size-3.5 text-indigo-600" />
            <span>
              {activeViewId
                ? savedViews.find((v) => String(v.id) === String(activeViewId))?.name || "Vistas"
                : "Vistas Guardadas"}
            </span>
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-56">
          <DropdownMenuLabel className="text-xs text-slate-500 font-semibold uppercase tracking-wider">
            Mis Vistas Privadas ({savedViews.length})
          </DropdownMenuLabel>
          <DropdownMenuSeparator />

          {loading ? (
            <div className="flex items-center justify-center p-3 text-xs text-slate-400">
              <Loader2 className="size-3.5 animate-spin mr-1.5" /> Cargando...
            </div>
          ) : savedViews.length === 0 ? (
            <div className="p-3 text-center text-xs text-slate-400">
              No tienes vistas guardadas en este proyecto.
            </div>
          ) : (
            savedViews.map((view) => (
              <DropdownMenuItem
                key={view.id}
                onClick={() => handleSelectView(view)}
                className="flex items-center justify-between text-xs cursor-pointer group"
              >
                <div className="flex items-center gap-2 truncate">
                  {String(activeViewId) === String(view.id) ? (
                    <Check className="size-3 text-indigo-600 shrink-0" />
                  ) : (
                    <Bookmark className="size-3 text-slate-400 shrink-0" />
                  )}
                  <span className="truncate font-medium text-slate-700">{view.name}</span>
                </div>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={(e) => handleDeleteView(view.id, e)}
                  className="size-5 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
                  title="Eliminar vista"
                >
                  <Trash2 className="size-3" />
                </Button>
              </DropdownMenuItem>
            ))
          )}

          <DropdownMenuSeparator />
          {activeViewId && (
            <DropdownMenuItem onClick={handleReset} className="text-xs text-slate-600 cursor-pointer">
              <RotateCcw className="size-3.5 mr-2" />
              Restablecer filtros
            </DropdownMenuItem>
          )}
          <DropdownMenuItem onClick={() => setModalOpen(true)} className="text-xs text-indigo-600 font-medium cursor-pointer">
            <Plus className="size-3.5 mr-2" />
            Guardar vista actual...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <Button
        variant="ghost"
        size="sm"
        onClick={() => setModalOpen(true)}
        className="h-9 px-2 text-xs text-slate-500 hover:text-indigo-600"
        title="Guardar filtros y diseño actual como una vista"
      >
        <Plus className="size-3.5 mr-1" />
        Guardar
      </Button>

      {/* Modal to Save View */}
      <Dialog open={modalOpen} onOpenChange={setModalOpen}>
        <DialogContent className="sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-lg font-bold">
              <Bookmark className="size-4 text-indigo-600" />
              Guardar Vista Actual
            </DialogTitle>
            <DialogDescription>
              Esta vista guardará tus filtros actuales (búsqueda, prioridad, tipo) y la disposición visual (layout y agrupación). Será privada únicamente para tu usuario.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleSaveCurrentView} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="view-name">Nombre de la vista *</Label>
              <Input
                id="view-name"
                placeholder="Ej. Tareas Urgentes de Sprint"
                value={viewName}
                onChange={(e) => setViewName(e.target.value)}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="view-desc">Descripción (Opcional)</Label>
              <Input
                id="view-desc"
                placeholder="Ej. Tareas de alta prioridad agrupadas para revisión diaria"
                value={viewDescription}
                onChange={(e) => setViewDescription(e.target.value)}
              />
            </div>

            <div className="p-3 bg-slate-50 border border-slate-100 rounded-lg text-xs space-y-1 text-slate-600">
              <p className="font-semibold text-slate-700">Configuración a almacenar:</p>
              <p>• Layout: <span className="font-mono text-indigo-600 font-bold uppercase">{currentLayout}</span></p>
              <p>• Agrupación: <span className="font-mono text-indigo-600 font-bold uppercase">{currentGroupBy}</span></p>
              <p>• Filtros: Prioridad: {currentPriority}, Tipo: {currentType}</p>
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setModalOpen(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Guardar Vista
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>
    </div>
  );
}
