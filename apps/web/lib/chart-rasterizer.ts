import { DocumentSchema, ChartBlock } from "@/types/document-type";

/**
 * Convierte un elemento SVG en un Data URL PNG de alta resolución dibujando el gráfico y su título.
 */
export async function svgElementToPngDataUrl(
  svgEl: SVGSVGElement,
  title?: string
): Promise<string> {
  return new Promise((resolve) => {
    try {
      const clonedSvg = svgEl.cloneNode(true) as SVGSVGElement;
      clonedSvg.setAttribute("xmlns", "http://www.w3.org/2000/svg");
      clonedSvg.setAttribute("xmlns:xlink", "http://www.w3.org/1999/xlink");

      const viewBox = svgEl.viewBox?.baseVal;
      const baseWidth =
        viewBox && viewBox.width > 0 ? viewBox.width : svgEl.clientWidth || 480;
      const baseHeight =
        viewBox && viewBox.height > 0 ? viewBox.height : svgEl.clientHeight || 180;

      const serializer = new XMLSerializer();
      const svgString = serializer.serializeToString(clonedSvg);
      const encodedSvg = encodeURIComponent(svgString);
      const imgSrc = `data:image/svg+xml;charset=utf-8,${encodedSvg}`;

      const img = new Image();

      img.onload = () => {
        try {
          const scale = 2; // 2x para resolución nítida en impresión PDF y Word
          const hasTitle = Boolean(title && title.trim().length > 0);
          const titleHeight = hasTitle ? 34 : 0;
          const totalWidth = baseWidth;
          const totalHeight = baseHeight + titleHeight;

          const canvas = document.createElement("canvas");
          canvas.width = totalWidth * scale;
          canvas.height = totalHeight * scale;

          const ctx = canvas.getContext("2d");
          if (!ctx) {
            resolve("");
            return;
          }

          // Fondo blanco
          ctx.fillStyle = "#ffffff";
          ctx.fillRect(0, 0, canvas.width, canvas.height);

          ctx.scale(scale, scale);

          // Dibujar título si existe
          if (hasTitle && title) {
            ctx.font = "bold 13px system-ui, -apple-system, sans-serif";
            ctx.fillStyle = "#0f172a";
            ctx.textAlign = "center";
            ctx.textBaseline = "middle";
            ctx.fillText(title.trim(), totalWidth / 2, 18);
          }

          // Dibujar imagen SVG rasterizada
          ctx.drawImage(img, 0, titleHeight, baseWidth, baseHeight);

          const pngDataUrl = canvas.toDataURL("image/png");
          resolve(pngDataUrl);
        } catch (e) {
          console.warn("Error rasterizing chart to canvas:", e);
          resolve("");
        }
      };

      img.onerror = (e) => {
        console.warn("Error loading chart SVG image:", e);
        resolve("");
      };

      img.src = imgSrc;
    } catch (e) {
      console.warn("Error in svgElementToPngDataUrl:", e);
      resolve("");
    }
  });
}

/**
 * Recorre el esquema del documento y rasteriza los gráficos visibles en el DOM
 * agregando su representación en Base64 en `chartImage`.
 */
export async function enrichSchemaWithChartImages(
  schema: DocumentSchema
): Promise<DocumentSchema> {
  const cloned: DocumentSchema = JSON.parse(JSON.stringify(schema));
  const rows = cloned.content?.rows;

  if (!Array.isArray(rows)) {
    return cloned;
  }

  const tasks: Promise<void>[] = [];

  for (const row of rows) {
    for (const col of row.columns || []) {
      for (const block of col.blocks || []) {
        if (block.type === "chart") {
          const chartBlock = block as ChartBlock;
          const svgEl = document.getElementById(
            `chart-svg-${chartBlock.id}`
          ) as SVGSVGElement | null;

          if (svgEl) {
            tasks.push(
              (async () => {
                const pngDataUrl = await svgElementToPngDataUrl(
                  svgEl,
                  chartBlock.title
                );
                if (pngDataUrl) {
                  chartBlock.chartImage = pngDataUrl;
                }
              })()
            );
          }
        }
      }
    }
  }

  if (tasks.length > 0) {
    await Promise.all(tasks);
  }

  return cloned;
}
