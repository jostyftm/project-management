"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import BaseIcon from "@/components/ui/base-icon";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { useReportWizardStore, WizardHeader } from "@/hooks/zustand/use-report-wizard-store";
import { useSyncHeaders } from "../../hooks/use-dry-run";
import { Report } from "@/types/report-type";

interface Props {
  report?: Report | null;
}

export const StepHeaderMapping = ({ report }: Props) => {
  const dryRunColumns = useReportWizardStore((s) => s.dryRunColumns);
  const reportId = useReportWizardStore((s) => s.reportId);
  const setStep = useReportWizardStore((s) => s.setStep);

  const [localHeaders, setLocalHeaders] = useState<WizardHeader[]>(() => {
    // 1. Obtener cabeceras previas del store o del reporte
    const storeHeaders = useReportWizardStore.getState().headers;
    let initialKnown = storeHeaders;

    if (initialKnown.length === 0 && report?.relationships.headers?.length) {
      initialKnown = report.relationships.headers.map((h) => ({
        original_column:
          h.attributes?.original_column ?? (h as any).original_column ?? "",
        display_name:
          h.attributes?.display_name ?? (h as any).display_name ?? "",
        is_selected: Boolean(
          h.attributes?.is_selected !== undefined
            ? h.attributes.is_selected
            : (h as any).is_selected
        ),
      }));
    }

    // 2. Si existen columnas de dry-run, hacer merge inteligente
    if (dryRunColumns.length > 0) {
      const existingMap = new Map(
        initialKnown.map((h) => [h.original_column, h])
      );
      return dryRunColumns.map((col) => {
        const key = col.attributes.key;
        const prev = existingMap.get(key);
        if (prev) {
          return {
            original_column: key,
            display_name: prev.display_name || col.attributes.label,
            is_selected: prev.is_selected,
          };
        }
        return {
          original_column: key,
          display_name: col.attributes.label,
          is_selected: true,
        };
      });
    }

    // 3. Si no hay dry-run reciente, usar las cabeceras conocidas
    return initialKnown;
  });

  const localHeadersRef = React.useRef(localHeaders);
  localHeadersRef.current = localHeaders;

  // Sincronizar de forma segura con Zustand al desmontar el componente
  React.useEffect(() => {
    return () => {
      if (localHeadersRef.current.length > 0) {
        useReportWizardStore.getState().setHeaders(localHeadersRef.current);
      }
    };
  }, []);

  const { syncHeaders, isLoading } = useSyncHeaders();

  const updateHeader = (
    index: number,
    field: keyof WizardHeader,
    value: string | boolean
  ) => {
    setLocalHeaders((prev) =>
      prev.map((h, i) => (i === index ? { ...h, [field]: value } : h))
    );
  };

  const handleSave = async () => {
    if (!reportId || selectedCount === 0) return;
    const ok = await syncHeaders(reportId, localHeaders);
    if (ok) {
      useReportWizardStore.getState().setHeaders(localHeaders);
      setStep("summary");
    }
  };

  const selectedCount = localHeaders.filter((h) => h.is_selected).length;
  const allSelected =
    localHeaders.length > 0 && selectedCount === localHeaders.length;
  const someSelected = selectedCount > 0 && !allSelected;

  const toggleSelectAll = () => {
    const nextValue = !allSelected;
    setLocalHeaders((prev) =>
      prev.map((h) => ({ ...h, is_selected: nextValue }))
    );
  };

  if (localHeaders.length === 0) {
    return (
      <div className="text-center py-10 text-muted-foreground">
        No hay columnas para mapear. Vuelve al paso anterior y valida la
        consulta.
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <p className="text-sm text-muted-foreground">
          {localHeaders.length} columnas detectadas ·{" "}
          <span
            className={
              selectedCount === 0
                ? "text-destructive font-semibold"
                : "font-medium text-foreground"
            }
          >
            {selectedCount} seleccionadas
          </span>
        </p>

        <div className="flex items-center gap-2">
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={toggleSelectAll}
            className="h-8 text-xs gap-1.5"
          >
            <BaseIcon
              name={allSelected ? "Square" : "CheckSquare"}
              size={13}
            />
            {allSelected ? "Deseleccionar todas" : "Seleccionar todas"}
          </Button>
        </div>
      </div>

      <div className="rounded-md border overflow-auto max-h-[400px]">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="bg-slate-100 font-bold text-gray-600 w-28">
                <div className="flex items-center gap-2">
                  <Checkbox
                    checked={
                      allSelected
                        ? true
                        : someSelected
                        ? "indeterminate"
                        : false
                    }
                    onCheckedChange={toggleSelectAll}
                    aria-label="Seleccionar o deseleccionar todas las columnas"
                  />
                  <span>Incluir</span>
                </div>
              </TableHead>
              <TableHead className="bg-slate-100 font-bold text-gray-600">
                Columna original
              </TableHead>
              <TableHead className="bg-slate-100 font-bold text-gray-600">
                Nombre en el reporte
              </TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {localHeaders.map((header, index) => (
              <TableRow key={header.original_column}>
                <TableCell>
                  <Checkbox
                    checked={header.is_selected}
                    onCheckedChange={(checked) =>
                      updateHeader(index, "is_selected", !!checked)
                    }
                  />
                </TableCell>
                <TableCell className="font-mono text-sm">
                  {header.original_column}
                </TableCell>
                <TableCell>
                  <Input
                    value={header.display_name}
                    onChange={(e) =>
                      updateHeader(index, "display_name", e.target.value)
                    }
                    placeholder={header.original_column}
                    className="max-w-xs"
                    disabled={!header.is_selected}
                  />
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </div>

      <div className="flex gap-2 justify-between items-center">
        <Button
          variant="outline"
          type="button"
          onClick={() => {
            useReportWizardStore.getState().setHeaders(localHeaders);
            setStep("parameters");
          }}
        >
          Atrás
        </Button>

        <div className="flex items-center gap-3">
          {selectedCount === 0 && (
            <span className="text-xs text-destructive font-medium">
              Debes seleccionar al menos una columna para continuar.
            </span>
          )}
          <Button
            type="button"
            onClick={handleSave}
            disabled={isLoading || selectedCount === 0}
            className="gap-2"
          >
            <BaseIcon
              name={isLoading ? "Loader" : "Save"}
              size={15}
              className={isLoading ? "animate-spin" : ""}
            />
            {isLoading ? "Guardando..." : "Guardar y continuar"}
          </Button>
        </div>
      </div>
    </div>
  );
};
