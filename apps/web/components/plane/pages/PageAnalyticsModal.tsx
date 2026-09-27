"use client";

import React, { useState, useEffect } from "react";
import { PageAnalytics } from "@/types/plane-types";
import { pageService } from "@/services/plane/pageService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  BarChart3,
  Eye,
  Users,
  Clock,
  FileText,
  Layers,
  Calendar,
  Loader2,
} from "lucide-react";

interface PageAnalyticsModalProps {
  pageId: string | number | null;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function PageAnalyticsModal({ pageId, open, onOpenChange }: PageAnalyticsModalProps) {
  const [analytics, setAnalytics] = useState<PageAnalytics | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (open && pageId) {
      setLoading(true);
      pageService
        .getAnalytics(pageId)
        .then((data) => setAnalytics(data))
        .catch((err) => console.error("Error loading page analytics:", err))
        .finally(() => setLoading(false));
    }
  }, [open, pageId]);

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <BarChart3 className="size-5 text-indigo-600" />
            Analíticas de Página
          </DialogTitle>
          <DialogDescription>
            Métricas de lectura, visitas y colaboración de este documento.
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex flex-col items-center justify-center p-8 text-slate-400">
            <Loader2 className="size-6 animate-spin mb-2 text-indigo-600" />
            <p className="text-xs">Cargando métricas...</p>
          </div>
        ) : analytics ? (
          <div className="space-y-4 py-2">
            {/* Metric Cards Grid */}
            <div className="grid grid-cols-2 gap-3">
              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Eye className="size-3.5 text-indigo-600" />
                  <span>Visualizaciones</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{analytics.total_views}</p>
                <p className="text-[10px] text-slate-400">
                  {analytics.unique_viewers} lectores únicos
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Clock className="size-3.5 text-emerald-600" />
                  <span>Tiempo de Lectura</span>
                </div>
                <p className="text-xl font-bold text-slate-900">
                  ~{analytics.reading_time_minutes} min
                </p>
                <p className="text-[10px] text-slate-400">Basado en 200 palabras/min</p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <FileText className="size-3.5 text-amber-600" />
                  <span>Palabras</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{analytics.word_count}</p>
                <p className="text-[10px] text-slate-400">
                  {analytics.character_count} caracteres
                </p>
              </div>

              <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl space-y-1">
                <div className="flex items-center gap-1.5 text-xs text-slate-500">
                  <Layers className="size-3.5 text-purple-600" />
                  <span>Bloques de Contenido</span>
                </div>
                <p className="text-xl font-bold text-slate-900">{analytics.block_count}</p>
                <p className="text-[10px] text-slate-400">Estructura modular</p>
              </div>
            </div>

            {/* Author and Editor Details */}
            <div className="p-3 bg-slate-50 border border-slate-100 rounded-xl text-xs space-y-2">
              <div className="flex items-center justify-between">
                <span className="text-slate-500">Creado por:</span>
                <span className="font-semibold text-slate-700">
                  {analytics.creator?.name || "Desconocido"}
                </span>
              </div>
              {analytics.last_editor && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Última edición por:</span>
                  <span className="font-semibold text-slate-700">
                    {analytics.last_editor.name}
                  </span>
                </div>
              )}
              {analytics.updated_at && (
                <div className="flex items-center justify-between">
                  <span className="text-slate-500">Actualizado:</span>
                  <span className="text-slate-600">
                    {new Date(analytics.updated_at).toLocaleString()}
                  </span>
                </div>
              )}
            </div>

            {/* Recent Readers */}
            {analytics.recent_views && analytics.recent_views.length > 0 && (
              <div className="space-y-1.5">
                <p className="text-xs font-semibold text-slate-600">Lecturas Recientes</p>
                <div className="divide-y divide-slate-100 rounded-lg border border-slate-100 overflow-hidden text-xs">
                  {analytics.recent_views.map((rv, idx) => (
                    <div key={idx} className="flex items-center justify-between p-2 bg-white">
                      <span className="font-medium text-slate-700">
                        {rv.user?.name || "Visitante"}
                      </span>
                      <span className="text-slate-400 text-[11px]">
                        {new Date(rv.viewed_at).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        ) : null}
      </DialogContent>
    </Dialog>
  );
}
