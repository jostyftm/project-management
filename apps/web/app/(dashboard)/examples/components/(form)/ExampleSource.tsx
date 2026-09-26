"use client";
import React from "react";
import { Form } from "@/components/ui/form";
import FormFieldInput from "@/components/ui/form-field-input";
import { Button } from "@/components/ui/button";
import { ModalActionType } from "@/hooks/zustand/use-modal-action-store";
import useSourceActions from "../../hooks/use-example-actions";
import { ExampleFormValues } from "../../types/example-types";
// import PermissionGuard from "@/components/common/permision-guard/permission-guard";

const defaultValues: ExampleFormValues = {
  id: "",
  source_name: "",
  webhook_url: "",
  format_date: "",
};

interface Props {
  values?: ExampleFormValues;
  closeModal?: () => void;
  action: ModalActionType;
}

const FormExample = ({ values = defaultValues, closeModal, action }: Props) => {
  const isModeUpdate = action === "update";
  const textButton = isModeUpdate ? "Actualizar" : "Crear";

  const { form, saveExample, isLoading } = useSourceActions({
    values,
    action,
  });

  const handleForm = async (data: ExampleFormValues) => {
    try {
      await saveExample(data);
      closeModal?.();
    } catch { }
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleForm)}
        className="w-full grid gap-3 items-start"
      >
        <FormFieldInput
          control={form.control}
          name="source_name"
          label="Nombre de la fuente *"
          placeholder="Nombre descriptivo de la fuente"
          type="text"
        />

        <FormFieldInput
          control={form.control}
          name="format_date"
          label="Formato de fecha *"
          placeholder="Y-m-d"
          type="text"
        />

        <FormFieldInput
          control={form.control}
          name="webhook_url"
          label="URL (Webhook) *"
          placeholder="https://www.example.com"
          type="text"
        />

        <div className="col-span-full flex gap-2 justify-end">
          <Button
            variant={"outline"}
            type="button"
            onClick={closeModal}
            hidden={isModeUpdate}
          >
            Cancelar
          </Button>
          {/* <PermissionGuard
            requiredPermissions={
              action === "create"
                ? "inv_asset_resources.create"
                : "inv_asset_resources.update"
            }
          > */}
          <Button type="submit" disabled={!form.formState.isDirty || isLoading}>
            {isLoading ? "Cargando..." : textButton}
          </Button>
          {/* </PermissionGuard> */}
        </div>
      </form>
    </Form>
  );
};

export default FormExample;
