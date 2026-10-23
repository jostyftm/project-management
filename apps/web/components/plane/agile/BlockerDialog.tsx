"use client";

import React, { useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogDescription,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { ShieldAlert, CheckCircle2, AlertOctagon } from "lucide-react";
import { WorkItem } from "@/types/plane-types";
import { toast } from "sonner";

interface BlockerDialogProps {
  isOpen: boolean;
  onClose: () => void;
  workItem: WorkItem | null;
  onSaveBlocker: (itemId: string | number, isBlocked: boolean, reason?: string | null) => Promise<void>;
}

export function BlockerDialog({
  isOpen,
  onClose,
  workItem,
  onSaveBlocker,
}: BlockerDialogProps) {
  const [reason, setReason] = useState(workItem?.blocked_reason || "");
  const [isSubmitting, setIsSubmitting] = useState(false);

  React.useEffect(() => {
    if (workItem) {
      setReason(workItem.blocked_reason || "");
    }
  }, [workItem]);

  if (!workItem) return null;

  const isCurrentlyBlocked = !!workItem.is_blocked;

  const handleBlock = async () => {
    if (!reason.trim()) {
      toast.error("Por favor describe el motivo o dependencia que bloquea esta tarea");
      return;
    }
    try {
      setIsSubmitting(true);
      await onSaveBlocker(workItem.id, true, reason.trim());
      toast.success("Impedimento reportado. Se notificará al líder del proyecto.");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Error al reportar el impedimento");
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleUnblock = async () => {
    try {
      setIsSubmitting(true);
      await onSaveBlocker(workItem.id, false, null);
      toast.success("Impedimento resuelto exitosamente.");
      onClose();
    } catch (err: any) {
      toast.error(err?.message || "Error al desbloquear la tarea");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-md z-[120]">
        <DialogHeader>
          <div className="flex items-center gap-2">
            <div className={isCurrentlyBlocked ? "p-2 bg-red-100 rounded-lg text-red-600" : "p-2 bg-amber-100 rounded-lg text-amber-600"}>
              {isCurrentlyBlocked ? <AlertOctagon className="size-5" /> : <ShieldAlert className="size-5" />}
            </div>
            <div>
              <DialogTitle className="text-base font-semibold text-slate-900">
                {isCurrentlyBlocked ? "Gestionar Impedimento (Bloqueo)" : "Reportar Tarea Bloqueada"}
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500">
                {workItem.identifier} - {workItem.title}
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="py-2 space-y-3">
          {isCurrentlyBlocked ? (
            <div className="bg-red-50/70 border border-red-200 rounded-lg p-3 space-y-1.5">
              <span className="text-xs font-semibold text-red-800 flex items-center gap-1.5">
                <AlertOctagon className="size-3.5" /> Estado actual: Bloqueada
              </span>
              <p className="text-xs text-red-700 italic">
                "{workItem.blocked_reason || "Sin detalle especificado"}"
              </p>
              {workItem.blocked_at && (
                <span className="text-[10px] text-red-500 block">
                  Reportado el: {new Date(workItem.blocked_at).toLocaleString()}
                </span>
              )}
            </div>
          ) : (
            <p className="text-xs text-slate-600">
              Reportar un bloqueo alertará al Scrum Master y a tus compañeros para desatascar la tarea cuanto antes.
            </p>
          )}

          <div className="space-y-1.5">
            <Label htmlFor="blocker-reason" className="text-xs font-medium text-slate-700">
              {isCurrentlyBlocked ? "Actualizar motivo del bloqueo" : "Motivo del impedimento o dependencia externa"}
            </Label>
            <Textarea
              id="blocker-reason"
              rows={3}
              placeholder="Ej: Esperando revisión técnica de QA, credenciales de terceros caídas, etc."
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              className="text-xs resize-none"
            />
          </div>
        </div>

        <DialogFooter className="flex items-center justify-between sm:justify-between gap-2">
          {isCurrentlyBlocked ? (
            <>
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="text-emerald-700 border-emerald-300 hover:bg-emerald-50 text-xs"
                onClick={handleUnblock}
                disabled={isSubmitting}
              >
                <CheckCircle2 className="size-3.5 mr-1 text-emerald-600" />
                Desbloquear Tarea
              </Button>
              <Button
                type="button"
                size="sm"
                variant="destructive"
                className="text-xs"
                onClick={handleBlock}
                disabled={isSubmitting}
              >
                Actualizar Motivo
              </Button>
            </>
          ) : (
            <>
              <Button
                type="button"
                variant="ghost"
                size="sm"
                className="text-xs"
                onClick={onClose}
                disabled={isSubmitting}
              >
                Cancelar
              </Button>
              <Button
                type="button"
                size="sm"
                className="bg-red-600 hover:bg-red-700 text-white text-xs"
                onClick={handleBlock}
                disabled={isSubmitting}
              >
                <AlertOctagon className="size-3.5 mr-1" />
                Reportar Bloqueo
              </Button>
            </>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
