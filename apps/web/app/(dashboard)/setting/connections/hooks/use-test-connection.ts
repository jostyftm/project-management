import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";

import {
  ConnectionTestValues,
  testConnectionService,
} from "../services/connection-service";

export function useTestConnection() {
  return useMutation({
    mutationFn: (data: ConnectionTestValues) => testConnectionService(data),
    onSuccess: () => {
      toast.success("Conexión exitosa", {
        description: "Los parámetros de conexión son correctos.",
        duration: 6000,
        closeButton: true,
      });
    },
  });
}