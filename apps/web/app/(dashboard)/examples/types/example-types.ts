import { z } from "zod";

export const ExampleFormSchema = z.object({
  id: z.string().optional(),
  source_name: z.string().max(255, {
    message: "El nombre de la fuente no puede exceder los 255 caracteres.",
  }),
  format_date: z
    .string()
    .min(1, { message: "El formato de fecha es obligatorio." }),
  webhook_url: z
    .string()
    .max(2048, { message: "La URL no puede exceder los 2048 caracteres." })
    .refine(
      (val) => {
        try {
          new URL(val);
          return true;
        } catch {
          return false;
        }
      },
      { message: "La URL no es válida." }
    )
    .refine((val) => /^https?:\/\//i.test(val), {
      message: "La URL debe comenzar con http:// o https://.",
    }),
});

export type ExampleFormValues = z.infer<typeof ExampleFormSchema>;
