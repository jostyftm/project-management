import { renderValidationErrors } from "@/lib/errors/validation-form";
import { ApiErrorException } from "@/lib/request";
import { FieldValues, UseFormSetError } from "react-hook-form";

import { toast } from "sonner";

interface UseFormErrorHandlerConfig {
  notFound?: { title?: string; description?: string };
  forbidden?: { title?: string; description?: string };
}

interface UseFormErrorHandlerProps<T extends FieldValues> {
  setError?: UseFormSetError<T>;
  config?: UseFormErrorHandlerConfig;
}

const useErrorHandler = <T extends FieldValues>(
  props?: UseFormErrorHandlerProps<T>
) => {
  const config = props?.config;
  const setError = props?.setError;

  const toastForbidden = () => {
    toast.error(config?.forbidden?.title ?? "Acceso denegado", {
      description:
        config?.forbidden?.description ??
        "No tienes permiso para realizar esta acción. Si crees que es un error, contacta al área de T.I.",
      duration: 10000,
      closeButton: true,
    });
  };

  const toastNotFound = () => {
    toast.error(config?.notFound?.title || "Data no encontrada", {
      description:
        config?.notFound?.description ||
        "No pudimos encontrar la información solicitada. Intenta nuevamente.",
      duration: 10000,
      closeButton: true,
    });
  };

  const toastValidationError = (message?: string) => {
    toast.error("Error de validación", {
      description:
        message ||
        "Hay campos con errores o incompletos. Por favor, revisa e intenta nuevamente.",
      duration: 10000,
      closeButton: true,
    });
  };

  const renderToastError = () => {
    toast.error("Error interno del servidor", {
      description:
        "Ocurrió un error inesperado. Por favor, intenta nuevamente.",
      duration: 10000,
      closeButton: true,
    });
  };

  const handleValidationError = (errors: any, message?: string) => {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    if (setError) {
      renderValidationErrors(errors, setError);
    } else {
      const firstError = message || "Error de validación";
      toastValidationError(firstError);
    }
  };

  const handleApiError = (err: ApiErrorException) => {
    switch (err.status) {
      case 422: {
        const firstError = Object.values(err?.errors)?.[0]?.[0] || err.message;
        handleValidationError(err.errors, firstError);
        break;
      }
      case 404:
        toastNotFound();
        break;
      case 403:
        toastForbidden();
        break;
      case 500:
        renderToastError();
        break;
      default:
        toast.error("Error", {
          description: err.message || "Ocurrió un error inesperado",
          duration: 10000,
          closeButton: true,
        });
    }
  };

  const handleLegacyError = (err: any) => {
    // eslint-disable-line @typescript-eslint/no-explicit-any
    switch (err.status) {
      case 422: {
        const errors = err?.data?.errors as
          | Record<string, string[]>
          | undefined;
        const firstError = errors ? Object.values(errors)[0]?.[0] : undefined;
        handleValidationError(err.data.errors, firstError);
        break;
      }
      case 404:
        toastNotFound();
        break;
      case 403:
        toastForbidden();
        break;
      case 500:
        renderToastError();
        break;
      default:
        renderToastError();
    }
  };

  const errorhandler = (err: any) => {
    // eslint-disable-line @typescript-eslint/no-explicit-any

    if (err instanceof ApiErrorException) {
      handleApiError(err);
    } else {
      handleLegacyError(err);
    }
  };

  return { errorhandler };
};

export default useErrorHandler;
