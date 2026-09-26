"use client";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { useRouter } from "next/navigation";
import { useMemo } from "react";
import {
  saveScheduleService,
  updateScheduleService,
  deleteScheduleService,
  cloneScheduleService,
  bulkToggleScheduleService,
  ScheduleFormValues,
} from "../services/schedule-service";

interface Props {
  scheduleId?: string | number;
  refetch?: () => void;
}

export const useScheduleActions = ({ scheduleId, refetch }: Props) => {
  const router = useRouter();
  const queryClient = useQueryClient();

  const invalidate = () => {
    queryClient.invalidateQueries({ queryKey: ["report-schedules"] });
  };

  const createSchedule = useMutation({
    mutationFn: (data: ScheduleFormValues) => saveScheduleService(data),
    onSuccess: () => {
      invalidate();
      refetch?.();
      toast.success("Programación creada correctamente");
      router.push("/reports/schedule");
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message ?? "Error al crear la programación");
    },
  });

  const editSchedule = useMutation({
    mutationFn: (data: ScheduleFormValues) => {
      if (scheduleId === undefined) throw new Error("scheduleId required");
      return updateScheduleService(scheduleId, data);
    },
    onSuccess: () => {
      invalidate();
      refetch?.();
      toast.success("Programación actualizada correctamente");
      router.push("/reports/schedule");
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message ?? "Error al actualizar la programación");
    },
  });

  const deleteSchedule = useMutation({
    mutationFn: (id: string | number) => deleteScheduleService(id),
    onSuccess: () => {
      invalidate();
      refetch?.();
      toast.success("Programación eliminada correctamente");
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message ?? "Error al eliminar la programación");
    },
  });

  const cloneSchedule = useMutation({
    mutationFn: (id: string | number) => cloneScheduleService(id),
    onSuccess: () => {
      invalidate();
      refetch?.();
      toast.success("Programación duplicada correctamente (en estado inactivo)");
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message ?? "Error al duplicar la programación");
    },
  });

  const bulkToggleSchedule = useMutation({
    mutationFn: ({ ids, status }: { ids: (string | number)[]; status: "active" | "inactive" }) =>
      bulkToggleScheduleService(ids, status),
    onSuccess: (res) => {
      invalidate();
      refetch?.();
      toast.success(res?.message ?? "Programaciones actualizadas correctamente");
    },
    onError: (error: unknown) => {
      toast.error((error as Error)?.message ?? "Error al actualizar programaciones");
    },
  });

  const isLoading = useMemo(
    () => createSchedule.isPending || editSchedule.isPending || cloneSchedule.isPending || bulkToggleSchedule.isPending,
    [createSchedule.isPending, editSchedule.isPending, cloneSchedule.isPending, bulkToggleSchedule.isPending]
  );

  return {
    createSchedule,
    editSchedule,
    deleteSchedule,
    cloneSchedule,
    bulkToggleSchedule,
    isLoading,
  };
};
