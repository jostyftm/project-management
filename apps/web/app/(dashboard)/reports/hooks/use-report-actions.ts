import { useState } from "react";
import { toast } from "sonner";
import useErrorHandler from "@/hooks/use-form-error-handler";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteReportService,
  ReportFormValues,
  saveReportService,
  updateReportService,
} from "../services/report-service";
import { Report } from "@/types/report-type";

export const useReportActions = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { errorhandler } = useErrorHandler();

  const saveMutation = useMutation({
    mutationFn: ({
      data,
      id,
    }: {
      data: ReportFormValues;
      id?: string | number;
    }) => {
      const payload = {
        ...data,
        database_connection_id: Number(data.database_connection_id),
      };
      return id
        ? updateReportService(id, payload)
        : saveReportService(payload);
    },
    onSuccess: (_data, variables) => {
      toast.success(
        variables.id
          ? "Reporte actualizado exitosamente"
          : "Reporte creado exitosamente",
        { closeButton: true }
      );
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteReportService(id),
    onSuccess: () => {
      toast.success("Reporte eliminado exitosamente", { closeButton: true });
      queryClient.invalidateQueries({ queryKey: ["reports"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const saveReport = async (
    data: ReportFormValues,
    id?: string | number
  ): Promise<Report | undefined> => {
    setIsLoading(true);
    try {
      const res = await saveMutation.mutateAsync({ data, id });
      return res?.data as Report;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteReport = async (id: string | number) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    saveReport,
    deleteReport,
    isLoading,
  };
};
