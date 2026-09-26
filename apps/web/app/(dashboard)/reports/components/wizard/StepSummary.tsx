"use client";
import React from "react";
import { Button } from "@/components/ui/button";
import BaseIcon from "@/components/ui/base-icon";
import { Badge } from "@/components/ui/badge";
import { useRouter } from "next/navigation";
import { useReportWizardStore } from "@/hooks/zustand/use-report-wizard-store";
import { useReportById } from "../../hooks/use-report-by-id";
import { useListConnections } from "../../../setting/connections/hooks/use-list-connections";
import { useListReportCategories } from "@/hooks/use-list-report-categories";
import { ReportWizardMode } from "./ReportWizard";

interface Props {
  mode: ReportWizardMode;
}

export const StepSummary = ({ mode }: Props) => {
  const router = useRouter();
  const reportId = useReportWizardStore((s) => s.reportId);
  const headers = useReportWizardStore((s) => s.headers);
  const setStep = useReportWizardStore((s) => s.setStep);
  const reset = useReportWizardStore((s) => s.reset);

  const { data: report } = useReportById(reportId);
  const { data: connections } = useListConnections({
    params: { params: { paginate: false } },
  });
  const { data: categories } = useListReportCategories();

  const connection = connections?.find(
    (c) => c.id === report?.relationships.connection_id
  );
  const category = categories?.find(
    (c) => c.id === report?.relationships.category?.id
  );
  const selectedHeaders = headers.filter((h) => h.is_selected);

  const handleFinish = () => {
    reset();
    if (mode === "create" && reportId) {
      router.replace(`/reports/${reportId}/edit`);
    } else {
      router.replace("/reports");
    }
  };

  return (
    <div className="space-y-6">
      <div className="rounded-xl border bg-card shadow-sm overflow-hidden">
        <div className="border-b px-5 py-4 flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-primary/10 text-primary">
            <BaseIcon name="FileText" size={20} />
          </div>
          <div>
            <h3 className="font-semibold text-lg leading-tight">
              {report?.attributes.name ?? "Reporte"}
            </h3>
            {report?.attributes.description && (
              <p className="text-sm text-muted-foreground line-clamp-1">
                {report.attributes.description}
              </p>
            )}
          </div>
        </div>

        <div className="grid gap-4 sm:grid-cols-3 p-5">
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
              <BaseIcon name="Database" size={12} /> Conexión
            </p>
            <p className="font-medium text-sm">{connection?.attributes.name ?? "—"}</p>
            <p className="text-xs text-muted-foreground">
              {connection?.relationships.driver?.name ?? ""}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
              <BaseIcon name="Folder" size={12} /> Categoría
            </p>
            <p className="font-medium text-sm capitalize">
              {category?.attributes.name ??
                report?.relationships.category?.name ??
                "—"}
            </p>
          </div>
          <div>
            <p className="text-xs uppercase tracking-wide text-muted-foreground mb-1 flex items-center gap-1">
              <BaseIcon name="Columns3" size={12} /> Columnas de salida
            </p>
            <p className="font-medium text-sm">{selectedHeaders.length}</p>
          </div>
        </div>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-2 flex items-center gap-1">
          <BaseIcon name="Code2" size={12} /> Consulta SQL
        </p>
        <pre className="rounded-md bg-slate-950 p-4 text-xs text-green-400 font-mono whitespace-pre-wrap overflow-auto max-h-40 border">
          {report?.attributes.sql_query ?? ""}
        </pre>
      </div>

      <div className="rounded-xl border bg-card shadow-sm p-5">
        <p className="text-xs uppercase tracking-wide text-muted-foreground mb-3 flex items-center gap-1">
          <BaseIcon name="List" size={12} /> Columnas de salida
          <span className="normal-case text-xs">({selectedHeaders.length})</span>
        </p>
        {selectedHeaders.length > 0 ? (
          <div className="flex flex-wrap gap-2">
            {selectedHeaders.map((h) => (
              <Badge key={h.original_column} variant="outline" className="font-mono">
                {h.display_name}
              </Badge>
            ))}
          </div>
        ) : (
          <p className="text-sm text-muted-foreground">Sin columnas seleccionadas.</p>
        )}
      </div>

      <div className="flex gap-2 justify-between">
        <Button variant="outline" type="button" onClick={() => setStep("headers")}>
          Atrás
        </Button>
        <Button type="button" onClick={handleFinish}>
          {mode === "create" ? "Finalizar y Editar" : "Finalizar"}
        </Button>
      </div>
    </div>
  );
};