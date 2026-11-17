"use client";

import React, { useState, useRef } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { projectService } from "@/services/plane/projectService";
import {
  UploadCloud,
  FileJson,
  CheckCircle2,
  AlertCircle,
  Loader2,
  FolderKanban,
  Layers,
  Repeat,
  CheckSquare,
} from "lucide-react";
import { toast } from "sonner";

interface ImportProjectModalProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
}

interface ProjectPreviewData {
  name: string;
  identifier: string;
  workItemsCount: number;
  cyclesCount: number;
  modulesCount: number;
  format: "canonical" | "flat";
}

export function ImportProjectModal({
  open,
  onOpenChange,
  onSuccess,
}: ImportProjectModalProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [preview, setPreview] = useState<ProjectPreviewData | null>(null);
  const [parseError, setParseError] = useState<string | null>(null);

  const [name, setName] = useState("");
  const [identifier, setIdentifier] = useState("");
  const [force, setForce] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  const resetState = () => {
    setFile(null);
    setPreview(null);
    setParseError(null);
    setName("");
    setIdentifier("");
    setForce(false);
    setIsSubmitting(false);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleOpenChange = (isOpen: boolean) => {
    if (!isOpen) {
      resetState();
    }
    onOpenChange(isOpen);
  };

  const processFile = (selectedFile: File) => {
    if (!selectedFile.name.endsWith(".json")) {
      setParseError("Por favor selecciona un archivo con extensión .json");
      setFile(null);
      setPreview(null);
      return;
    }

    setFile(selectedFile);
    setParseError(null);

    const reader = new FileReader();
    reader.onload = (e) => {
      try {
        const text = e.target?.result as string;
        const parsed = JSON.parse(text);

        if (parsed.project || parsed.version) {
          // Formato Canónico v1.0
          const proj = parsed.project || {};
          const workItems = Array.isArray(parsed.work_items) ? parsed.work_items.length : 0;
          const cycles = Array.isArray(parsed.cycles) ? parsed.cycles.length : 0;
          const modules = Array.isArray(parsed.modules) ? parsed.modules.length : 0;

          const projName = proj.name || selectedFile.name.replace(/\.json$/, "");
          const projIdent = (proj.identifier || "PRJ").toUpperCase();

          setPreview({
            name: projName,
            identifier: projIdent,
            workItemsCount: workItems,
            cyclesCount: cycles,
            modulesCount: modules,
            format: "canonical",
          });
          setName(projName);
          setIdentifier(projIdent);
        } else if (Array.isArray(parsed) && parsed.length > 0) {
          // Formato Lista Plana
          const first = parsed[0] || {};
          const projName = first.project_name || selectedFile.name.replace(/\.json$/, "");
          const projIdent = (first.project_identifier || "PRJ").toUpperCase();

          const cycles = new Set(parsed.map((item: any) => item.sprint).filter(Boolean)).size;
          const modules = new Set(parsed.map((item: any) => item.module).filter(Boolean)).size;

          setPreview({
            name: projName,
            identifier: projIdent,
            workItemsCount: parsed.length,
            cyclesCount: cycles,
            modulesCount: modules,
            format: "flat",
          });
          setName(projName);
          setIdentifier(projIdent);
        } else {
          setParseError("El archivo JSON no contiene un formato de proyecto válido.");
          setPreview(null);
        }
      } catch (err: any) {
        setParseError(`Error al leer el archivo JSON: ${err?.message || "Sintaxis no válida"}`);
        setPreview(null);
      }
    };
    reader.readAsText(selectedFile);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files[0]) {
      processFile(files[0]);
    }
  };

  const handleDragOver = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(true);
  };

  const handleDragLeave = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    setIsDragging(false);
    if (e.dataTransfer.files && e.dataTransfer.files[0]) {
      processFile(e.dataTransfer.files[0]);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!file || isSubmitting) return;

    setIsSubmitting(true);
    try {
      const res = await projectService.importProject(file, {
        name: name.trim() || undefined,
        identifier: identifier.trim().toUpperCase() || undefined,
        force,
      });

      toast.success(
        `Proyecto "${res.project.name}" [${res.project.identifier}] importado con éxito: ${res.counts.work_items} tareas recreadas.`
      );
      handleOpenChange(false);
      onSuccess?.();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || "Error al importar el proyecto.";
      toast.error(msg);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={handleOpenChange}>
      <DialogContent className="sm:max-w-xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className="p-2 rounded-lg bg-indigo-50 text-indigo-600">
              <FolderKanban className="size-5" />
            </div>
            <div>
              <DialogTitle className="text-lg font-semibold text-slate-900">
                Importar Proyecto
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                Carga un archivo de respaldo o exportación JSON para recrear el proyecto con todos sus ciclos, módulos y tareas.
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 py-2">
          {/* Zona de Drop / Carga de Archivo */}
          <div
            onDragOver={handleDragOver}
            onDragLeave={handleDragLeave}
            onDrop={handleDrop}
            onClick={() => fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-xl p-6 text-center cursor-pointer transition-all ${
              isDragging
                ? "border-indigo-500 bg-indigo-50/50"
                : file
                ? "border-emerald-300 bg-emerald-50/30"
                : "border-slate-200 hover:border-slate-300 bg-slate-50/50"
            }`}
          >
            <input
              ref={fileInputRef}
              type="file"
              accept=".json,application/json"
              className="hidden"
              onChange={handleFileChange}
            />

            {file ? (
              <div className="flex flex-col items-center gap-2">
                <div className="size-10 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center">
                  <FileJson className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-semibold text-slate-900">{file.name}</p>
                  <p className="text-xs text-slate-500">{(file.size / 1024).toFixed(1)} KB</p>
                </div>
                <span className="text-xs text-indigo-600 hover:underline mt-1 font-medium">
                  Hacer clic para cambiar de archivo
                </span>
              </div>
            ) : (
              <div className="flex flex-col items-center gap-2">
                <div className="size-10 rounded-full bg-slate-100 text-slate-500 flex items-center justify-center">
                  <UploadCloud className="size-5" />
                </div>
                <div>
                  <p className="text-sm font-medium text-slate-800">
                    Arrastra tu archivo JSON aquí, o{" "}
                    <span className="text-indigo-600 font-semibold">explora en tu equipo</span>
                  </p>
                  <p className="text-xs text-slate-400 mt-0.5">Archivos .json exportados de Plane / SDI</p>
                </div>
              </div>
            )}
          </div>

          {/* Error de Parseo */}
          {parseError && (
            <div className="flex items-center gap-2 p-3 text-xs text-rose-700 bg-rose-50 border border-rose-200 rounded-lg">
              <AlertCircle className="size-4 shrink-0" />
              <span>{parseError}</span>
            </div>
          )}

          {/* Vista previa de datos detectados */}
          {preview && (
            <div className="space-y-4 pt-1">
              <div className="p-3.5 bg-slate-50 rounded-xl border border-slate-200">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs font-semibold text-slate-700 uppercase tracking-wider">
                    Estructura Detectada
                  </span>
                  <span className="text-[10px] font-bold px-2 py-0.5 rounded-full bg-indigo-100 text-indigo-700">
                    {preview.format === "canonical" ? "Canónico v1.0" : "Dataset Plano"}
                  </span>
                </div>

                <div className="grid grid-cols-3 gap-2 text-center pt-1">
                  <div className="p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-0.5">
                      <CheckSquare className="size-3 text-indigo-500" />
                      <span>Tareas</span>
                    </div>
                    <span className="text-base font-bold text-slate-900">{preview.workItemsCount}</span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-0.5">
                      <Repeat className="size-3 text-emerald-500" />
                      <span>Ciclos</span>
                    </div>
                    <span className="text-base font-bold text-slate-900">{preview.cyclesCount}</span>
                  </div>

                  <div className="p-2 bg-white rounded-lg border border-slate-200/60 shadow-2xs">
                    <div className="flex items-center justify-center gap-1 text-slate-500 text-xs mb-0.5">
                      <Layers className="size-3 text-amber-500" />
                      <span>Módulos</span>
                    </div>
                    <span className="text-base font-bold text-slate-900">{preview.modulesCount}</span>
                  </div>
                </div>
              </div>

              {/* Personalización de Destino */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-3">
                <div className="sm:col-span-2 space-y-1.5">
                  <Label htmlFor="import-proj-name" className="text-xs font-semibold text-slate-700">
                    Nombre del Proyecto
                  </Label>
                  <Input
                    id="import-proj-name"
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    placeholder="Ej: Helpdesk IA"
                    className="h-9 text-sm"
                    required
                  />
                </div>

                <div className="space-y-1.5">
                  <Label htmlFor="import-proj-id" className="text-xs font-semibold text-slate-700">
                    Clave (Prefijo)
                  </Label>
                  <Input
                    id="import-proj-id"
                    value={identifier}
                    onChange={(e) => setIdentifier(e.target.value.toUpperCase())}
                    placeholder="Ej: JSVRC"
                    maxLength={10}
                    className="h-9 text-sm font-mono font-bold uppercase"
                    required
                  />
                </div>
              </div>

              {/* Opción de Forzar Sobrescritura */}
              <label className="flex items-start gap-2 text-xs text-slate-600 cursor-pointer pt-1">
                <input
                  type="checkbox"
                  checked={force}
                  onChange={(e) => setForce(e.target.checked)}
                  className="rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 size-4 mt-0.5"
                />
                <span>
                  Sobrescribir si ya existe un proyecto con la misma clave en este espacio de trabajo.
                </span>
              </label>
            </div>
          )}

          <DialogFooter className="pt-3 border-t border-slate-100 flex items-center justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => handleOpenChange(false)}
              disabled={isSubmitting}
            >
              Cancelar
            </Button>
            <Button
              type="submit"
              disabled={!file || !preview || !name.trim() || !identifier.trim() || isSubmitting}
              className="bg-indigo-600 hover:bg-indigo-500 text-white min-w-[120px]"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="size-4 animate-spin mr-2" />
                  Importando...
                </>
              ) : (
                <>
                  <CheckCircle2 className="size-4 mr-2" />
                  Importar Proyecto
                </>
              )}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
