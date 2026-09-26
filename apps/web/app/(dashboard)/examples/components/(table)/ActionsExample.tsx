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
// import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import { ExampleType } from "@/types/example-type";
import { ModalsNameExample } from "../../constants/example-contants";

interface Props {
  example: ExampleType;
}

const ActionsExample = ({ example }: Props) => {
  const [openMenu, setOpenMenu] = useState(false);
  const openModal = useModalActionStore((state) => state.openModal);
  return (
    // <PermissionGuard requiredPermissions={['aud_scrutiny_config_sources.update', 'aud_scrutiny_config_sources.delete']}>
    <DropdownMenu open={openMenu} onOpenChange={setOpenMenu}>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" className="h-8 w-8 p-0">
          <span className="sr-only">Open menu</span>
          <BaseIcon name="Ellipsis" />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="text-slate-70 space-y-2 p-2">
        <DropdownMenuGroup>
          <DropdownMenuLabel>Acciones</DropdownMenuLabel>
          {/* <PermissionGuard
              requiredPermissions={[
                "aud_scrutiny_config_sources.update",
              ]}
            > */}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() =>
              openModal("update", ModalsNameExample.updateExample, example)
            }
          >
            <BaseIcon name="Edit2" size={16} />
            <span>Actualizar</span>
          </DropdownMenuItem>
          {/* </PermissionGuard> */}

          {/* <PermissionGuard
              requiredPermissions={["aud_scrutiny_config_sources.delete"]}
            > */}
          <DropdownMenuItem
            className="text-red-500 focus:text-red-500 cursor-pointer"
            onClick={() =>
              openModal("delete", ModalsNameExample.deleteExample, example)
            }
          >
            <BaseIcon name="X" size={16} />
            <span>Eliminar</span>
          </DropdownMenuItem>
          {/* </PermissionGuard> */}
        </DropdownMenuGroup>
      </DropdownMenuContent>
    </DropdownMenu>
    // </PermissionGuard>
  );
};

export default ActionsExample;
