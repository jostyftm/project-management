"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";

interface DividerBlockProps {
  block: ReportBlock;
  data?: {
    style?: "solid" | "dashed" | "gradient" | "space";
    height?: number;
    color?: string;
  };
}

export function DividerBlock({ block, data }: DividerBlockProps) {
  const style = data?.style || block.config?.style || "solid";
  const height = data?.height || block.config?.height || 24;

  if (style === "space") {
    return <div style={{ height: `${height}px` }} className="w-full" />;
  }

  return (
    <div
      style={{
        paddingTop: `${height / 2}px`,
        paddingBottom: `${height / 2}px`,
      }}
      className="w-full flex items-center"
    >
      {style === "gradient" ? (
        <div className="w-full h-px bg-gradient-to-r from-transparent via-neutral-300 dark:via-neutral-700 to-transparent" />
      ) : (
        <hr
          className={`w-full border-t border-neutral-200 dark:border-neutral-800 ${
            style === "dashed" ? "border-dashed" : "border-solid"
          }`}
        />
      )}
    </div>
  );
}

export function DividerConfigPanel({
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
          Estilo del Separador
        </label>
        <select
          value={config.style || "solid"}
          onChange={(e) => onChange({ ...config, style: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        >
          <option value="solid">Línea Continua</option>
          <option value="dashed">Línea Discontinua (Dashed)</option>
          <option value="gradient">Degradado Suave</option>
          <option value="space">Espacio en Blanco (Gap)</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Espaciado Vertical (px)
        </label>
        <input
          type="number"
          min={8}
          max={96}
          step={4}
          value={config.height || 24}
          onChange={(e) => onChange({ ...config, height: parseInt(e.target.value, 10) || 24 })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        />
      </div>
    </div>
  );
}
