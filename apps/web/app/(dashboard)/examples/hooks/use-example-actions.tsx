import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import {
  ModalActionType,
} from "@/hooks/zustand/use-modal-action-store";
import { useState } from "react";
import { toast } from "sonner";
import useErrorHandler from "@/hooks/use-form-error-handler";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ExampleFormSchema, ExampleFormValues } from "../types/example-types";
import { deleteExampleService, saveExampleService, updateExampleService } from "../services/example-service";

interface Props {
  values?: ExampleFormValues;
  action: ModalActionType;
}

const useExampleActions = ({ values, action }: Props) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const form = useForm<ExampleFormValues>({
    resolver: zodResolver(ExampleFormSchema),
    defaultValues: values,
  });

  const queryClient = useQueryClient();

  const toastMessage = (action: ModalActionType): string => {
    switch (action) {
      case "create":
        return "Ejemplo creado exitosamente";
      case "update":
        return "Ejemplo actualizado exitosamente";
      case "delete":
        return "Ejemplo eliminado exitosamente";
      default:
        return "Operación realizada exitosamente";
    }
  };

  const { errorhandler } = useErrorHandler({
    setError: form.setError,
  });

  const saveMutation = useMutation({
    mutationFn: (data: ExampleFormValues) =>
      action === "create"
        ? saveExampleService(data)
        : updateExampleService(data),
    onSuccess: () => {
      form.reset();
      toast.success(toastMessage(action), { closeButton: true });
      queryClient.invalidateQueries({ queryKey: ["examples"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: ({ id, force }: { id: string; force: boolean }) =>
      deleteExampleService(id, force),
    onSuccess: () => {
      toast.success(toastMessage("delete"), { closeButton: true });
      queryClient.invalidateQueries({
        queryKey: ["examples"],
      });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const saveExample = async (data: ExampleFormValues) => {
    setIsLoading(true);
    try {
      await saveMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteExample = async (id: string, force: boolean) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync({ id, force });
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    saveExample,
    isLoading,
    deleteExample,
  };
};

export default useExampleActions;
