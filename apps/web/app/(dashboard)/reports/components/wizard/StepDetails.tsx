"use client";
import React from "react";
import { Form } from "@/components/ui/form";
import { Button } from "@/components/ui/button";
import BaseIcon from "@/components/ui/base-icon";
import { Badge } from "@/components/ui/badge";
import FormFieldInput from "@/components/ui/form-field-input";
import { useForm, Controller } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { z } from "zod";
import { Report } from "@/types/report-type";
import { useListConnections } from "../../../setting/connections/hooks/use-list-connections";
import { useListReportCategories } from "@/hooks/use-list-report-categories";
import { useReportWizardStore } from "@/hooks/zustand/use-report-wizard-store";
import { useReportActions } from "../../hooks/use-report-actions";
import { DatabaseConnection } from "@/types/connection-type";
import { Field, FieldLabel, FieldError } from "@/components/ui/field";
import { CategoryTreeSelect } from "./CategoryTreeSelect";
import { FilenamePatternInput } from "@/components/common/filename-pattern/FilenamePatternInput";

interface Props {
  report?: Report | null;
}

const StepDetailsSchema = z.object({
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  database_connection_id: z.string().min(1, "Selecciona una conexión"),
  report_category_id: z.string().optional(),
  description: z.string().optional(),
  filename_pattern: z.string().optional(),
});

type StepDetailsValues = z.infer<typeof StepDetailsSchema>;

