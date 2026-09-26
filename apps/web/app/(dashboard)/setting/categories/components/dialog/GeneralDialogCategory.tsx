"use client";
import React, { JSX } from "react";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import AlertDeleteDialog from "@/components/common/dialog/AlertDeleteDialog";
import TemplateDialog from "@/components/common/templates/template-dialog";
import { ReportCategory } from "@/types/report-category-type";
import useCategoryActions from "../../hooks/use-category-actions";
import {
  ModalsNameCategory,
  ModalsTitleCategory,
} from "../../constants/category-constants";
import CategoryForm from "../form/CategoryForm";

interface CreateData {
  parent?: ReportCategory | null;
}

const GeneralDialogCategory = () => {
  const { closeModal, name, open, action, data } = useModalActionStore();

  const category = (data && "attributes" in (data as object))
    ? (data as ReportCategory)
    : null;

  const createData = (data && "parent" in (data as object))
    ? (data as CreateData)
    : null;

  const { deleteCategory, isLoading } = useCategoryActions({
    action: "delete",
  });

  const handleDelete = async () => {
    if (category?.id) {
      try {
        await deleteCategory(category.id);
        closeModal();
      } catch {}
    }
  };

  const modalForms: Record<ModalsNameCategory, JSX.Element> = {
    createCategory: (
      <CategoryForm
        closeModal={() => closeModal()}
        action={action}
        values={{ name: "" }}
        parent={createData?.parent ?? null}
      />
    ),
    updateCategory: (
      <CategoryForm
        closeModal={() => closeModal()}
        action={action}
        values={
          category
            ? {
                id: String(category.id),
                name: category.attributes.name,
                parent_id: category.relationships.parent_id != null
                  ? String(category.relationships.parent_id)
                  : "",
              }
            : { name: "" }
        }
        parent={null}
      />
    ),
    deleteCategory: (
      <AlertDeleteDialog
        closeModal={() => closeModal()}
        action={handleDelete}
        isLoading={isLoading}
        title="Eliminar categoría"
        description={`¿Estás seguro de que deseas eliminar la categoría "${category?.attributes.name}"? Sus subcategorías pasarán a ser categorías de nivel superior. Esta acción no se puede deshacer.`}
      />
    ),
  };

  const isCategoryModal = Object.values(ModalsNameCategory).includes(
    name as ModalsNameCategory
  );

  if (!open || !isCategoryModal) return null;

  return (
    <TemplateDialog
      open={open}
      setOpen={() => closeModal()}
      className="sm:max-w-lg w-full"
      title={ModalsTitleCategory[name as ModalsNameCategory]}
    >
      {modalForms[name as ModalsNameCategory]}
    </TemplateDialog>
  );
};

export default GeneralDialogCategory;