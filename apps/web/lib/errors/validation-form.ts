import { Path, UseFormSetError } from "react-hook-form";

type ValidationError<T> = {
  [K in keyof T]?: string;
};

export const renderValidationErrors = <T extends Record<string, unknown>>(
  err: ValidationError<T>,
  setError: UseFormSetError<T>
) => {
  Object.entries(err).forEach(([field, messages]) => {
    if (Array.isArray(messages) && messages.length > 0) {
      setError(field as Path<T>, {
        type: "server",
        message: messages[0],
      });
    }
  });
};
