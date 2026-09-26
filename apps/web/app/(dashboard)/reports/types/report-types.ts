import { z } from "zod";

export const ReportFormSchema = z.object({
  id: z.string().optional(),
  database_connection_id: z.string().min(1, "Selecciona una conexión"),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  description: z.string().optional(),
  report_category_id: z.string().optional(),
  sql_query: z.string().min(1, "El SQL es obligatorio"),
});

export type ReportFormValues = z.infer<typeof ReportFormSchema>;
