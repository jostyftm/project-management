"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Image as ImageIcon } from "lucide-react";

interface ImageBlockProps {
  block: ReportBlock;
  data?: {
    url?: string;
    alt?: string;
    caption?: string;
    alignment?: "left" | "center" | "right";
    max_width?: string;
  };
}

export function ImageBlock({ block, data }: ImageBlockProps) {
  const url = data?.url || block.config?.url;
  const alt = data?.alt || block.config?.alt || "Imagen del reporte";
  const caption = data?.caption || block.config?.caption;
  const alignment = data?.alignment || block.config?.alignment || "center";

  if (!url) {
    return (
      <div className="w-full bg-neutral-50 dark:bg-neutral-900 border-2 border-dashed border-neutral-200 dark:border-neutral-800 rounded-xl p-8 text-center">
        <ImageIcon className="w-8 h-8 text-neutral-400 mx-auto mb-2" />
        <p className="text-xs font-medium text-neutral-600 dark:text-neutral-400">
          No se ha configurado ninguna imagen
        </p>
        <p className="text-[11px] text-neutral-400 mt-1">
          Ingresa una URL en el panel de configuración de la derecha
        </p>
      </div>
    );
  }

  const alignClass =
    alignment === "left"
      ? "justify-start text-left"
      : alignment === "right"
      ? "justify-end text-right"
      : "justify-center text-center";

  return (
    <div className={`w-full flex flex-col ${alignClass}`}>
      <div className="inline-block max-w-full overflow-hidden rounded-xl border border-neutral-200/80 dark:border-neutral-800 shadow-xs">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={url}
          alt={alt}
          className="max-h-[420px] w-auto object-contain mx-auto"
          loading="lazy"
        />
      </div>
      {caption && (
        <span className="text-[11px] text-neutral-400 mt-2 block italic">
          {caption}
        </span>
      )}
    </div>
  );
}

export function ImageConfigPanel({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          URL de la Imagen
        </label>
        <input
          type="url"
          placeholder="https://ejemplo.com/grafico.png"
          value={config.url || ""}
          onChange={(e) => onChange({ ...config, url: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Pie de Foto (Caption)
        </label>
        <input
          type="text"
          placeholder="Descripción o fuente de la imagen"
          value={config.caption || ""}
          onChange={(e) => onChange({ ...config, caption: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Alineación
        </label>
        <select
          value={config.alignment || "center"}
          onChange={(e) => onChange({ ...config, alignment: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        >
          <option value="left">Izquierda</option>
          <option value="center">Centrado</option>
          <option value="right">Derecha</option>
        </select>
      </div>
    </div>
  );
}
