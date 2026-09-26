import { useState } from "react";
import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { ApiErrorException } from "@/lib/request";
import { executeReportQueryService } from "../services/report-service";
import { QueryExecutionResult } from "../types/query-execute-type";

export const useExecuteQuery = () => {
  const [result, setResult] = useState<QueryExecutionResult | null>(null);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (variables: {
      connectionId: number | string;
      sql: string;
      values?: Record<string, unknown>;
      limit?: number;
      discarded_parameters?: string[];
    }) =>
      executeReportQueryService({
        database_connection_id: variables.connectionId,
        sql_query: variables.sql,
        values: variables.values,
        limit: variables.limit,
        discarded_parameters: variables.discarded_parameters,
      }),
  });

  const execute = async (
    connectionId: number | string,
    sql: string,
    values?: Record<string, unknown>,
    limit = 50,
    discarded_parameters?: string[]
  ) => {
    setErrorMessage(null);
    try {
      const res = await mutation.mutateAsync({
        connectionId,
        sql,
        values,
        limit,
        discarded_parameters,
      });
      const data = res.data;
      setResult(data);
      toast.success(
        `Consulta ejecutada exitosamente (${data.row_count} filas en ${data.execution_time_ms} ms)`,
        { closeButton: true }
      );
      return data;
    } catch (err: unknown) {
      const msg =
        err instanceof ApiErrorException
          ? err.message
          : (err as { message?: string })?.message || "Error al ejecutar la consulta";
      setErrorMessage(msg);
      toast.error(msg, { closeButton: true });
      return null;
    }
  };

  const clearResult = () => {
    setResult(null);
    setErrorMessage(null);
  };

  return {
    execute,
    result,
    errorMessage,
    isLoading: mutation.isPending,
    clearResult,
  };
};
