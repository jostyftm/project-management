"use client";
import React from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import FormFieldInput from "@/components/ui/form-field-input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { ModalActionType } from "@/hooks/zustand/use-modal-action-store";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { ApiErrorException } from "@/lib/request";
import { LaravelDriverCode } from "@/types/catalog-type";
import { toast } from "sonner";
import useConnectionActions from "../../hooks/use-connection-actions";
import { useTestConnection } from "../../hooks/use-test-connection";
import {
  ConnectionFormValues,
  NONE_DRIVER,
} from "../../types/connection-types";
import { OracleFields } from "./OracleFields";
import { MysqlPgFields } from "./MysqlPgFields";

interface InnerProps {
  values?: Partial<ConnectionFormValues>;
  closeModal?: () => void;
  action: ModalActionType;
  driverCode: LaravelDriverCode | null;
  onDriverChange: (code: LaravelDriverCode | null) => void;
}

export const ConnectionFormInner = ({
  values,
  closeModal,
  action,
  driverCode,
  onDriverChange,
}: InnerProps) => {
  const isModeUpdate = action === "update";
  const textButton = isModeUpdate ? "Actualizar" : "Crear";
  const drivers = useCatalogStore((state) => state.drivers) ?? [];
  const getDriverByCode = useCatalogStore((state) => state.getDriverByCode);

  const { form, saveConnection, isLoading } = useConnectionActions({
    values,
    action,
    driverCode,
  });

  const testConnection = useTestConnection();

  const initialDriverId = values?.database_driver_id
    ? Number(values.database_driver_id)
    : undefined;

  const handleDriverChange = (value: string) => {
    const id = Number(value);
    const driver =
      (drivers ?? []).find((d) => d.id === id) ??
      (id ? getDriverByCode(driverCode as LaravelDriverCode) : undefined);
    form.setValue("database_driver_id", id ? String(id) : "");
    onDriverChange(
      driver?.attributes.laravel_driver ??
        (value === NONE_DRIVER ? null : (driverCode as LaravelDriverCode))
    );
  };

  const handleTestConnection = () => {
    const formValues = form.getValues();
    const driverId = Number(formValues.database_driver_id);

    if (!driverId) {
      toast.error("Selecciona un driver", {
        description: "Debes elegir un driver antes de probar la conexión.",
        duration: 5000,
        closeButton: true,
      });
      return;
    }

    testConnection.mutate(
      {
        id: formValues.id,
        database_driver_id: driverId,
        host: formValues.host,
        port: formValues.port,
        db_name: formValues.db_name,
        schema: formValues.schema,
        username: formValues.username,
        password: formValues.password,
        tns_string: formValues.tns_string,
      },
      {
        onError: (error) => {
          const message =
            error instanceof ApiErrorException
              ? error.message
              : "No se pudo establecer la conexión.";
          toast.error("Error de conexión", {
            description: message,
            duration: 10000,
            closeButton: true,
          });
        },
      }
    );
  };

  const handleForm = async (data: ConnectionFormValues) => {
    try {
      await saveConnection(data);
      closeModal?.();
    } catch {}
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleForm)}
        className="w-full grid gap-4 items-start"
      >
        <FormFieldInput
          control={form.control}
          name="name"
          label="Nombre de la conexión *"
          placeholder="Ej: Conexión Producción"
          type="text"
        />

        <div className="grid gap-1.5">
          <label className="text-sm font-medium">Driver *</label>
          <Select
            value={
              initialDriverId ? String(initialDriverId) : undefined
            }
            onValueChange={handleDriverChange}
            disabled={isModeUpdate}
          >
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Selecciona un driver" />
            </SelectTrigger>
            <SelectContent>
              {(drivers || []).map((driver) => (
                <SelectItem
                  key={driver.id}
                  value={String(driver.id)}
                >
                  <span className="inline-flex items-center gap-2">
                    <span
                      className="inline-block h-2.5 w-2.5 rounded-full"
                      style={{
                        backgroundColor: driver.attributes.color ?? "#999",
                      }}
                    />
                    {driver.attributes.name}
                  </span>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <DynamicFields
          driverCode={driverCode}
          initialDriverId={initialDriverId}
        />

        <div className="col-span-full flex gap-2 justify-end pt-3 sticky bottom-0 bg-background/95 backdrop-blur py-2 border-t mt-2 z-10">
          <Button
            variant={"outline"}
            type="button"
            onClick={closeModal}
            hidden={isModeUpdate}
          >
            Cancelar
          </Button>
          <Button
            variant="secondary"
            type="button"
            onClick={handleTestConnection}
            disabled={testConnection.isPending}
          >
            {testConnection.isPending ? "Probando..." : "Probar conexión"}
          </Button>
          <Button type="submit" disabled={!form.formState.isDirty || isLoading}>
            {isLoading ? "Cargando..." : textButton}
          </Button>
        </div>
      </form>
    </Form>
  );
};

const DynamicFields = ({
  driverCode,
}: {
  driverCode: LaravelDriverCode | null;
  initialDriverId?: number;
}) => {
  if (driverCode === "oracle") {
    return <OracleFields />;
  }
  if (driverCode === "mysql" || driverCode === "pgsql") {
    return <MysqlPgFields />;
  }
  return <p className="text-sm text-muted-foreground">Selecciona un driver</p>;
};
