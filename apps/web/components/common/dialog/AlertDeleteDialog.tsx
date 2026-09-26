import React from "react";
import BubbleIcon from "@/components/ui/Bubble-icon";
import { Button } from "@/components/ui/button";

interface Props {
  closeModal: () => void;
  isLoading: boolean;
  action: () => void;
  title?: string;
  description?: string;
  content?: React.ReactNode;
}

const AlertDeleteDialog = ({
  closeModal,
  isLoading,
  action,
  title = "Borrar elemento",
  description = "¿Estás seguro de que deseas eliminar este elemento? Esta acción no se puede deshacer.",
  content,
}: Props) => {
  return (
    <div className="flex flex-col items-center  gap-5">
      <BubbleIcon icon="lucide:trash-2" theme="red" iconSize={40} />
      <article>
        <h2 className="text-2xl text-center font-bold">{title} </h2>
        <p className="mt-4 ">{description}</p>
      </article>
      {content}
      <div className="w-full flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={closeModal}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={"destructive"}
          onClick={action}
          disabled={isLoading}
        >
          {isLoading ? "Cargando..." : "Eliminar"}
        </Button>
      </div>
    </div>
  );
};

export default AlertDeleteDialog;
