import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { ModalActionType } from "@/hooks/zustand/use-modal-action-store";
import { useState } from "react";
import { toast } from "sonner";
import useErrorHandler from "@/hooks/use-form-error-handler";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import {
  deleteReportCategoryService,
  saveReportCategoryService,
  updateReportCategoryService,
} from "@/services/catalogs/report-category-service";
import {
  CategoryFormSchema,
  CategoryFormValues,
} from "../types/category-types";

interface Props {
  values?: Partial<CategoryFormValues>;
  action: ModalActionType;
}

const useCategoryActions = ({ values, action }: Props) => {
  const [isLoading, setIsLoading] = useState<boolean>(false);

  const form = useForm<CategoryFormValues>({
    resolver: zodResolver(CategoryFormSchema),
    defaultValues: {
      id: "",
      name: "",
      parent_id: "",
      ...values,
    },
  });

  const queryClient = useQueryClient();

  const toastMessage = (a: ModalActionType): string => {
    switch (a) {
      case "create":
        return "Categoría creada exitosamente";
      case "update":
        return "Categoría actualizada exitosamente";
      case "delete":
        return "Categoría eliminada exitosamente";
      default:
        return "Operación realizada exitosamente";
    }
  };

  const { errorhandler } = useErrorHandler({ setError: form.setError });

  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: ["report-categories"] });

  const saveMutation = useMutation({
    mutationFn: (data: CategoryFormValues) => {
      const payload = {
        name: data.name,
        parent_id: data.parent_id ? Number(data.parent_id) : null,
      };
      return action === "create"
        ? saveReportCategoryService(payload)
        : updateReportCategoryService(data.id!, payload);
    },
    onSuccess: () => {
      form.reset();
      toast.success(toastMessage(action), { closeButton: true });
      invalidate();
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: (id: string | number) => deleteReportCategoryService(id),
    onSuccess: () => {
      toast.success(toastMessage("delete"), { closeButton: true });
      invalidate();
    },
    onError: (error: unknown) => {
      errorhandler(error);
    },
  });

  const saveCategory = async (data: CategoryFormValues) => {
    setIsLoading(true);
    try {
      await saveMutation.mutateAsync(data);
    } finally {
      setIsLoading(false);
    }
  };

  const deleteCategory = async (id: string | number) => {
    setIsLoading(true);
    try {
      await deleteMutation.mutateAsync(id);
    } finally {
      setIsLoading(false);
    }
  };

  return {
    form,
    saveCategory,
    isLoading,
    deleteCategory,
  };
};

export default useCategoryActions;