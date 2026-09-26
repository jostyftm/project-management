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
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { UserItem } from "../../types/user-types";
import { ModalsNameUser } from "../../constants/user-constants";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import useModuleActions from "@/hooks/permission-guard/use-module-actions";

interface Props {
  user: UserItem;
}

const ActionsUsers = ({ user }: Props) => {
  const [openMenu, setOpenMenu] = useState(false);
  const openModal = useModalActionStore((state) => state.openModal);

  const { canUpdate, canDelete } = useModuleActions();

  if (!canUpdate && !canDelete) {
    return null;
  }

  return (
    <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0 cursor-pointer">
          <span className="sr-only">Abrir menú</span>
          <BaseIcon name="Ellipsis" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-slate-700 space-y-1 p-2 w-48">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          <PermissionGuard action="update">
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => {
                setOpenMenu(false);
                openModal("update", ModalsNameUser.assignReports, user);
              }}
            >
              <BaseIcon name="FileSpreadsheet" size={16} />
              <span>Asignar reportes</span>
            </DropdownMenuItem>
          </PermissionGuard>
          <PermissionGuard action="update">
            <DropdownMenuItem
              className="cursor-pointer gap-2"
              onClick={() => {
                setOpenMenu(false);
                openModal("update", ModalsNameUser.editUser, user);
              }}
            >
              <BaseIcon name="Edit2" size={16} />
              <span>Editar</span>
            </DropdownMenuItem>
          </PermissionGuard>
          <DropdownMenuSeparator />
          <PermissionGuard action="delete">
            <DropdownMenuItem
              className="text-red-600 focus:text-red-600 cursor-pointer gap-2"
              onClick={() => {
                setOpenMenu(false);
                openModal("delete", ModalsNameUser.deleteUser, user);
              }}
            >
              <BaseIcon name="Trash2" size={16} />
              <span>Eliminar</span>
            </DropdownMenuItem>
          </PermissionGuard>
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
};

export default ActionsUsers;
