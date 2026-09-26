"use client";
import React from "react";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import AlertDeleteDialog from "@/components/common/dialog/AlertDeleteDialog";
import TemplateDialog from "@/components/common/templates/template-dialog";
import { UserItem } from "../../types/user-types";
import { ModalsNameUser } from "../../constants/user-constants";
import { useUserActions } from "../../hooks/use-user-actions";
import EditUserModal from "./EditUserModal";
import AssignReportsModal from "./AssignReportsModal";

const GeneralDialogUser = () => {
  const { closeModal, name, open, data } = useModalActionStore();
  const user = data as UserItem;
  const { deleteUser, isLoading } = useUserActions();

  const handleDelete = async () => {
    if (user?.id) {
      try {
        await deleteUser(user.id);
        closeModal();
      } catch {}
    }
  };

  const isDelete = name === ModalsNameUser.deleteUser;

  return (
    <>
      <EditUserModal />
      <AssignReportsModal />

      {open && isDelete && (
        <TemplateDialog
          open={open}
          setOpen={() => closeModal()}
          className="sm:max-w-md flex flex-col"
          title="Eliminar usuario"
        >
          <AlertDeleteDialog
            closeModal={() => closeModal()}
            action={handleDelete}
            isLoading={isLoading}
            title="Eliminar usuario"
            description={`¿Estás seguro de que deseas eliminar al usuario "${user?.attributes?.name || user?.attributes?.email}"? Se desvincularán todos los permisos de reportes asociados.`}
          />
        </TemplateDialog>
      )}
    </>
  );
};

export default GeneralDialogUser;
