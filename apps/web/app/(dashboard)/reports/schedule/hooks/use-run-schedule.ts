"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { runScheduleService } from "../services/schedule-service";

export const useRunSchedule = () => {
  const router = useRouter();
  const [isRunning, setIsRunning] = useState<string | number | null>(null);

  const runSchedule = async (scheduleId: string | number) => {
    setIsRunning(scheduleId);
    try {
      await runScheduleService(scheduleId);
      toast.success("La programación se encoló para su ejecución.", {
        description: "Sigue el estado en la pestaña de Ejecuciones.",
        action: {
          label: "Ver ejecuciones",
          onClick: () => router.push("/reports/executions"),
        },
        closeButton: true,
      });
      return true;
    } catch (error) {
      toast.error((error as Error)?.message ?? "Error al encolar la ejecución");
      return false;
    } finally {
      setIsRunning(null);
    }
  };

  return { runSchedule, isRunning };
};