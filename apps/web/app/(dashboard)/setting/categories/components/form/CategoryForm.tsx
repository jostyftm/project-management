"use client";
import React, { useMemo } from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import FormFieldInput from "@/components/ui/form-field-input";
import { ModalActionType } from "@/hooks/zustand/use-modal-action-store";
import { useListReportCategories } from "@/hooks/use-list-report-categories";
import useCategoryActions from "../../hooks/use-category-actions";
import { collectSubtreeIds } from "../tree/buildCategoryTree";
import { CategoryFormValues } from "../../types/category-types";
import { ReportCategory } from "@/types/report-category-type";

interface Props {
  values?: Partial<CategoryFormValues>;
  parent?: ReportCategory | null;
  closeModal?: () => void;
  action: ModalActionType;
}

const CategoryForm = ({ values, parent, closeModal, action }: Props) => {
  const isModeUpdate = action === "update";
  const textButton = isModeUpdate ? "Actualizar" : "Crear";

  const formValues = useMemo<Partial<CategoryFormValues> | undefined>(
    () =>
      values && (values.parent_id || (parent != null && action === "create"))
        ? {
            ...values,
            parent_id:
              values.parent_id ?? (parent != null ? String(parent.id) : ""),
          }
        : values,
    [values, parent, action]
  );

  const { form, saveCategory, isLoading } = useCategoryActions({
    values: formValues,
    action,
  });

  const { data: categories } = useListReportCategories();

  const parentOptions = useMemo(() => {
    let excluded = new Set<number>();
    if (isModeUpdate && formValues?.id) {
      excluded = collectSubtreeIds(categories, Number(formValues.id));
    }

    return categories
      .filter((category) => !excluded.has(category.id))
      .map((category) => ({
        value: String(category.id),
        label: category.attributes.name,
      }));
  }, [categories, isModeUpdate, formValues]);

  const handleForm = async (data: CategoryFormValues) => {
    try {
      await saveCategory(data);
      closeModal?.();
    } catch {}
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleForm)}
        className="w-full grid gap-4 items-start"
      >
        <FormFieldInput
          control={form.control}
          name="name"
          label="Nombre de la categoría *"
          placeholder="Ej: Financiero"
          type="text"
        />

        <FormFieldInput
          control={form.control}
          name="parent_id"
          label="Categoría padre"
          placeholder="Sin categoría (raíz)"
          type="select"
          options={parentOptions}
          isSelectClearable
        />

        <div className="col-span-full flex gap-2 justify-end">
          <Button
            variant="outline"
            type="button"
            onClick={closeModal}
            hidden={isModeUpdate}
          >
            Cancelar
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty || isLoading}>
            {isLoading ? "Cargando..." : textButton}
          </Button>
        </div>
      </form>
    </Form>
  );
};

export default CategoryForm;