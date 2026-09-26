"use client";
import React, { useEffect } from "react";
import { cn } from "@/lib/utils";
import { useReportWizardStore } from "@/hooks/zustand/use-report-wizard-store";
import { Report } from "@/types/report-type";
import { StepDetails } from "./StepDetails";
import { StepSql } from "./StepSql";
import { StepParameters } from "./StepParameters";
import { StepHeaderMapping } from "./StepHeaderMapping";
import { StepSummary } from "./StepSummary";

export type ReportWizardMode = "create" | "update";

interface Props {
  mode: ReportWizardMode;
  report?: Report | null;
}

const STEPS: { key: string; label: string }[] = [
  { key: "details", label: "Datos Generales" },
  { key: "sql", label: "Consulta SQL" },
  { key: "parameters", label: "Parámetros" },
  { key: "headers", label: "Mapeo de Encabezados" },
  { key: "summary", label: "Resumen" },
];

export const ReportWizard = ({ mode, report }: Props) => {
  const currentStep = useReportWizardStore((s) => s.currentStep);
  const setStep = useReportWizardStore((s) => s.setStep);
  const reset = useReportWizardStore((s) => s.reset);

  useEffect(() => {
    if (report?.id) {
      reset();
      useReportWizardStore.setState({
        reportId: String(report.id),
        connectionId: report.relationships.connection_id,
        reportCategoryId: report.relationships.category?.id ?? null,
        name: report.attributes.name ?? "",
        description: report.attributes.description ?? "",
        sqlQuery: report.attributes.sql_query ?? "",
        discardedParameters: report.attributes.discarded_parameters ?? [],
      });
      if (report.relationships.headers?.length) {
        useReportWizardStore
          .getState()
          .setHeaders(
            report.relationships.headers.map((h) => ({
              original_column:
                h.attributes?.original_column ?? (h as any).original_column ?? "",
              display_name:
                h.attributes?.display_name ?? (h as any).display_name ?? "",
              is_selected: Boolean(
                h.attributes?.is_selected !== undefined
                  ? h.attributes.is_selected
                  : (h as any).is_selected
              ),
            }))
          );
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [report?.id]);

  const currentIndex = STEPS.findIndex((s) => s.key === currentStep);

  return (
    <div className="space-y-6">
      <div className="flex items-center">
        {STEPS.map((step, index) => {
          const isClickable = mode === "update" || index < currentIndex;
          return (
            <React.Fragment key={step.key}>
              <button
                type="button"
                onClick={() => isClickable && setStep(step.key as never)}
                disabled={!isClickable}
                className={cn(
                  "flex items-center gap-2 text-sm font-medium transition-colors",
                  index === currentIndex
                    ? "text-primary font-semibold cursor-default"
                    : isClickable
                    ? "text-emerald-600 hover:text-emerald-700 cursor-pointer"
                    : "text-muted-foreground cursor-default opacity-60"
                )}
              >
                <span
                  className={cn(
                    "flex h-7 w-7 items-center justify-center rounded-full border text-xs font-semibold",
                    index === currentIndex
                      ? "border-primary bg-primary text-white shadow-sm"
                      : isClickable
                      ? "border-emerald-500 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                      : "border-input text-muted-foreground"
                  )}
                >
                  {index < currentIndex ? "✓" : index + 1}
                </span>
                <span className="hidden sm:inline">{step.label}</span>
              </button>
              {index < STEPS.length - 1 && (
                <div
                  className={cn(
                    "mx-3 h-px flex-1",
                    index < currentIndex || mode === "update"
                      ? "bg-emerald-500"
                      : "bg-border"
                  )}
                />
              )}
            </React.Fragment>
          );
        })}
      </div>

      <div>
        {currentStep === "details" && <StepDetails report={report} />}
        {currentStep === "sql" && <StepSql report={report} />}
        {currentStep === "parameters" && <StepParameters report={report} />}
        {currentStep === "headers" && <StepHeaderMapping report={report} />}
        {currentStep === "summary" && <StepSummary mode={mode} />}
      </div>
    </div>
  );
};