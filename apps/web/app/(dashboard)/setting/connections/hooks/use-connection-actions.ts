import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ModalActionType } from "@/hooks/zustand/use-modal-action-store";
import { useState, useMemo } from "react";
import { toast } from "sonner";
import useErrorHandler from "@/hooks/use-form-error-handler";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { LaravelDriverCode } from "@/types/catalog-type";
import {
  buildConnectionSchema,
  ConnectionFormValues,
} from "../types/connection-types";
import {
  deleteConnectionService,
  saveConnectionService,
  updateConnectionService,
} from "../services/connection-service";

interface Props {
  values?: Partial<ConnectionFormValues>;
  action: ModalActionType;
  driverCode: LaravelDriverCode | null;
}

const useConnectionActions = ({ values, action, driverCode }: Props) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const schema = useMemo(() => buildConnectionSchema(driverCode), [driverCode]);
  const form = useForm<ConnectionFormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      id: "",
      name: "",
      database_driver_id: "",
      host: "",
      port: "",
      db_name: "",
      schema: "",
      username: "",
      password: "",
      tns_string: "",
      ...values,
    },
  });

  const queryClient = useQueryClient();

  const toastMessage = (action: ModalActionType): string => {
    switch (action) {
      case "create":
        return "Conexión creada exitosamente";
      case "update":
        return "Conexión actualizada exitosamente";
      case "delete":
        return "Conexión eliminada exitosamente";
      default:
        return "Operación realizada exitosamente";
    }
  };

  const { errorhandler } = useErrorHandler({
    setError: form.setError,
  });

  const saveMutation = useMutation({
    mutationFn: (data: ConnectionFormValues) => {
      const payload = {
        ...data,
        database_driver_id: Number(data.database_driver_id),
      };
      return action === "create"
        ? saveConnectionService(payload)
        : updateConnectionService(data.id!, payload);
    },
    onSuccess: () => {
      form.reset();
      toast.success(toastMessage(action), { closeButton: true });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteConnectionService(id),
    onSuccess: () => {
      toast.success(toastMessage("delete"), { closeButton: true });
      queryClient.invalidateQueries({ queryKey: ["connections"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const saveConnection = async (data: ConnectionFormValues) => {
    setIsLoading(true);
    try {
      await saveMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteConnection = async (id: string | number) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    saveConnection,
    isLoading,
    deleteConnection,
  };
};

export default useConnectionActions;
