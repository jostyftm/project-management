import React from "react";
import BubbleIcon from "@/components/ui/Bubble-icon";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

interface Props {
  closeModal: () => void;
  isLoading: boolean;
  action: () => void;
  title?: string;
  description?: string;
  confirmLabel?: string;
  icon?: string; // e.g., "lucide:play" | "lucide:settings"
  content?: React.ReactNode;
}

const AlertConfigDialog = ({
  closeModal,
  isLoading,
  action,
  title = "Confirmar acción",
  description = "¿Deseas continuar con la acción solicitada?",
  confirmLabel = "Confirmar",
  icon = "lucide:play",
  content,
}: Props) => {
  return (
    <div className="flex flex-col items-center gap-5">
      <div className={cn(isLoading ? "animate-spin" : "")}>
        <BubbleIcon
          icon={isLoading ? "lucide:loader-2" : icon}
          theme={isLoading ? "gray" : "blue"}
          iconSize={40}
        />
      </div>
      <article>
        <h2 className="text-2xl text-center font-bold">{title}</h2>
        <p className="mt-4">{description}</p>
      </article>
      {content}
      <div className="w-full flex justify-end gap-2">
        <Button variant="outline" type="button" onClick={closeModal}>
          Cancelar
        </Button>
        <Button
          type="submit"
          variant={"default"}
          onClick={action}
          disabled={isLoading}
        >
          {isLoading ? "Cargando..." : confirmLabel}
        </Button>
      </div>
    </div>
  );
};

export default AlertConfigDialog;
