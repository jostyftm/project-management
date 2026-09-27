"use client";

import React, { useState, useEffect } from "react";
import { Sticky } from "@/types/plane-types";
import { stickyService } from "@/services/plane/stickyService";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import {
  Pin,
  Lock,
  Globe,
  Plus,
  Trash2,
  Palette,
  Sparkles,
  Check,
  Loader2,
  Filter,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const COLOR_STYLES = {
  yellow: {
    bg: "bg-amber-100",
    border: "border-amber-300",
    text: "text-amber-950",
    accent: "bg-amber-400",
    label: "Amarillo",
  },
  green: {
    bg: "bg-emerald-100",
    border: "border-emerald-300",
    text: "text-emerald-950",
    accent: "bg-emerald-400",
    label: "Verde",
  },
  blue: {
    bg: "bg-sky-100",
    border: "border-sky-300",
    text: "text-sky-950",
    accent: "bg-sky-400",
    label: "Azul",
  },
  pink: {
    bg: "bg-rose-100",
    border: "border-rose-300",
    text: "text-rose-950",
    accent: "bg-rose-400",
    label: "Rosa",
  },
  purple: {
    bg: "bg-purple-100",
    border: "border-purple-300",
    text: "text-purple-950",
    accent: "bg-purple-400",
    label: "Púrpura",
  },
};

export function StickiesBoard() {
  const [stickies, setStickies] = useState<Sticky[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<"all" | "pinned" | "private" | "workspace">("all");
  const [newColor, setNewColor] = useState<keyof typeof COLOR_STYLES>("yellow");

  const fetchStickies = async () => {
    try {
      setLoading(true);
      const data = await stickyService.list();
      setStickies(data);
    } catch (err) {
      console.error("Error loading stickies:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchStickies();
  }, []);

  const handleCreateSticky = async () => {
    try {
      const created = await stickyService.create({
        content: "Nueva nota adhesiva rápida...",
        color: newColor,
        is_private: false,
        is_pinned: false,
      });
      setStickies((prev) => [created, ...prev]);
      toast.success("Nota creada en el corcho");
    } catch (err) {
      toast.error("Error al crear la nota");
    }
  };

  const handleUpdateContent = async (stickyId: string | number, newContent: string) => {
    setStickies((prev) =>
      prev.map((s) => (String(s.id) === String(stickyId) ? { ...s, content: newContent } : s))
    );

    try {
      await stickyService.update(stickyId, { content: newContent });
    } catch (err) {
      toast.error("No se pudo guardar la nota");
    }
  };

  const handleTogglePin = async (stickyId: string | number) => {
    try {
      const updated = await stickyService.togglePin(stickyId);
      setStickies((prev) =>
        prev.map((s) => (String(s.id) === String(stickyId) ? updated : s))
      );
      toast.success(updated.is_pinned ? "Nota fijada" : "Nota desfijada");
    } catch (err) {
      toast.error("Error al fijar la nota");
    }
  };

  const handleTogglePrivacy = async (stickyId: string | number) => {
    try {
      const updated = await stickyService.togglePrivacy(stickyId);
      setStickies((prev) =>
        prev.map((s) => (String(s.id) === String(stickyId) ? updated : s))
      );
      toast.success(updated.is_private ? "Nota marcada como privada" : "Nota compartida en el workspace");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al cambiar privacidad");
    }
  };

  const handleChangeColor = async (stickyId: string | number, color: keyof typeof COLOR_STYLES) => {
    setStickies((prev) =>
      prev.map((s) => (String(s.id) === String(stickyId) ? { ...s, color } : s))
    );

    try {
      await stickyService.update(stickyId, { color });
    } catch (err) {
      toast.error("Error al cambiar color");
    }
  };

  const handleDelete = async (stickyId: string | number) => {
    try {
      await stickyService.delete(stickyId);
      setStickies((prev) => prev.filter((s) => String(s.id) !== String(stickyId)));
      toast.success("Nota eliminada");
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al eliminar");
    }
  };

  const filteredStickies = stickies.filter((s) => {
    if (filter === "pinned") return s.is_pinned;
    if (filter === "private") return s.is_private;
    if (filter === "workspace") return !s.is_private;
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Control Bar */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 bg-white p-3.5 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex items-center gap-1.5 flex-wrap">
          <Button
            variant={filter === "all" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("all")}
            className="text-xs h-8"
          >
            Todas ({stickies.length})
          </Button>
          <Button
            variant={filter === "pinned" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("pinned")}
            className="text-xs h-8"
          >
            <Pin className="size-3.5 mr-1" />
            Fijadas ({stickies.filter((s) => s.is_pinned).length})
          </Button>
          <Button
            variant={filter === "workspace" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("workspace")}
            className="text-xs h-8"
          >
            <Globe className="size-3.5 mr-1" />
            Workspace ({stickies.filter((s) => !s.is_private).length})
          </Button>
          <Button
            variant={filter === "private" ? "default" : "ghost"}
            size="sm"
            onClick={() => setFilter("private")}
            className="text-xs h-8"
          >
            <Lock className="size-3.5 mr-1" />
            Privadas ({stickies.filter((s) => s.is_private).length})
          </Button>
        </div>

        <div className="flex items-center gap-3">
          {/* Color preview for new sticky */}
          <div className="flex items-center gap-1 bg-slate-50 p-1 rounded-lg border border-slate-200">
            {(Object.keys(COLOR_STYLES) as (keyof typeof COLOR_STYLES)[]).map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => setNewColor(c)}
                className={cn(
                  "size-5 rounded-full transition-transform cursor-pointer",
                  COLOR_STYLES[c].accent,
                  newColor === c && "ring-2 ring-indigo-500 scale-110"
                )}
                title={COLOR_STYLES[c].label}
              />
            ))}
          </div>

          <Button
            onClick={handleCreateSticky}
            className="bg-indigo-600 hover:bg-indigo-500 text-white text-xs h-9 shadow-sm"
          >
            <Plus className="size-4 mr-1.5" />
            Nueva Nota
          </Button>
        </div>
      </div>

      {/* Visual Corkboard Canvas */}
      <div className="min-h-[550px] p-6 rounded-2xl border-4 border-amber-900/10 bg-[radial-gradient(#d4a373_1px,transparent_1px)] [background-size:16px_16px] bg-amber-50/40 shadow-inner">
        {loading ? (
          <div className="flex flex-col items-center justify-center p-24 text-slate-400">
            <Loader2 className="size-8 animate-spin text-amber-700 mb-2" />
            <p className="text-sm font-medium">Cargando notas del corcho...</p>
          </div>
        ) : filteredStickies.length === 0 ? (
          <div className="flex flex-col items-center justify-center p-20 text-center">
            <div className="p-3 bg-white/80 rounded-full shadow-sm mb-3">
              <Sparkles className="size-8 text-amber-600" />
            </div>
            <h3 className="font-bold text-slate-700 text-base">El corcho está vacío</h3>
            <p className="text-xs text-slate-500 max-w-sm mt-1">
              Crea notas rápidas, ideas de producto o recordatorios fijados para tu equipo o de uso personal.
            </p>
            <Button onClick={handleCreateSticky} className="mt-4 bg-amber-600 hover:bg-amber-500 text-white text-xs">
              <Plus className="size-4 mr-1.5" /> Crear Nota Post-it
            </Button>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-5">
            {filteredStickies.map((sticky) => {
              const style = COLOR_STYLES[sticky.color] || COLOR_STYLES.yellow;

              return (
                <div
                  key={sticky.id}
                  className={cn(
                    "group relative flex flex-col justify-between p-4 rounded-xl border shadow-sm hover:shadow-md transition-all duration-200 min-h-[180px]",
                    style.bg,
                    style.border,
                    style.text,
                    sticky.is_pinned && "ring-2 ring-amber-500/60 shadow-md"
                  )}
                >
                  {/* Sticky Header: Pin, Privacy badge, delete */}
                  <div className="flex items-center justify-between pb-2 mb-1 border-b border-black/5">
                    <div className="flex items-center gap-1.5">
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePin(sticky.id)}
                        className={cn(
                          "size-6 cursor-pointer",
                          sticky.is_pinned ? "text-red-600" : "text-slate-400 hover:text-slate-700"
                        )}
                        title={sticky.is_pinned ? "Desfijar" : "Fijar al frente"}
                      >
                        <Pin className="size-3.5" />
                      </Button>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleTogglePrivacy(sticky.id)}
                        className="size-6 text-slate-500 hover:text-slate-800 cursor-pointer"
                        title={sticky.is_private ? "Nota privada (Clic para compartir)" : "Compartida en el workspace (Clic para privatizar)"}
                      >
                        {sticky.is_private ? <Lock className="size-3" /> : <Globe className="size-3" />}
                      </Button>
                    </div>

                    <div className="flex items-center gap-1">
                      {/* Color dots picker on hover */}
                      <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity">
                        {(Object.keys(COLOR_STYLES) as (keyof typeof COLOR_STYLES)[]).map((c) => (
                          <button
                            key={c}
                            type="button"
                            onClick={() => handleChangeColor(sticky.id, c)}
                            className={cn(
                              "size-3 rounded-full transition-transform cursor-pointer",
                              COLOR_STYLES[c].accent,
                              sticky.color === c && "ring-1 ring-black scale-110"
                            )}
                          />
                        ))}
                      </div>

                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(sticky.id)}
                        className="size-6 text-slate-400 hover:text-red-700 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
                        title="Eliminar nota"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  </div>

                  {/* Editable Content */}
                  <Textarea
                    defaultValue={sticky.content}
                    onBlur={(e) => handleUpdateContent(sticky.id, e.target.value)}
                    rows={4}
                    placeholder="Escribe tu nota aquí..."
                    className="flex-1 w-full bg-transparent border-0 shadow-none focus-visible:ring-0 p-0 text-sm leading-relaxed resize-none font-medium"
                  />

                  {/* Sticky Footer */}
                  <div className="flex items-center justify-between pt-2 mt-2 border-t border-black/5 text-[10px] opacity-70">
                    <span>{sticky.creator?.name || "Nota"}</span>
                    <span>{sticky.created_at ? new Date(sticky.created_at).toLocaleDateString() : ""}</span>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
