"use client";
import React, { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Report } from "@/types/report-type";
import { ModalsNameReport } from "../../constants/report-constants";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import useModuleActions from "@/hooks/permission-guard/use-module-actions";

interface Props {
  report: Report;
}

const ActionsReport = ({ report }: Props) => {
  const [openMenu, setOpenMenu] = useState(false);
  const router = useRouter();
  const openModal = useModalActionStore((state) => state.openModal);

  const { canUpdate, canDelete } = useModuleActions();

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

          {/* Ver historial — siempre visible (1.1) */}
          <DropdownMenuItem
            className="cursor-pointer"
            onClick={() => {
              setOpenMenu(false);
              router.push(`/reports/executions?report_id=${report.id}`);
            }}
          >
            <BaseIcon name="History" size={16} />
            <span>Ver historial</span>
          </DropdownMenuItem>

          {(canUpdate || canDelete) && <DropdownMenuSeparator />}

          <PermissionGuard action="update">
            <DropdownMenuItem
              className="cursor-pointer"
              onClick={() => {
                setOpenMenu(false);
                router.push(`/reports/${report.id}/edit`);
              }}
            >
              <BaseIcon name="Edit2" size={16} />
              <span>Editar</span>
            </DropdownMenuItem>
          </PermissionGuard>
          <PermissionGuard action="delete">
            <DropdownMenuItem
              className="text-red-500 focus:text-red-500 cursor-pointer"
              onClick={() =>
                openModal("delete", ModalsNameReport.deleteReport, report)
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

export default ActionsReport;
