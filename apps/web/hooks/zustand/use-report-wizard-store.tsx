"use client";

import { create } from "zustand";
import { ReportColumn } from "@/types/report-type";

export type WizardStep = "details" | "sql" | "parameters" | "headers" | "summary";

export interface WizardHeader {
  original_column: string;
  display_name: string;
  is_selected: boolean;
}

interface ReportWizardState {
  currentStep: WizardStep;
  reportId: string | null;
  connectionId: number | null;
  reportCategoryId: number | null;
  name: string;
  description: string;
  filenamePattern: string | null;
  sqlQuery: string;
  detectedParameters: string[];
  discardedParameters: string[];
  dryRunColumns: ReportColumn[];
  headers: WizardHeader[];

  setStep: (step: WizardStep) => void;
  setConnectionAndSql: (connectionId: number, sql: string) => void;
  setDetails: (data: {
    connectionId: number;
    reportCategoryId: number | null;
    name: string;
    description: string;
    filenamePattern?: string | null;
  }) => void;
  setSql: (sql: string) => void;
  setDryRunResult: (columns: ReportColumn[], params: string[]) => void;
  setDiscardedParameters: (params: string[]) => void;
  discardParameter: (name: string) => void;
  restoreParameter: (name: string) => void;
  setHeaders: (headers: WizardHeader[]) => void;
  setReportId: (id: string) => void;
  reset: () => void;
}

const initialState = {
  currentStep: "details" as WizardStep,
  reportId: null,
  connectionId: null,
  reportCategoryId: null,
  name: "",
  description: "",
  filenamePattern: null,
  sqlQuery: "",
  detectedParameters: [],
  discardedParameters: [],
  dryRunColumns: [],
  headers: [],
};

export const useReportWizardStore = create<ReportWizardState>((set) => ({
  ...initialState,

  setStep: (step) => set({ currentStep: step }),

  setConnectionAndSql: (connectionId, sqlQuery) =>
    set({ connectionId, sqlQuery }),

  setDetails: ({ connectionId, reportCategoryId, name, description, filenamePattern }) =>
    set({
      connectionId,
      reportCategoryId,
      name,
      description,
      filenamePattern: filenamePattern ?? null,
      currentStep: "sql",
    }),

  setSql: (sqlQuery) => set({ sqlQuery }),

  setDryRunResult: (dryRunColumns, detectedParameters) =>
    set({ dryRunColumns, detectedParameters }),

  setDiscardedParameters: (discardedParameters) =>
    set({ discardedParameters }),

  discardParameter: (name) =>
    set((state) => ({
      discardedParameters: state.discardedParameters.includes(name)
        ? state.discardedParameters
        : [...state.discardedParameters, name],
    })),

  restoreParameter: (name) =>
    set((state) => ({
      discardedParameters: state.discardedParameters.filter((p) => p !== name),
    })),

  setHeaders: (headers) => set({ headers }),

  setReportId: (reportId) => set({ reportId }),

  reset: () => set({ ...initialState }),
}));
