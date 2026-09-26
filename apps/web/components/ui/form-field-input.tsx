import React from "react";
import { Input } from "./input";
import {
  Control,
  Controller,
  ControllerRenderProps,
  FieldPath,
  FieldValues,
} from "react-hook-form";
import { Textarea } from "./textarea";
import { Switch } from "./switch";
import MultiSelect, { MultiValue } from "react-select";
import { DayPicker } from "./day-picker";
import { cn, ReactSelectCustomStyles } from "@/lib/utils";
import { Field, FieldDescription, FieldError, FieldLabel } from './field'


type InputType =
  | "text"
  | "number"
  | "text-area"
  | "switch"
  | "select"
  | "datetime-local"
  | "time"
  | "date"
  | "day"
  | "numberCustom";

export type OptionType = {
  value: string;
  label: string;
};

export const isNumber = /^\d+$/;

interface Props<T extends FieldValues> {
  name: FieldPath<T>;
  control: Control<T>;
  label?: string;
  placeholder?: string;
  description?: string;
  type: InputType;
  className?: string;
  classNameInput?: string;
  isMultiSelect?: boolean;
  isSelectClearable?: boolean;
  options?: OptionType[];
  step?: string | number;
  disabled?: boolean;
  readOnly?: boolean;
}

type FormFieldInputRenderProps<T extends FieldValues> = {
  type: InputType;
  placeholder?: string;
  field: ControllerRenderProps<T, FieldPath<T>>;
  label?: string;
  disabled?: boolean;
  readOnly?: boolean;
  isMultiSelect?: boolean;
  isSelectClearable?: boolean;
  options?: OptionType[];
  step?: string | number;
  classNameInput?: string;
  invalid?: boolean;
};

const FormFieldInputRender = <T extends FieldValues>({
  type,
  placeholder,
  field,
  label,
  disabled,
  readOnly,
  isMultiSelect,
  isSelectClearable,
  options,
  step,
  classNameInput,
  invalid
}: FormFieldInputRenderProps<T>) => {
  switch (type) {
    case "text":
    case "datetime-local":
    case "date":
    case "time":
      return (
        <Input
          placeholder={placeholder}
          {...field}
          disabled={disabled}
          readOnly={readOnly}
          type={type}
          step={step}
          data-invalid={invalid}
        />
      );
    case "number":
    case "numberCustom":
      return (
        <Input
          placeholder={placeholder}
          {...field}
          disabled={disabled}
          readOnly={readOnly}
          type={type}
          step={step}
          data-invalid={invalid}
          onInput={(e) => {
            const value = e.currentTarget.value;

            if (value.length > 1 && value.startsWith("0")) {
              e.currentTarget.value = value.slice(1);
            }

            if (!isNumber.test(value)) {
              e.currentTarget.value = value.slice(0, -1);
            }
          }}
        />
      );
    case "day":
      return (
        <DayPicker
          value={field.value}
          onChange={field.onChange}
          disabled={disabled || readOnly}
        />
      );
    case "text-area":
      return (
        <Textarea
          placeholder={placeholder}
          {...field}
          disabled={disabled}
          readOnly={readOnly}
          className="min-h-40 w-full resize-y overflow-auto"
          data-invalid={invalid}
        />
      );
    case "switch":
      return (
        <div className="flex gap-2 items-center">
          <Switch
            checked={field.value}
            onCheckedChange={field.onChange}
            aria-readonly
            disabled={disabled || readOnly}
            className={cn(classNameInput)}
            data-invalid={invalid}
          />
          <FieldLabel>{label}</FieldLabel>
        </div>
      );
    case "select":
      return (
        <MultiSelect
          isDisabled={disabled || readOnly}
          defaultValue={field.value}
          value={
            isMultiSelect
              ? options?.filter((option) =>
                field.value?.includes(option.value)
              ) ?? []
              : options?.find((c) => c.value === field.value) ?? null
          }
          menuPlacement="auto"
          onChange={(item) => {
            if (isMultiSelect) {
              // Para multi-select, extraer array de valores
              const selectedValues =
                (item as MultiValue<OptionType>)?.map(
                  (option) => option.value
                ) ?? [];
              field.onChange(selectedValues);
            } else {
              // Para single select, extraer un solo valor
              field.onChange((item as OptionType)?.value);
            }
          }}
          options={options ?? []}
          isMulti={isMultiSelect}
          className="border-gray-400 focus:border-gray-400 "
          isSearchable
          styles={ReactSelectCustomStyles}
          isClearable={isSelectClearable}
          placeholder={placeholder}
          data-invalid={invalid}
        />
      );
    default:
      return null;
  }
};

const FormFieldInput = <T extends FieldValues>({
  control,
  name,
  label,
  placeholder,
  description,
  type,
  className,
  isMultiSelect,
  isSelectClearable,
  options,
  step,
  disabled,
  readOnly,
  classNameInput,
}: Props<T>) => {
  return (
    <Controller
      control={control}
      name={name}
      render={({ field, fieldState }) => (
        <Field className={className}>
          {label && type !== "switch" && <FieldLabel>{label}</FieldLabel>}
          <FormFieldInputRender
            type={type}
            placeholder={placeholder}
            field={field}
            label={label}
            disabled={disabled}
            readOnly={readOnly}
            isMultiSelect={isMultiSelect}
            isSelectClearable={isSelectClearable}
            options={options}
            step={step}
            classNameInput={classNameInput}
            invalid={fieldState.invalid}
          />
          {description && <FieldDescription>{description}</FieldDescription>}
          {fieldState.invalid && <FieldError errors={[fieldState.error]} />}
        </Field>
      )}
    />
  );
};

export default FormFieldInput;