export const StepDetails = ({ report }: Props) => {
  const { data: connections } = useListConnections({
    params: { params: { paginate: false } },
  });
  const { data: categories } = useListReportCategories();

  const storeName = useReportWizardStore((s) => s.name);
  const storeConnectionId = useReportWizardStore((s) => s.connectionId);
  const storeReportCategoryId = useReportWizardStore((s) => s.reportCategoryId);
  const storeDescription = useReportWizardStore((s) => s.description);
  const storeFilenamePattern = useReportWizardStore((s) => s.filenamePattern);
  const sqlQuery = useReportWizardStore((s) => s.sqlQuery);
  const setDetails = useReportWizardStore((s) => s.setDetails);
  const { saveReport, isLoading: isSaving } = useReportActions();

  const form = useForm<StepDetailsValues>({
    resolver: zodResolver(StepDetailsSchema),
    defaultValues: {
      name: storeName || report?.attributes.name || "",
      database_connection_id: storeConnectionId
        ? String(storeConnectionId)
        : report?.relationships.connection_id
        ? String(report.relationships.connection_id)
        : "",
      report_category_id: storeReportCategoryId
        ? String(storeReportCategoryId)
        : report?.relationships.category?.id
        ? String(report.relationships.category.id)
        : "",
      description: storeDescription || report?.attributes.description || "",
      filename_pattern:
        storeFilenamePattern || report?.attributes.filename_pattern || "",
    },
  });

  // Sincronizar en tiempo real los cambios del formulario con el store
  React.useEffect(() => {
    const subscription = form.watch((values) => {
      if (values.name !== undefined) {
        useReportWizardStore.setState({
          name: values.name ?? "",
          description: values.description ?? "",
          filenamePattern: values.filename_pattern ?? null,
          connectionId: values.database_connection_id
            ? Number(values.database_connection_id)
            : null,
          reportCategoryId: values.report_category_id
            ? Number(values.report_category_id)
            : null,
        });
      }
    });
    return () => subscription.unsubscribe();
  }, [form]);

  // Preselección inteligente si sólo existe 1 opción disponible
  React.useEffect(() => {
    if (
      connections &&
      connections.length === 1 &&
      !form.getValues("database_connection_id")
    ) {
      const singleConnId = String(connections[0].id);
      form.setValue("database_connection_id", singleConnId, {
        shouldValidate: true,
      });
      useReportWizardStore.setState({ connectionId: Number(singleConnId) });
    }
  }, [connections, form]);

  React.useEffect(() => {
    if (
      categories &&
      categories.length === 1 &&
      !form.getValues("report_category_id")
    ) {
      const singleCatId = String(categories[0].id);
      form.setValue("report_category_id", singleCatId, {
        shouldValidate: true,
      });
      useReportWizardStore.setState({ reportCategoryId: Number(singleCatId) });
    }
  }, [categories, form]);

  const connectionId = form.watch("database_connection_id");
  const selectedConnection = connections?.find(
    (c) => String(c.id) === connectionId
  );

  const connectionOptions = (connections ?? []).map((c) => ({
    value: String(c.id),
    label: c.attributes.name,
  }));

  const handleContinue = async (data: StepDetailsValues) => {
    setDetails({
      connectionId: Number(data.database_connection_id),
      reportCategoryId: data.report_category_id
        ? Number(data.report_category_id)
        : null,
      name: data.name,
      description: data.description ?? "",
      filenamePattern: data.filename_pattern || null,
    });

    if (report?.id && form.formState.isDirty) {
      await saveReport(
        {
          name: data.name,
          description: data.description ?? "",
          database_connection_id: Number(data.database_connection_id),
          report_category_id: data.report_category_id
            ? Number(data.report_category_id)
            : null,
          sql_query: sqlQuery || report.attributes.sql_query,
          filename_pattern: data.filename_pattern || null,
        },
        report.id
      );
    }
  };

  const renderDriverBadge = (conn?: DatabaseConnection | null) => {
    const driverName = conn?.relationships.driver?.name;
    return (
      <div className="flex items-center gap-2">
        <Badge
          variant="outline"
          className={
            driverName ? "bg-slate-100 text-slate-700" : "text-muted-foreground"
          }
        >
          <BaseIcon name="Database" size={13} className="mr-1" />
          {driverName ?? "Selecciona una conexión para ver el tipo"}
        </Badge>
      </div>
    );
  };

  return (
    <Form {...form}>
      <form
        onSubmit={form.handleSubmit(handleContinue)}
        className="w-full grid gap-4 items-start"
      >
        <div className="grid gap-4 md:grid-cols-2">
          <FormFieldInput
            control={form.control}
            name="name"
            label="Nombre del reporte *"
            placeholder="Ej: Conciliación diaria"
            type="text"
          />
          <Controller
            control={form.control}
            name="report_category_id"
            render={({ field, fieldState }) => (
              <Field className="w-full gap-1.5" data-invalid={!!fieldState.error}>
                <FieldLabel>Categoría</FieldLabel>
                <CategoryTreeSelect
                  categories={categories ?? []}
                  value={field.value}
                  onChange={(val) => field.onChange(val ?? "")}
                  placeholder="Selecciona una categoría"
                />
                {fieldState.error && (
                  <FieldError>{fieldState.error.message}</FieldError>
                )}
              </Field>
            )}
          />
        </div>

        <div className="grid gap-4 md:grid-cols-2 items-end">
          <FormFieldInput
            control={form.control}
            name="database_connection_id"
            label="Conexión *"
            type="select"
            options={connectionOptions}
            placeholder="Selecciona una conexión"
            isSelectClearable
          />
          <div className="pb-1">{renderDriverBadge(selectedConnection)}</div>
        </div>

        <FormFieldInput
          control={form.control}
          name="description"
          label="Descripción"
          placeholder="Descripción opcional del reporte"
          type="text-area"
        />

        <Controller
          control={form.control}
          name="filename_pattern"
          render={({ field }) => (
            <div className="border p-3.5 rounded-lg bg-slate-50/70">
              <FilenamePatternInput
                value={field.value || ""}
                onChange={field.onChange}
                reportName={form.watch("name") || "reporte"}
                label="Patrón por defecto para nombre de archivo"
                placeholder="{report_name}_{YYYY}{MM}{DD}_{HH}{mm}{ss}"
                helperText="Plantilla base para descargas y programaciones asociadas a este reporte."
              />
            </div>
          )}
        />

        <div className="flex gap-2 justify-end">
          <Button
            type="submit"
            disabled={isSaving || !connectionId || !form.watch("name")?.trim()}
            className="gap-2"
          >
            {isSaving ? (
              <>
                <BaseIcon name="Loader" className="animate-spin" size={15} />
                Guardando...
              </>
            ) : (
              <>
                Continuar
                <BaseIcon name="ArrowRight" size={15} />
              </>
            )}
          </Button>
        </div>
      </form>
    </Form>
  );
};