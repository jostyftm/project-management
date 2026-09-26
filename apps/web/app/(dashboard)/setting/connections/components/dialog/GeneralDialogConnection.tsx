"use client";
import React, { JSX } from "react";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import AlertDeleteDialog from "@/components/common/dialog/AlertDeleteDialog";
import TemplateDialog from "@/components/common/templates/template-dialog";
import { DatabaseConnection } from "@/types/connection-type";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { LaravelDriverCode } from "@/types/catalog-type";
import useConnectionActions from "../../hooks/use-connection-actions";
import {
  ModalsNameConnection,
  ModalsTitleConnection,
} from "../../constants/connection-constants";
import ConnectionForm from "../form/ConnectionForm";

const GeneralDialogConnection = () => {
  const { closeModal, name, open, action, data } = useModalActionStore();
  const connection = data as DatabaseConnection;

  const { deleteConnection, isLoading } = useConnectionActions({
    action: "delete",
    driverCode: "mysql",
  });

  const getDriverById = useCatalogStore((state) => state.getDriverById);
  const driverCode = connection
    ? (getDriverById(
        connection.relationships.driver?.id ?? -1
      )?.attributes.laravel_driver ?? null)
    : null;

  const handleDelete = async () => {
    if (connection?.id) {
      try {
        await deleteConnection(connection.id);
        closeModal();
      } catch {}
    }
  };

  const driverCredentials = (): Partial<{
    id: string;
    name: string;
    database_driver_id: string;
    host: string;
    port: string;
    db_name: string;
    schema: string;
    username: string;
    tns_string: string;
  }> => {
    if (!connection) return {};
    return {
      id: String(connection.id),
      name: connection.attributes.name,
      database_driver_id: connection.relationships.driver?.id
        ? String(connection.relationships.driver.id)
        : "",
      host: connection.attributes.host ?? "",
      port: connection.attributes.port ?? "",
      db_name: connection.attributes.db_name ?? "",
      schema: connection.attributes.schema ?? "",
      username: connection.attributes.username ?? "",
      tns_string: connection.attributes.tns_string ?? "",
    };
  };

  const modalForms: Record<ModalsNameConnection, JSX.Element> = {
    createConnection: (
      <ConnectionForm
        closeModal={() => closeModal()}
        action={action}
        values={{ name: "" }}
      />
    ),
    updateConnection: (
      <ConnectionForm
        closeModal={() => closeModal()}
        action={action}
        values={driverCredentials()}
        initialDriver={driverCode as LaravelDriverCode | null}
      />
    ),
    deleteConnection: (
      <AlertDeleteDialog
        closeModal={() => closeModal()}
        action={handleDelete}
        isLoading={isLoading}
        title="Eliminar conexión"
        description={`¿Estás seguro de que deseas eliminar la conexión "${connection?.attributes.name}"? Esta acción no se puede deshacer.`}
      />
    ),
  };

  const isConnectionModal = Object.values(ModalsNameConnection).includes(
    name as ModalsNameConnection
  );

  if (!open || !isConnectionModal) return null;

  return (
    <TemplateDialog
      open={open}
      setOpen={() => closeModal()}
      className="sm:max-w-2xl flex flex-col"
      ClassNameContainer="pr-2 py-1"
      title={ModalsTitleConnection[name as ModalsNameConnection]}
    >
      {modalForms[name as ModalsNameConnection]}
    </TemplateDialog>
  );
};

export default GeneralDialogConnection;
