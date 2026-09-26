import { useMutation } from "@tanstack/react-query";
import { toast } from "sonner";
import { storage } from "@/lib/storage";
import { ACCESS_TOKEN } from "@/config/constants";

interface UseDownloadFileOptions {
    filename?: string;
    onSuccess?: () => void;
    onError?: (error: Error) => void;
}

export const useDownloadFile = (options: UseDownloadFileOptions = {}) => {
    const { filename = "download", onSuccess, onError } = options;

    const mutation = useMutation({
        mutationFn: async ({
            url,
            customFilename,
        }: {
            url: string;
            customFilename?: string;
        }) => {
            const token = storage.get(ACCESS_TOKEN);
            const headers: HeadersInit =
                typeof token === "string"
                    ? { Authorization: `Bearer ${token}` }
                    : {};

            const response = await fetch(url, { headers });

            if (!response.ok) {
                throw new Error(`Error en la descarga: ${response.statusText}`);
            }

            const blob = await response.blob();
            const objectUrl = globalThis.URL.createObjectURL(blob);

            // Intentar extraer el nombre del archivo desde Content-Disposition si no se suministra customFilename
            let resolvedFilename = customFilename;
            if (!resolvedFilename) {
                const disposition = response.headers.get("content-disposition");
                if (disposition) {
                    const matchUtf8 = disposition.match(/filename\*=UTF-8''([^;]+)/i);
                    const matchStandard = disposition.match(/filename="?([^";]+)"?/i);
                    if (matchUtf8?.[1]) {
                        resolvedFilename = decodeURIComponent(matchUtf8[1]);
                    } else if (matchStandard?.[1]) {
                        resolvedFilename = matchStandard[1];
                    }
                }
            }

            const link = document.createElement("a");
            link.href = objectUrl;
            link.download = resolvedFilename || filename;

            document.body.appendChild(link);
            link.click();
            link.remove();

            globalThis.URL.revokeObjectURL(objectUrl);
        },

        onSuccess: () => {
            toast.success("Archivo descargado exitosamente");
            onSuccess?.();
        },

        onError: (error) => {
            const message =
                error instanceof Error ? error.message : "Error desconocido";
            console.error("Error descargando archivo:", message);
            toast.error(`Error al descargar: ${message}`);
            onError?.(error instanceof Error ? error : new Error(message));
        },
    });

    return {
        downloadFile: mutation.mutate,
        isLoading: mutation.isPending,
    };
};
