"use client";
import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import BaseIcon from "@/components/ui/base-icon";
import { ReportExecution } from "@/types/execution-type";
import { copyToClipboard } from "@/lib/clipboard";

interface Props {
  execution: ReportExecution;
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const ErrorLogModal = ({ execution, open, onOpenChange }: Props) => {
  const [copied, setCopied] = useState(false);

  const errorLog = execution.attributes.error_log ?? "Sin detalle de error.";

  const handleCopy = async () => {
    const ok = await copyToClipboard(errorLog);
    if (ok) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const isSkipped = execution.attributes.status === "skipped";

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-5xl w-full">
        <DialogHeader>
          <DialogTitle
            className={`flex items-center gap-2 ${
              isSkipped ? "text-amber-600 dark:text-amber-400" : "text-red-600"
            }`}
          >
            <BaseIcon name={isSkipped ? "ShieldAlert" : "CircleX"} size={18} />
            {isSkipped
              ? "Detalle de Validación Previa (Envío Omitido)"
              : "Error de ejecución"}
          </DialogTitle>
          <DialogDescription>
            {isSkipped
              ? `El reporte no fue generado ni enviado debido a que no cumplió las reglas de validación previa configuradas.`
              : `Reporte: ${execution.relationships.schedule?.report ?? "—"} · Inicio: ${
                  execution.attributes.started_at
                    ? new Date(execution.attributes.started_at).toLocaleString()
                    : "—"
                }`}
          </DialogDescription>
        </DialogHeader>

        <div className="relative min-w-0">
          <pre className="w-full min-w-0 rounded-md border bg-slate-950 p-4 text-xs text-green-400 font-mono whitespace-pre-wrap break-words overflow-auto max-h-[400px]">
            {errorLog}
          </pre>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleCopy}
            className="absolute top-2 right-2 gap-1.5 bg-white/90 backdrop-blur"
          >
            <BaseIcon name={copied ? "Check" : "Copy"} size={14} />
            {copied ? "Copiado" : "Copiar"}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default ErrorLogModal;
