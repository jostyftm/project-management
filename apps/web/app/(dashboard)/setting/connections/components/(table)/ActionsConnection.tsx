"use client";
import React, { useState } from "react";
import BaseIcon from "@/components/ui/base-icon";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { DatabaseConnection } from "@/types/connection-type";
import { ModalsNameConnection } from "../../constants/connection-constants";
import useModuleActions from "@/hooks/permission-guard/use-module-actions";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";

interface Props {
  connection: DatabaseConnection;
}

const ActionsConnection = ({ connection }: Props) => {
  const [openMenu, setOpenMenu] = useState(false);
  const openModal = useModalActionStore((state) => state.openModal);

  const { canUpdate, canDelete } = useModuleActions();

  // Si el usuario no tiene permisos para actualizar ni para eliminar, ocultar los 3 puntos
  if (!canUpdate && !canDelete) {
    return null;
  }

  return (
    <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
          <span className="sr-only">Open menu</span>
          <BaseIcon name="Ellipsis" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-slate-70 space-y-2 p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <PermissionGuard action="update">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() =>
                openModal("update", ModalsNameConnection.updateConnection, connection)
              }
            >
              <BaseIcon name="Edit2" size={16} />
              <span>Actualizar</span>
            </DropdownMenuItem>
          </PermissionGuard>
          <PermissionGuard action="delete">
            <DropdownMenuItem
              className="text-red-500 focus:text-red-500 cursor-pointer"
              onClick={() =>
                openModal("delete", ModalsNameConnection.deleteConnection, connection)
              }
            >
              <BaseIcon name="X" size={16} />
              <span>Eliminar</span>
            </DropdownMenuItem>
          </PermissionGuard>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionsConnection;
