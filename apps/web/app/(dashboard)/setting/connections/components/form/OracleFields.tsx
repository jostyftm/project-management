"use client";
import React, { useState } from "react";
import { useFormContext } from "react-hook-form";
import FormFieldInput from "@/components/ui/form-field-input";
import {
  Tabs,
  TabsContent,
  TabsList,
  TabsTrigger,
} from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

export const OracleFields = () => {
  const [tab, setTab] = useState<string>("basic");
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <div className="grid gap-4">
      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Básico</TabsTrigger>
          <TabsTrigger value="advanced">Avanzado</TabsTrigger>
        </TabsList>

        <TabsContent value="basic" className="grid gap-4 md:grid-cols-2 mt-4">
          <FormFieldInput
            control={control}
            name="host"
            label="Host"
            placeholder="Ej: 192.168.1.10"
            type="text"
          />
          <FormFieldInput
            control={control}
            name="port"
            label="Puerto"
            placeholder="Ej: 1521"
            type="numberCustom"
          />
          <FormFieldInput
            control={control}
            name="db_name"
            label="SID / SERVICE_NAME"
            placeholder="Ej: ORCL"
            type="text"
          />
        </TabsContent>

        <TabsContent value="advanced" className="grid gap-4 mt-4">
          <Field className="grid gap-1.5">
            <FieldLabel>Cadena TNS</FieldLabel>
            <Input
              type="text"
              placeholder="(DESCRIPTION=(ADDRESS=(PROTOCOL=TCP)(HOST=db)(PORT=1521))(CONNECT_DATA=(SERVICE_NAME=ORCL)))"
              {...register("tns_string")}
              data-invalid={!!errors.tns_string}
            />
            <FieldDescription>
              La cadena TNS tiene prioridad sobre host/puerto/SID.
            </FieldDescription>
            <FieldError errors={[errors.tns_string as { message?: string }]} />
          </Field>
        </TabsContent>
      </Tabs>

      <div className="grid gap-4 md:grid-cols-2">
        <FormFieldInput
          control={control}
          name="username"
          label="Usuario *"
          placeholder="Ej: system"
          type="text"
        />
        <Field className="grid gap-1.5">
          <FieldLabel>Contraseña</FieldLabel>
          <Input
            type="password"
            placeholder="••••••••"
            {...register("password")}
            data-invalid={!!errors.password}
          />
          <FieldDescription>
            Deja en blanco para conservar la contraseña actual al editar.
          </FieldDescription>
          <FieldError errors={[errors.password as { message?: string }]} />
        </Field>
      </div>
    </div>
  );
};
