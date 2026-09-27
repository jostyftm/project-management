"use client";

import React, { useState } from "react";
import { useRouter } from "next/navigation";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { pageService } from "@/services/plane/pageService";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Sparkles, BarChart2, Loader2, CheckCircle2 } from "lucide-react";
import { toast } from "sonner";

interface ReportPageModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  defaultProjectId?: string | number;
}

export function ReportPageModal({ open, onOpenChange, defaultProjectId }: ReportPageModalProps) {
  const router = useRouter();
  const { projects } = useWorkspaceStore();
  const [selectedProjectId, setSelectedProjectId] = useState<string>(
    defaultProjectId ? String(defaultProjectId) : projects[0]?.id ? String(projects[0].id) : ""
  );
  const [isGenerating, setIsGenerating] = useState(false);

  const handleGenerate = async () => {
    if (!selectedProjectId) {
      toast.error("Selecciona un proyecto para generar el reporte");
      return;
    }

    setIsGenerating(true);
    try {
      const page = await pageService.generateReport(selectedProjectId);
      toast.success("Página de reporte generada con éxito");
      onOpenChange(false);
      router.push(`/pages/${page.id}`);
    } catch (err: any) {
      toast.error("Error al generar el reporte del proyecto");
    } finally {
      setIsGenerating(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-lg font-bold">
            <Sparkles className="size-5 text-indigo-600" />
            Generar Report Page Inteligente
          </DialogTitle>
          <DialogDescription>
            Crea un documento de reporte automático a partir del estado actual y métricas de los work items del proyecto.
          </DialogDescription>
        </DialogHeader>

        <div className="space-y-4 py-3">
          <div className="space-y-2">
            <Label>Proyecto a Reportar</Label>
            <Select value={selectedProjectId} onValueChange={setSelectedProjectId}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Selecciona un proyecto" />
              </SelectTrigger>
              <SelectContent>
                {projects.map((p) => (
                  <SelectItem key={p.id} value={String(p.id)}>
                    {p.identifier} — {p.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="p-3 bg-indigo-50/50 border border-indigo-100 rounded-xl space-y-2 text-xs text-indigo-900">
            <div className="flex items-center gap-1.5 font-semibold">
              <BarChart2 className="size-4 text-indigo-600" />
              <span>Contenido generado automáticamente:</span>
            </div>
            <ul className="space-y-1 text-slate-600 list-disc list-inside">
              <li>Resumen ejecutivo con tasa de completitud</li>
              <li>Tabla estructurada de desglose por grupos de estado</li>
              <li>Checklist interactiva de tareas críticas y de alta prioridad</li>
              <li>Metadatos de auditoría y fecha de generación</li>
            </ul>
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)} disabled={isGenerating}>
            Cancelar
          </Button>
          <Button
            onClick={handleGenerate}
            disabled={isGenerating || !selectedProjectId}
            className="bg-indigo-600 hover:bg-indigo-500 text-white"
          >
            {isGenerating ? (
              <>
                <Loader2 className="size-4 animate-spin mr-2" /> Generando...
              </>
            ) : (
              <>
                <Sparkles className="size-4 mr-2" /> Generar Reporte
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
