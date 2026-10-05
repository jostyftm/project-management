"use client";

import { RefObject, useCallback, useState } from "react";
import { toast } from "sonner";

export type ExportFormat = "png" | "jpg" | "svg";

export function useWidgetExport(
  ref: RefObject<HTMLElement | null>,
  filename: string
) {
  const [isExporting, setIsExporting] = useState(false);

  const exportWidget = useCallback(
    async (format: ExportFormat) => {
      const el = ref.current;
      if (!el) {
        toast.error("No se pudo encontrar el elemento para exportar");
        return;
      }

      setIsExporting(true);
      try {
        const cleanName = filename.toLowerCase().replace(/[^a-z0-9-_]/g, "_");
        const svgEl = el instanceof SVGElement ? el : el.querySelector("svg");
        const width = el.offsetWidth || 600;
        const height = el.offsetHeight || 400;

        if (format === "svg") {
          let svgString = "";
          if (svgEl) {
            const clone = svgEl.cloneNode(true) as SVGElement;
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            svgString = new XMLSerializer().serializeToString(clone);
          } else {
            // Embeber contenido HTML en SVG con foreignObject
            const htmlContent = el.innerHTML;
            svgString = `<?xml version="1.0" encoding="UTF-8"?>
<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, sans-serif; padding: 16px; background: #ffffff;">
      ${htmlContent}
    </div>
  </foreignObject>
</svg>`;
          }

          const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
          downloadBlob(blob, `${cleanName}.svg`);
          toast.success(`Widget exportado como ${cleanName}.svg`);
        } else {
          // PNG o JPG
          let svgUrl = "";
          if (svgEl) {
            const clone = svgEl.cloneNode(true) as SVGElement;
            clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
            const svgString = new XMLSerializer().serializeToString(clone);
            const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            svgUrl = URL.createObjectURL(blob);
          } else {
            // Fallback con foreignObject para convertir a canvas
            const htmlContent = el.innerHTML;
            const svgString = `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">
  <rect width="100%" height="100%" fill="#ffffff" />
  <foreignObject width="100%" height="100%">
    <div xmlns="http://www.w3.org/1999/xhtml" style="font-family: system-ui, sans-serif; padding: 16px; background: #ffffff;">
      ${htmlContent}
    </div>
  </foreignObject>
</svg>`;
            const blob = new Blob([svgString], { type: "image/svg+xml;charset=utf-8" });
            svgUrl = URL.createObjectURL(blob);
          }

          await new Promise<void>((resolve, reject) => {
            const img = new Image();
            img.onload = () => {
              try {
                const scale = 2; // 2x retina crispness
                const canvas = document.createElement("canvas");
                canvas.width = width * scale;
                canvas.height = height * scale;
                const ctx = canvas.getContext("2d");
                if (!ctx) {
                  reject(new Error("No se pudo inicializar canvas 2D"));
                  return;
                }
                ctx.scale(scale, scale);
                ctx.fillStyle = "#ffffff";
                ctx.fillRect(0, 0, width, height);
                ctx.drawImage(img, 0, 0, width, height);

                URL.revokeObjectURL(svgUrl);
                const mimeType = format === "jpg" ? "image/jpeg" : "image/png";
                const dataUrl = canvas.toDataURL(mimeType, 0.95);

                const link = document.createElement("a");
                link.href = dataUrl;
                link.download = `${cleanName}.${format}`;
                document.body.appendChild(link);
                link.click();
                document.body.removeChild(link);
                toast.success(`Widget exportado como ${cleanName}.${format}`);
                resolve();
              } catch (err) {
                reject(err);
              }
            };
            img.onerror = () => {
              URL.revokeObjectURL(svgUrl);
              reject(new Error("Error al renderizar imagen en canvas"));
            };
            img.src = svgUrl;
          });
        }
      } catch (err: any) {
        console.error("Error al exportar widget:", err);
        toast.error("Ocurrió un error al generar la exportación");
      } finally {
        setIsExporting(false);
      }
    },
    [ref, filename]
  );

  return { exportWidget, isExporting };
}

function downloadBlob(blob: Blob, filename: string) {
  const url = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
}
