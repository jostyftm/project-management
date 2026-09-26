import { useState } from "react";
import { toast } from "sonner";
import useErrorHandler from "@/hooks/use-form-error-handler";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  assignReportsToUserService,
  deleteUserService,
  syncUsersService,
  updateUserService,
} from "../services/user-service";
import { UserItem, UserUpdateFormValues } from "../types/user-types";

export const useUserActions = () => {
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [isSyncing, setIsSyncing] = useState<boolean>(false);
  const queryClient = useQueryClient();
  const { errorhandler } = useErrorHandler();

  const updateMutation = useMutation({
    mutationFn: ({
      id,
      data,
    }: {
      id: string | number;
      data: UserUpdateFormValues;
    }) => updateUserService(id, data),
    onSuccess: () => {
      toast.success("Usuario actualizado exitosamente", { closeButton: true });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteUserService(id),
    onSuccess: () => {
      toast.success("Usuario eliminado exitosamente", { closeButton: true });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const assignReportsMutation = useMutation({
    mutationFn: ({
      userId,
      reportIds,
    }: {
      userId: string | number;
      reportIds: number[];
    }) => assignReportsToUserService(userId, reportIds),
    onSuccess: () => {
      toast.success("Reportes asignados exitosamente", { closeButton: true });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const syncMutation = useMutation({
    mutationFn: (data?: { application_id?: number; url?: string; sync?: boolean }) =>
      syncUsersService(data),
    onSuccess: (res) => {
      toast.success(res?.message || "Usuarios sincronizados correctamente", {
        closeButton: true,
      });
      queryClient.invalidateQueries({ queryKey: ["users"] });
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const updateUser = async (
    id: string | number,
    data: UserUpdateFormValues
  ): Promise<UserItem | undefined> => {
    setIsLoading(true);
    try {
      const res = await updateMutation.mutateAsync({ id, data });
      return res?.data as UserItem;
    } finally {
      setIsLoading(false);
    }
  };

  const deleteUser = async (id: string | number) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setIsLoading(false);
    }
  };

  const assignReports = async (
    userId: string | number,
    reportIds: number[]
  ): Promise<UserItem | undefined> => {
    setIsLoading(true);
    try {
      const res = await assignReportsMutation.mutateAsync({ userId, reportIds });
      return res?.data as UserItem;
    } finally {
      setIsLoading(false);
    }
  };

  const syncUsers = async (params?: {
    application_id?: number;
    url?: string;
    sync?: boolean;
  }) => {
    setIsSyncing(true);
    try {
      await syncMutation.mutateAsync(params);
    } finally {
      setIsSyncing(false);
    }
  };

  return {
    updateUser,
    deleteUser,
    assignReports,
    syncUsers,
    isLoading,
    isSyncing,
  };
};
