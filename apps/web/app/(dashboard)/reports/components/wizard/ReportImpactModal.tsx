"use client";

import React from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  AlertTriangle,
  CalendarClock,
  CheckCircle2,
  Loader2,
  MinusCircle,
  PlusCircle,
} from "lucide-react";
import { ReportImpactData } from "../../services/report-service";

interface Props {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  isLoading?: boolean;
  impactData: ReportImpactData | null;
  removedParams: string[];
  addedParams: string[];
}

export const ReportImpactModal = ({
  isOpen,
  onClose,
  onConfirm,
  isLoading = false,
  impactData,
  removedParams,
  addedParams,
}: Props) => {
  if (!impactData) return null;

  const schedulesCount =
    impactData.schedules_count || impactData.schedules?.length || 0;

  return (
    <Dialog
      open={isOpen}
      onOpenChange={(open) => !open && !isLoading && onClose()}
    >
      <DialogContent className="w-[95vw] sm:w-[50vw] sm:max-w-[50vw] max-h-[90vh] overflow-y-auto overflow-x-hidden min-w-0">
        <DialogHeader>
          <div className="flex items-center gap-3">
            <div className="p-2.5 rounded-full bg-amber-100 text-amber-700 shrink-0">
              <AlertTriangle className="w-5 h-5 text-amber-600" />
            </div>
            <div>
              <DialogTitle className="text-lg font-bold text-slate-900 leading-snug">
                Cambio de parámetros con programaciones asociadas
              </DialogTitle>
              <DialogDescription className="text-xs text-slate-500 mt-0.5">
                El reporte <strong>{impactData.report_name}</strong> tiene{" "}
                <strong>{schedulesCount} programación(es) automática(s)</strong> vinculada(s).
              </DialogDescription>
            </div>
          </div>
        </DialogHeader>

        <div className="space-y-4 my-2 text-xs">
          {/* Parámetros modificados */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 p-3.5 rounded-xl bg-slate-50 border border-slate-200">
            {/* Parámetros eliminados */}
            <div>
              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                <MinusCircle className="w-3.5 h-3.5 text-rose-500" />
                Parámetros eliminados ({removedParams.length})
              </span>
              {removedParams.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {removedParams.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="font-mono text-[11px] py-0.5 px-2 bg-rose-50 border-rose-200 text-rose-700 line-through"
                    >
                      :{p}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">Ninguno</p>
              )}
            </div>

            {/* Parámetros incorporados */}
            <div>
              <span className="text-[11px] font-semibold text-slate-700 flex items-center gap-1.5 mb-2">
                <PlusCircle className="w-3.5 h-3.5 text-emerald-600" />
                Parámetros nuevos ({addedParams.length})
              </span>
              {addedParams.length > 0 ? (
                <div className="flex flex-wrap gap-1.5">
                  {addedParams.map((p) => (
                    <Badge
                      key={p}
                      variant="outline"
                      className="font-mono text-[11px] py-0.5 px-2 bg-emerald-50 border-emerald-200 text-emerald-700 font-semibold"
                    >
                      :{p}
                    </Badge>
                  ))}
                </div>
              ) : (
                <p className="text-slate-400 italic text-[11px]">Ninguno</p>
              )}
            </div>
          </div>

          {/* Programaciones afectadas */}
          {impactData.schedules && impactData.schedules.length > 0 && (
            <div className="space-y-2">
              <span className="text-xs font-semibold text-slate-700 flex items-center gap-1.5">
                <CalendarClock className="w-4 h-4 text-slate-500" />
                Programaciones que serán sincronizadas ({impactData.schedules.length}):
              </span>
              <div className="rounded-lg border border-slate-200 overflow-hidden bg-white max-h-40 overflow-y-auto">
                <table className="w-full text-xs text-left border-collapse">
                  <thead className="bg-slate-100/80 text-slate-600 border-b border-slate-200 font-medium">
                    <tr>
                      <th className="px-3 py-1.5">ID</th>
                      <th className="px-3 py-1.5">Periodicidad (Cron)</th>
                      <th className="px-3 py-1.5">Formato</th>
                      <th className="px-3 py-1.5 text-right">Estado</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {impactData.schedules.map((s) => (
                      <tr key={s.id} className="hover:bg-slate-50/60">
                        <td className="px-3 py-2 font-mono text-slate-500">#{s.id}</td>
                        <td className="px-3 py-2 font-mono text-slate-700">
                          {s.cron_expression}
                        </td>
                        <td className="px-3 py-2 uppercase font-medium text-slate-600">
                          {s.file_format}
                        </td>
                        <td className="px-3 py-2 text-right">
                          <span
                            className={`inline-block px-2 py-0.5 rounded-full text-[10px] font-semibold ${
                              s.status === 1 || s.status === "active"
                                ? "bg-emerald-100 text-emerald-800"
                                : "bg-slate-100 text-slate-600"
                            }`}
                          >
                            {s.status === 1 || s.status === "active"
                              ? "Activa"
                              : "Inactiva"}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Recuadro de consecuencias */}
          <div className="p-3.5 rounded-xl bg-amber-50/80 border border-amber-200/90 text-amber-900 space-y-2">
            <span className="font-semibold flex items-center gap-1.5 text-xs text-amber-800">
              <AlertTriangle className="w-3.5 h-3.5 text-amber-600 shrink-0" />
              Consecuencias de este cambio:
            </span>
            <ul className="list-disc pl-4 space-y-1 text-[11px] text-amber-800/90">
              <li>
                Los parámetros eliminados se borrarán de la configuración de cada
                programación automática vinculada.
              </li>
              <li>
                Los nuevos parámetros se incorporarán automáticamente a las
                programaciones con valores iniciales vacíos o por defecto.
              </li>
              <li>
                <strong>Importante:</strong> Si la nueva consulta requiere valores
                obligatorios en estos nuevos parámetros, deberás acceder a{" "}
                <strong>Programación de Reportes</strong> y establecer sus valores
                para evitar que las próximas ejecuciones automáticas fallen.
              </li>
            </ul>
          </div>
        </div>

        <DialogFooter className="pt-3 border-t border-slate-200/80 flex flex-row justify-end gap-2.5">
          <Button
            type="button"
            variant="outline"
            onClick={onClose}
            disabled={isLoading}
            className="cursor-pointer px-4"
          >
            Cancelar
          </Button>
          <Button
            type="button"
            onClick={onConfirm}
            disabled={isLoading}
            className="cursor-pointer gap-2 px-4 bg-amber-600 hover:bg-amber-700 text-white"
          >
            {isLoading ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                <span>Actualizando...</span>
              </>
            ) : (
              <>
                <CheckCircle2 className="w-4 h-4" />
                <span>Aceptar y Actualizar Programaciones</span>
              </>
            )}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};
