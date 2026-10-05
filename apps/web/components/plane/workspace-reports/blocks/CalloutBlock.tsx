"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Info, AlertTriangle, CheckCircle2, AlertCircle, Sparkles } from "lucide-react";

interface CalloutBlockProps {
  block: ReportBlock;
  data?: {
    variant?: "info" | "warning" | "success" | "danger";
    title?: string;
    content?: string;
    icon?: string;
  };
}

export function CalloutBlock({ block, data }: CalloutBlockProps) {
  const variant = data?.variant || block.config?.variant || "info";
  const title = data?.title || block.config?.title || "Nota Ejecutiva";
  const content =
    data?.content ||
    block.config?.content ||
    "Este bloque destaca conclusiones clave o puntos de atención para los directores y partes interesadas.";

  const getVariantStyles = () => {
    switch (variant) {
      case "warning":
        return {
          container:
            "bg-amber-50/70 dark:bg-amber-950/30 border-amber-200 dark:border-amber-900/60 text-amber-900 dark:text-amber-200",
          iconColor: "text-amber-600 dark:text-amber-400",
          Icon: AlertTriangle,
        };
      case "success":
        return {
          container:
            "bg-emerald-50/70 dark:bg-emerald-950/30 border-emerald-200 dark:border-emerald-900/60 text-emerald-900 dark:text-emerald-200",
          iconColor: "text-emerald-600 dark:text-emerald-400",
          Icon: CheckCircle2,
        };
      case "danger":
        return {
          container:
            "bg-rose-50/70 dark:bg-rose-950/30 border-rose-200 dark:border-rose-900/60 text-rose-900 dark:text-rose-200",
          iconColor: "text-rose-600 dark:text-rose-400",
          Icon: AlertCircle,
        };
      default:
        return {
          container:
            "bg-indigo-50/70 dark:bg-indigo-950/30 border-indigo-200 dark:border-indigo-900/60 text-indigo-900 dark:text-indigo-200",
          iconColor: "text-indigo-600 dark:text-indigo-400",
          Icon: Info,
        };
    }
  };

  const { container, iconColor, Icon } = getVariantStyles();

  return (
    <div className={`w-full rounded-xl border p-4.5 sm:p-5 flex items-start gap-3.5 shadow-xs ${container}`}>
      <div className={`p-1.5 rounded-lg bg-white/80 dark:bg-neutral-900/60 shrink-0 ${iconColor}`}>
        <Icon className="w-4 h-4" />
      </div>

      <div className="flex-1 min-w-0">
        <h5 className="text-xs sm:text-sm font-bold tracking-tight mb-1">{title}</h5>
        <div className="text-xs leading-relaxed opacity-90 whitespace-pre-wrap">{content}</div>
      </div>
    </div>
  );
}

export function CalloutConfigPanel({
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
          Tipo / Variante
        </label>
        <select
          value={config.variant || "info"}
          onChange={(e) => onChange({ ...config, variant: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        >
          <option value="info">Informativo (Azul/Índigo)</option>
          <option value="warning">Advertencia (Ámbar)</option>
          <option value="success">Éxito (Esmeralda)</option>
          <option value="danger">Crítico / Peligro (Rosa/Rojo)</option>
        </select>
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Título del Callout
        </label>
        <input
          type="text"
          value={config.title || ""}
          placeholder="Nota importante o advertencia"
          onChange={(e) => onChange({ ...config, title: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg px-2.5 py-1.5"
        />
      </div>

      <div>
        <label className="text-xs font-semibold text-neutral-700 dark:text-neutral-300 block mb-1.5">
          Contenido
        </label>
        <textarea
          rows={3}
          value={config.content || ""}
          placeholder="Escribe el mensaje destacado..."
          onChange={(e) => onChange({ ...config, content: e.target.value })}
          className="w-full text-xs bg-white dark:bg-neutral-800 border border-neutral-200 dark:border-neutral-700 rounded-lg p-2.5 resize-none"
        />
      </div>
    </div>
  );
}
