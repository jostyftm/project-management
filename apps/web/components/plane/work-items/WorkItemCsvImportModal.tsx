"use client";

import React, { useState } from "react";
import { workItemImportService } from "@/services/plane/workItemImportService";
import { CsvPreviewData } from "@/types/plane-types";
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
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  FileSpreadsheet,
  Upload,
  Download,
  CheckCircle2,
  AlertTriangle,
  ArrowRight,
  ArrowLeft,
  Loader2,
  FileText,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

interface WorkItemCsvImportModalProps {
  projectId: string | number;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSuccess?: () => void;
  onImportSuccess?: () => void;
}

export function WorkItemCsvImportModal({
  projectId,
  open,
  onOpenChange,
  onSuccess,
  onImportSuccess,
}: WorkItemCsvImportModalProps) {
  const [step, setStep] = useState<1 | 2 | 3>(1);
  const [file, setFile] = useState<File | null>(null);
  const [delimiter, setDelimiter] = useState<string>(",");
  const [previewData, setPreviewData] = useState<CsvPreviewData | null>(null);
  const [columnMapping, setColumnMapping] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(false);
  const [importResult, setImportResult] = useState<{ count: number; errors: string[] } | null>(null);

  const resetState = () => {
    setStep(1);
    setFile(null);
    setPreviewData(null);
    setColumnMapping({});
    setImportResult(null);
  };

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files && e.target.files[0]) {
      setFile(e.target.files[0]);
    }
  };

  const handlePreview = async () => {
    if (!file) {
      toast.error("Por favor selecciona un archivo CSV");
      return;
    }

    setIsLoading(true);
    try {
      const data = await workItemImportService.preview(projectId, { file, delimiter });
      setPreviewData(data);
      setColumnMapping(data.suggested_mapping || {});
      setStep(2);
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al analizar el archivo CSV");
    } finally {
      setIsLoading(false);
    }
  };

  const handleImport = async () => {
    if (!previewData || !columnMapping.title) {
      toast.error("Debes mapear al menos la columna del Título");
      return;
    }

    setIsLoading(true);
    try {
      const result = await workItemImportService.import(projectId, {
        rows: previewData.sample_rows,
        column_mapping: columnMapping,
      });

      setImportResult({ count: result.imported_count, errors: result.errors || [] });
      setStep(3);
      toast.success(`${result.imported_count} elementos importados con éxito`);
      if (onSuccess) onSuccess();
      if (onImportSuccess) onImportSuccess();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error durante la importación masiva");
    } finally {
      setIsLoading(false);
    }
  };

  const requiredFields = [
    { key: "title", label: "Título *", required: true },
    { key: "description", label: "Descripción", required: false },
    { key: "priority", label: "Prioridad", required: false },
    { key: "state", label: "Estado", required: false },
    { key: "type", label: "Tipo", required: false },
    { key: "estimate_points", label: "Estimación (Puntos)", required: false },
    { key: "assignee", label: "Asignado (Email)", required: false },
  ];

  return (
    <Dialog
      open={open}
      onOpenChange={(v) => {
        if (!v) resetState();
        onOpenChange(v);
      }}
    >
      <DialogContent className="sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-base">
            <FileSpreadsheet className="size-5 text-indigo-600" />
            Importador Masivo de Elementos (CSV)
          </DialogTitle>
          <DialogDescription className="text-xs">
            {step === 1 && "Carga tu archivo de datos en formato CSV para importar tareas por lote."}
            {step === 2 && "Mapea las columnas de tu archivo con las propiedades de Plane."}
            {step === 3 && "Resultados de la importación masiva."}
          </DialogDescription>
        </DialogHeader>

        {/* Step Indicator */}
        <div className="flex items-center justify-between px-6 py-2 border-b border-slate-100 dark:border-slate-800 text-xs">
          <span className={cn("font-medium", step === 1 ? "text-indigo-600 font-bold" : "text-slate-400")}>
            1. Cargar archivo
          </span>
          <ArrowRight className="size-3 text-slate-300" />
          <span className={cn("font-medium", step === 2 ? "text-indigo-600 font-bold" : "text-slate-400")}>
            2. Mapear columnas
          </span>
          <ArrowRight className="size-3 text-slate-300" />
          <span className={cn("font-medium", step === 3 ? "text-indigo-600 font-bold" : "text-slate-400")}>
            3. Finalizar
          </span>
        </div>

        {/* PASO 1: Subida de archivo */}
        {step === 1 && (
          <div className="space-y-4 py-3">
            <div className="border-2 border-dashed border-slate-200 dark:border-slate-800 rounded-xl p-8 text-center space-y-3 hover:border-indigo-400 transition-colors">
              <Upload className="size-8 mx-auto text-slate-400" />
              <div className="space-y-1">
                <p className="text-xs font-semibold text-slate-700 dark:text-slate-300">
                  {file ? file.name : "Arrastra tu archivo CSV aquí o selecciónalo"}
                </p>
                <p className="text-[11px] text-slate-400">Archivos .csv o .txt delimitados por coma o punto y coma (máx 5MB)</p>
              </div>
              <label className="inline-block">
                <Button type="button" variant="outline" size="sm" className="cursor-pointer" asChild>
                  <span>
                    Seleccionar Archivo
                    <input type="file" accept=".csv,.txt" onChange={handleFileChange} className="hidden" />
                  </span>
                </Button>
              </label>
            </div>

            <div className="flex items-center justify-between text-xs pt-2">
              <div className="flex items-center gap-2">
                <Label className="text-xs">Delimitador:</Label>
                <select
                  value={delimiter}
                  onChange={(e) => setDelimiter(e.target.value)}
                  className="rounded-md border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900 px-2 py-1 text-xs"
                >
                  <option value=",">Coma (,)</option>
                  <option value=";">Punto y coma (;)</option>
                  <option value="\t">Tabulación (\t)</option>
                </select>
              </div>

              {/* Botón de descarga de plantilla CSV */}
              <a
                href={workItemImportService.downloadTemplate()}
                target="_blank"
                rel="noreferrer"
                download="plantilla_work_items.csv"
                className="inline-flex items-center gap-1.5 text-xs text-indigo-600 hover:underline"
              >
                <Download className="size-3.5" />
                <span>Descargar plantilla de ejemplo</span>
              </a>
            </div>
          </div>
        )}

        {/* PASO 2: Mapeo de Columnas & Preview */}
        {step === 2 && previewData && (
          <div className="space-y-4 py-2 text-xs">
            <div className="rounded-lg bg-indigo-50/70 dark:bg-indigo-950/40 p-3 text-indigo-800 dark:text-indigo-300">
              <p className="font-semibold">Archivo analizado correctamente:</p>
              <p className="mt-0.5 text-[11px]">
                {previewData.total_rows} filas detectadas. Asocia cada columna de tu archivo con los campos de Plane.
              </p>
            </div>

            <div className="grid grid-cols-2 gap-3 max-h-60 overflow-y-auto pr-1">
              {requiredFields.map((field) => (
                <div key={field.key} className="space-y-1">
                  <Label className="text-xs font-medium">
                    {field.label}
                  </Label>
                  <Select
                    value={columnMapping[field.key] || "NONE"}
                    onValueChange={(val) =>
                      setColumnMapping((prev) => ({
                        ...prev,
                        [field.key]: val === "NONE" ? "" : val,
                      }))
                    }
                  >
                    <SelectTrigger className="h-8 text-xs">
                      <SelectValue placeholder="Seleccionar columna..." />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="NONE">— Omitir campo —</SelectItem>
                      {previewData.headers.map((hdr) => (
                        <SelectItem key={hdr} value={hdr}>
                          {hdr}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* PASO 3: Finalizado */}
        {step === 3 && importResult && (
          <div className="py-6 text-center space-y-4">
            <div className="size-12 rounded-full bg-emerald-100 text-emerald-600 flex items-center justify-center mx-auto">
              <CheckCircle2 className="size-6" />
            </div>
            <div>
              <h3 className="text-base font-bold text-slate-800 dark:text-slate-100">
                ¡Importación Completada!
              </h3>
              <p className="text-xs text-slate-500 mt-1">
                Se importaron {importResult.count} elementos de trabajo en el proyecto.
              </p>
            </div>

            {importResult.errors.length > 0 && (
              <div className="rounded-lg bg-amber-50 dark:bg-amber-950/40 p-3 text-left text-xs text-amber-800 dark:text-amber-300 space-y-1 max-h-32 overflow-y-auto">
                <p className="font-semibold flex items-center gap-1">
                  <AlertTriangle className="size-3.5" />
                  Avisos durante la importación:
                </p>
                {importResult.errors.map((err, i) => (
                  <p key={i} className="text-[11px]">• {err}</p>
                ))}
              </div>
            )}
          </div>
        )}

        <DialogFooter className="flex-row items-center justify-between sm:justify-between pt-2">
          {step === 1 && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => onOpenChange(false)}>
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handlePreview}
                disabled={!file || isLoading}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isLoading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Analizar CSV
              </Button>
            </>
          )}

          {step === 2 && (
            <>
              <Button type="button" variant="outline" size="sm" onClick={() => setStep(1)}>
                <ArrowLeft className="size-3.5 mr-1" />
                Volver
              </Button>
              <Button
                type="button"
                size="sm"
                onClick={handleImport}
                disabled={isLoading || !columnMapping.title}
                className="bg-indigo-600 hover:bg-indigo-500 text-white"
              >
                {isLoading ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
                Confirmar e Importar
              </Button>
            </>
          )}

          {step === 3 && (
            <Button
              type="button"
              size="sm"
              onClick={() => onOpenChange(false)}
              className="ml-auto bg-indigo-600 hover:bg-indigo-500 text-white"
            >
              Cerrar y Ver Tareas
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
