/**
 * Filename Pattern Resolver
 * 
 * Permite resolver macros y generar nombres dinámicos de descarga y archivos
 * generados tanto para ejecuciones bajo demanda como programadas.
 */

export interface FilenameToken {
  token: string;
  label: string;
  description: string;
  example: string;
  category: "general" | "date" | "time";
}

export interface FilenamePreset {
  id: string;
  label: string;
  pattern: string;
  description: string;
}

export const DEFAULT_FILENAME_PATTERN = "{report_name}_{YYYY}{MM}{DD}_{HH}{mm}{ss}";

export const FILENAME_TOKENS: FilenameToken[] = [
  {
    token: "{report_name}",
    label: "Nombre Reporte",
    description: "Nombre del reporte simplificado",
    example: "ventas_mensuales",
    category: "general",
  },
  {
    token: "{YYYY}",
    label: "Año (4 dígitos)",
    description: "Año completo (ej. 2026)",
    example: "2026",
    category: "date",
  },
  {
    token: "{YY}",
    label: "Año (2 dígitos)",
    description: "Año corto (ej. 26)",
    example: "26",
    category: "date",
  },
  {
    token: "{MM}",
    label: "Mes (01-12)",
    description: "Mes con dos dígitos",
    example: "09",
    category: "date",
  },
  {
    token: "{M}",
    label: "Mes (1-12)",
    description: "Mes sin cero inicial",
    example: "9",
    category: "date",
  },
  {
    token: "{DD}",
    label: "Día (01-31)",
    description: "Día con dos dígitos",
    example: "13",
    category: "date",
  },
  {
    token: "{D}",
    label: "Día (1-31)",
    description: "Día sin cero inicial",
    example: "13",
    category: "date",
  },
  {
    token: "{HH}",
    label: "Hora 24h (00-23)",
    description: "Hora en formato 24h",
    example: "14",
    category: "time",
  },
  {
    token: "{hh}",
    label: "Hora 12h (01-12)",
    description: "Hora en formato 12h",
    example: "02",
    category: "time",
  },
  {
    token: "{mm}",
    label: "Minutos (00-59)",
    description: "Minutos con dos dígitos",
    example: "35",
    category: "time",
  },
  {
    token: "{ss}",
    label: "Segundos (00-59)",
    description: "Segundos con dos dígitos",
    example: "45",
    category: "time",
  },
  {
    token: "{timestamp}",
    label: "Timestamp UNIX",
    description: "Marca de tiempo UNIX en segundos",
    example: "1789324000",
    category: "time",
  },
  {
    token: "{date}",
    label: "Fecha (YYYY-MM-DD)",
    description: "Fecha estándar ISO",
    example: "2026-09-13",
    category: "date",
  },
  {
    token: "{time}",
    label: "Hora (HH-mm-ss)",
    description: "Hora completa separada por guiones",
    example: "14-35-45",
    category: "time",
  },
];

export const FILENAME_PRESETS: FilenamePreset[] = [
  {
    id: "default",
    label: "Por defecto (Reporte + Fecha + Hora)",
    pattern: "{report_name}_{YYYY}{MM}{DD}_{HH}{mm}{ss}",
    description: "reporte_20260913_143500",
  },
  {
    id: "date-hyphen",
    label: "Reporte con fecha (YYYY-MM-DD)",
    pattern: "{report_name}_{YYYY}-{MM}-{DD}",
    description: "reporte_2026-09-13",
  },
  {
    id: "monthly",
    label: "Mensual (Reporte + Año-Mes)",
    pattern: "{report_name}_{YYYY}{MM}",
    description: "reporte_202609",
  },
  {
    id: "prefix-date",
    label: "Prefijo fecha (YYYYMMDD + Reporte)",
    pattern: "{YYYY}{MM}{DD}_{report_name}",
    description: "20260913_reporte",
  },
  {
    id: "timestamp",
    label: "Con timestamp UNIX",
    pattern: "{report_name}_{timestamp}",
    description: "reporte_1789324000",
  },
];

/**
 * Convierte un nombre en slug seguro para nombres de archivo.
 */
export function slugify(text: string): string {
  return text
    .toString()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase()
    .trim()
    .replace(/[^a-z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "");
}

/**
 * Resuelve una plantilla de nombre de archivo con las macros dadas.
 */
export function resolveFilenamePattern(
  pattern?: string | null,
  reportName: string = "reporte",
  extension?: string | null,
  date: Date = new Date()
): string {
  const effectivePattern = pattern?.trim() || DEFAULT_FILENAME_PATTERN;
  const safeReportName = slugify(reportName) || "reporte";

  const YYYY = date.getFullYear().toString();
  const YY = YYYY.slice(-2);
  const monthNum = date.getMonth() + 1;
  const MM = monthNum.toString().padStart(2, "0");
  const M = monthNum.toString();
  const dayNum = date.getDate();
  const DD = dayNum.toString().padStart(2, "0");
  const D = dayNum.toString();

  const hours24 = date.getHours();
  const HH = hours24.toString().padStart(2, "0");
  const hours12 = hours24 % 12 || 12;
  const hh = hours12.toString().padStart(2, "0");
  const minutes = date.getMinutes();
  const mm = minutes.toString().padStart(2, "0");
  const seconds = date.getSeconds();
  const ss = seconds.toString().padStart(2, "0");

  const timestamp = Math.floor(date.getTime() / 1000).toString();
  const dateFormatted = `${YYYY}-${MM}-${DD}`;
  const timeFormatted = `${HH}-${mm}-${ss}`;

  let result = effectivePattern;

  // 1. Reemplazar {date:FORMAT} custom
  result = result.replace(/\{date:([^}]+)\}/g, (_match, customFormat: string) => {
    return customFormat
      .replace(/YYYY/g, YYYY)
      .replace(/YY/g, YY)
      .replace(/MM/g, MM)
      .replace(/\bM\b/g, M)
      .replace(/DD/g, DD)
      .replace(/\bD\b/g, D)
      .replace(/HH/g, HH)
      .replace(/hh/g, hh)
      .replace(/mm/g, mm)
      .replace(/ss/g, ss);
  });

  // 2. Reemplazos directos
  const tokenMap: Record<string, string> = {
    "{report_name}": safeReportName,
    "{YYYY}": YYYY,
    "{YY}": YY,
    "{MM}": MM,
    "{M}": M,
    "{DD}": DD,
    "{D}": D,
    "{HH}": HH,
    "{hh}": hh,
    "{mm}": mm,
    "{ss}": ss,
    "{timestamp}": timestamp,
    "{date}": dateFormatted,
    "{time}": timeFormatted,
  };

  for (const [token, val] of Object.entries(tokenMap)) {
    result = result.split(token).join(val);
  }

  // 3. Sanitizar caracteres ilegales en sistemas de archivos
  result = result.replace(/[\\/:*?"<>|\x00-\x1F\x7F]/g, "_").trim();

  // 4. Gestionar la extensión
  if (extension) {
    const cleanExt = extension.replace(/^\.+/, "").toLowerCase();
    const extSuffix = `.${cleanExt}`;
    if (!result.toLowerCase().endsWith(extSuffix)) {
      result = `${result}${extSuffix}`;
    }
  }

  return result;
}
