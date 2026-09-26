import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import useErrorHandler from "@/hooks/use-form-error-handler";
import { Report } from "@/types/report-type";
import {
  dryRunReportService,
  HeaderSyncItem,
  previewReportService,
  syncReportHeadersService,
} from "../services/report-service";
import { useReportWizardStore } from "@/hooks/zustand/use-report-wizard-store";

export const useDryRun = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const setDryRunResult = useReportWizardStore((s) => s.setDryRunResult);
  const setReportId = useReportWizardStore((s) => s.setReportId);
  const { errorhandler } = useErrorHandler();

  const dryRunMutation = useMutation({
    mutationFn: ({
      report,
      values,
    }: {
      report: Report;
      values?: Record<string, unknown>;
    }) => dryRunReportService(report.id, values),
    onSuccess: (res, variables) => {
      setReportId(String(variables.report.id));
      const params =
        variables.report.relationships.parameters?.map((p) => p.attributes.param_name) ??
        [];
      setDryRunResult(res.data, params);
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const runDryRun = async (
    report: Report,
    values?: Record<string, unknown>
  ) => {
    setIsLoading(true);
    try {
      await dryRunMutation.mutateAsync({ report, values });
      toast.success("Consulta validada correctamente", { closeButton: true });
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { runDryRun, isLoading };
};

export const useReportPreview = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const setDryRunResult = useReportWizardStore((s) => s.setDryRunResult);
  const setConnectionAndSql = useReportWizardStore((s) => s.setConnectionAndSql);
  const { errorhandler } = useErrorHandler();

  const previewMutation = useMutation({
    mutationFn: ({
      connectionId,
      sql,
      values,
      discarded_parameters,
    }: {
      connectionId: number;
      sql: string;
      values?: Record<string, unknown>;
      discarded_parameters?: string[];
    }) =>
      previewReportService({
        database_connection_id: connectionId,
        sql_query: sql,
        values,
        discarded_parameters,
      }),
    onSuccess: (res, variables) => {
      setConnectionAndSql(variables.connectionId, variables.sql);
      const columns = res.data;
      const params: string[] = [];
      setDryRunResult(columns, params);
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const runPreview = async (
    connectionId: number,
    sql: string,
    values?: Record<string, unknown>,
    discarded_parameters?: string[]
  ) => {
    setIsLoading(true);
    try {
      await previewMutation.mutateAsync({ connectionId, sql, values, discarded_parameters });
      toast.success("Consulta validada correctamente", { closeButton: true });
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { runPreview, isLoading };
};

export const useSyncHeaders = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const setHeaders = useReportWizardStore((s) => s.setHeaders);
  const { errorhandler } = useErrorHandler();

  const syncMutation = useMutation({
    mutationFn: ({
      reportId,
      headers,
    }: {
      reportId: string | number;
      headers: HeaderSyncItem[];
    }) => syncReportHeadersService(reportId, headers),
    onSuccess: (_res, variables) => {
      setHeaders(variables.headers);
      toast.success("Mapeo de columnas guardado", { closeButton: true });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const syncHeaders = async (
    reportId: string | number,
    headers: HeaderSyncItem[]
  ) => {
    setIsLoading(true);
    try {
      await syncMutation.mutateAsync({ reportId, headers });
      return true;
    } catch {
      return false;
    } finally {
      setIsLoading(false);
    }
  };

  return { syncHeaders, isLoading, headers: syncMutation.data };
};
