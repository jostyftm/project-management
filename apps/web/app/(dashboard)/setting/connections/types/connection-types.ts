import { z } from "zod";
import { LaravelDriverCode } from "@/types/catalog-type";

const baseFields = {
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  database_driver_id: z
    .string()
    .min(1, "Selecciona un driver")
    .optional(),
  host: z.string().optional(),
  port: z.string().optional(),
  db_name: z.string().optional(),
  schema: z.string().optional(),
  username: z.string().optional(),
  password: z.string().optional(),
  tns_string: z.string().optional(),
};

const requiredForMysqlPg = {
  host: z.string().min(1, "El host es obligatorio"),
  db_name: z.string().min(1, "El nombre de la base de datos es obligatorio"),
  username: z.string().min(1, "El usuario es obligatorio"),
};

export const buildConnectionSchema = (driverCode: LaravelDriverCode | null) => {
  if (driverCode === "oracle") {
    return z
      .object({
        ...baseFields,
        host: z.string().optional(),
        db_name: z.string().optional(),
        username: z.string().min(1, "El usuario es obligatorio"),
      })
      .superRefine((val, ctx) => {
        const hasTns = !!val.tns_string && val.tns_string.trim().length > 0;
        if (!hasTns && (!val.host || val.host.trim().length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["host"],
            message: "El host es obligatorio",
          });
        }
        if (!hasTns && (!val.db_name || val.db_name.trim().length === 0)) {
          ctx.addIssue({
            code: z.ZodIssueCode.custom,
            path: ["db_name"],
            message: "El SID/SERVICE_NAME es obligatorio",
          });
        }
      });
  }

  return z.object({
    ...baseFields,
    ...requiredForMysqlPg,
  });
};

export type ConnectionFormValues = z.infer<
  ReturnType<typeof buildConnectionSchema>
>;

export const NONE_DRIVER = "none";
export const MYSQL_DRIVER_CODE = "mysql";
export const PGSQL_DRIVER_CODE = "pgsql";
export const ORACLE_DRIVER_CODE = "oracle";
