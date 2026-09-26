import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  requestAlerts,
  requestToggleAlert,
  requestDeleteAlert,
  requestTestAlert,
  requestCreateAlert,
  requestUpdateAlert,
} from "@/services/alert-service";
import { AlertFormPayload } from "@/types/alert-types";
import { toast } from "sonner";

export const useAlerts = (params?: Record<string, any>) => {
  const { data, error, refetch, isPending, isFetching } = useQuery({
    queryKey: ["report-alerts", params],
    queryFn: () => requestAlerts(params),
  });

  return {
    alerts: data?.data ?? [],
    total: (data as any)?.total ?? data?.meta?.total ?? 0,
    currentPage: (data as any)?.current_page ?? data?.meta?.current_page ?? 1,
    lastPage: (data as any)?.last_page ?? data?.meta?.last_page ?? 1,
    isLoading: isPending,
    isFetching,
    error,
    refetch,
  };
};

export const useAlertActions = () => {
  const queryClient = useQueryClient();

  const toggleMutation = useMutation({
    mutationFn: (id: number | string) => requestToggleAlert(id),
    onSuccess: (res) => {
      toast.success(res.message || "Estado de la alerta actualizado.");
      queryClient.invalidateQueries({ queryKey: ["report-alerts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al actualizar el estado de la alerta.");
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: number | string) => requestDeleteAlert(id),
    onSuccess: () => {
      toast.success("Alerta eliminada exitosamente.");
      queryClient.invalidateQueries({ queryKey: ["report-alerts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al eliminar la alerta.");
    },
  });

  const createMutation = useMutation({
    mutationFn: (payload: AlertFormPayload) => requestCreateAlert(payload),
    onSuccess: (res) => {
      toast.success(res.message || "Alerta configurada exitosamente.");
      queryClient.invalidateQueries({ queryKey: ["report-alerts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al crear la alerta.");
    },
  });

  const updateMutation = useMutation({
    mutationFn: ({ id, payload }: { id: number | string; payload: Partial<AlertFormPayload> }) =>
      requestUpdateAlert(id, payload),
    onSuccess: (res) => {
      toast.success(res.message || "Alerta actualizada exitosamente.");
      queryClient.invalidateQueries({ queryKey: ["report-alerts"] });
    },
    onError: (err: any) => {
      toast.error(err?.message || "Error al actualizar la alerta.");
    },
  });

  return {
    toggleAlert: toggleMutation.mutateAsync,
    isToggling: toggleMutation.isPending,
    deleteAlert: deleteMutation.mutateAsync,
    isDeleting: deleteMutation.isPending,
    createAlert: createMutation.mutateAsync,
    isCreating: createMutation.isPending,
    updateAlert: updateMutation.mutateAsync,
    isUpdating: updateMutation.isPending,
  };
};
