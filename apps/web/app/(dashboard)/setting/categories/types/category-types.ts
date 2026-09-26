import { z } from "zod";

export const CategoryFormSchema = z.object({
  id: z.string().optional(),
  name: z.string().min(1, "El nombre es obligatorio").max(255),
  parent_id: z.string().nullable().optional(),
});

export type CategoryFormValues = z.infer<typeof CategoryFormSchema>;