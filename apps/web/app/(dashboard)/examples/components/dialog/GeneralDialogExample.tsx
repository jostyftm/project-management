"use client";
import React, { JSX } from "react";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import AlertDeleteDialog from "@/components/common/dialog/AlertDeleteDialog";
import TemplateDialog from "@/components/common/templates/template-dialog";
import useSourceActions from "../../hooks/use-example-actions";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { ExampleType } from "@/types/example-type";
import { ModalsNameExample, ModalsTitleExample } from "../../constants/example-contants";
import FormExample from "../(form)/ExampleSource";

const GeneralDialogExample = () => {
  const { closeModal, name, open, action, data } = useModalActionStore();
  const example = data as ExampleType;

  const { deleteExample, isLoading } = useSourceActions({
    action: "delete",
  });

  const [force, setForce] = React.useState(false);

  const handleDelete = async () => {
    if (example.id) {
      try {
        await deleteExample(example.id, force);
        closeModal();
      } catch { }
    }
  };

  const modalForms: Record<ModalsNameExample, JSX.Element> = {
    createExample: (
      <FormExample
        closeModal={() => closeModal()}
        action={action}
        values={{
          id: "",
          source_name: "",
          webhook_url: "",
          format_date: "",
        }}
      />
    ),
    updateExample: (
      <FormExample
        closeModal={() => closeModal()}
        action={action}
        values={{
          webhook_url: example?.attributes.webhook_url,
          source_name: example?.attributes.source_name,
          id: String(example?.id),
          format_date: example?.attributes.format_date,
        }}
      />
    ),
    deleteExample: (
      <AlertDeleteDialog
        closeModal={() => closeModal()}
        action={handleDelete}
        isLoading={isLoading}
        title="Eliminar ejemplo"
        description={`¿Estás seguro de que deseas eliminar el ejemplo "${example?.attributes.source_name}"? Esta acción no se puede deshacer.`}
        content={
          <div className="mt-4">
            <div className="flex items-center gap-3 text-muted-foreground">
              <Checkbox
                id="forceDelete"
                checked={force}
                onCheckedChange={(checked) => setForce(!!checked)}
              />
              <Label htmlFor="forceDelete">
                Forzar eliminación (Eliminar incluso si el ejemplo está en uso)
              </Label>
            </div>
          </div>
        }
      />
    ),
  };

  const isExampleModal = Object.values(ModalsNameExample).includes(
    name as ModalsNameExample
  );

  if (!open || !isExampleModal) return null;

  return (
    <TemplateDialog
      open={open}
      setOpen={() => closeModal()}
      className="sm:max-w-3xl flex flex-col w-150"
      title={ModalsTitleExample[name as ModalsNameExample]}
    >
      {modalForms[name as ModalsNameExample]}
    </TemplateDialog>
  );
};

export default GeneralDialogExample;
