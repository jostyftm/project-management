"use client";
import React from "react";
import { useFormContext } from "react-hook-form";
import FormFieldInput from "@/components/ui/form-field-input";
import { Input } from "@/components/ui/input";
import {
  Field,
  FieldDescription,
  FieldError,
  FieldLabel,
} from "@/components/ui/field";

export const MysqlPgFields = () => {
  const {
    control,
    register,
    formState: { errors },
  } = useFormContext();

  return (
    <div className="grid gap-4 md:grid-cols-2">
      <FormFieldInput
        control={control}
        name="host"
        label="Host *"
        placeholder="Ej: 192.168.1.10"
        type="text"
      />
      <FormFieldInput
        control={control}
        name="port"
        label="Puerto *"
        placeholder="Ej: 5432"
        type="numberCustom"
      />
      <FormFieldInput
        control={control}
        name="db_name"
        label="Base de datos *"
        placeholder="Ej: sdi_productiva"
        type="text"
      />
      <FormFieldInput
        control={control}
        name="schema"
        label="Esquema"
        placeholder="Ej: public"
        type="text"
      />
      <FormFieldInput
        control={control}
        name="username"
        label="Usuario *"
        placeholder="Ej: sdi_user"
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
  );
};
