import { DetectedParam, QueryParamType } from "../types/query-execute-type";

export const TEMPLATE_PARAM_REGEX = /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g;
export const LEGACY_PARAM_REGEX = /(?<![a-zA-Z0-9_:]):([a-zA-Z0-9_]+)\b/g;
export const LEGACY_MALFORMED_REGEX = /(?<!:)(?<=[a-zA-Z0-9_]):([a-zA-Z0-9_]+)\b/g;

/**
 * Reemplaza el contenido de los literales de texto (entre comillas simples/dobles)
 * por espacios, conservando las comillas y las posiciones originales.
 * Respeta los escapes habituales de SQL: '' / "" y backslash.
 *
 * Permite aplicar los regex de parámetros sin falsos positivos dentro de literales,
 * por ejemplo 'HH24:MI' ya no se interpreta como el parámetro legacy :MI.
 */
export function maskSqlLiterals(sql: string): string {
  if (!sql) return sql;

  const chars = sql.split("");
  let quote: "'" | '"' | null = null;

  for (let i = 0; i < chars.length; i++) {
    const ch = chars[i];

    if (quote) {
      if (ch === "\\" && chars[i + 1] !== undefined) {
        chars[i] = " ";
        chars[i + 1] = " ";
        i++;
        continue;
      }

      if (ch === quote && chars[i + 1] === quote) {
        chars[i] = " ";
        chars[i + 1] = " ";
        i++;
        continue;
      }

      if (ch === quote) {
        chars[i] = " ";
        quote = null;
        continue;
      }

      chars[i] = " ";
      continue;
    }

    if (ch === "'" || ch === '"') {
      quote = ch;
    }
  }

  return chars.join("");
}

/**
 * Extrae parámetros dinámicos de una consulta SQL.
 * Soporta prioritariamente el formato de doble llave {{parametro}} (sin colisiones con sintaxis SQL)
 * y mantiene fallback retroactivo para parámetros legacy :parametro.
 */
export function extractSqlParameters(sql: string): string[] {
  if (!sql) return [];

  // Ignorar plantillas/parámetros que aparezcan dentro de literales de texto.
  const maskedSql = maskSqlLiterals(sql);

  const templateMatches = [...maskedSql.matchAll(TEMPLATE_PARAM_REGEX)].map(
    (m) => m[1].trim()
  );
  if (templateMatches.length > 0) {
    return Array.from(new Set(templateMatches));
  }

  const legacyMatches = [...maskedSql.matchAll(LEGACY_PARAM_REGEX)].map(
    (m) => m[1]
  );
  return Array.from(new Set(legacyMatches));
}

/**
 * Detecta parámetros que parecen estar mal formados:
 * - Llaves dobles {{ sin cerrar con }}
 * - Parámetros legacy pegados a identificadores (ej: s.is_active:activo)
 */
export function detectMalformedSqlParameters(sql: string): string[] {
  if (!sql) return [];

  // Ignorar contenido dentro de literales de texto para no marcar falsos positivos
  // como 'HH24:MI' (ej: TO_CHAR(fecha, 'HH24:MI')) o texto literal 'abc:MI'.
  const maskedSql = maskSqlLiterals(sql);

  const hasTemplateParams =
    [...maskedSql.matchAll(TEMPLATE_PARAM_REGEX)].length > 0;

  // 1. Verificar si hay {{ sin cerrar eliminando los {{param}} válidos
  const cleanSql = maskedSql.replace(TEMPLATE_PARAM_REGEX, "");
  const unclosedMatch = cleanSql.match(/\{\{\s*([a-zA-Z0-9_]+)/);
  if (unclosedMatch) {
    return [`{{${unclosedMatch[1]}`];
  }

  // 2. Si usa sintaxis de plantilla {{...}}, no validar legacy con dos puntos
  if (hasTemplateParams) {
    return [];
  }

  // 3. Fallback legacy para :param pegado
  const matches = [...maskedSql.matchAll(LEGACY_MALFORMED_REGEX)].map(
    (m) => m[1]
  );
  return Array.from(new Set(matches));
}

/**
 * Infiere el tipo de dato de un parámetro según su nombre.
 */
export function inferParamType(paramName: string): QueryParamType {
  const lower = paramName.toLowerCase();

  // Fecha y hora
  if (/(hora|datetime|timestamp)/i.test(lower)) {
    return "datetime-local";
  }

  // Fechas
  if (/(fecha|date|desde|hasta|periodo|inicio|fin|dia)/i.test(lower)) {
    return "date";
  }

  // Números / IDs / Cantidades
  if (
    /(id|cantidad|monto|total|precio|num|numero|edad|limit|porcentaje|qty|count)/i.test(
      lower
    )
  ) {
    return "number";
  }

  // Booleanos
  if (/^(is_|es_|has_)|(activo|enabled)/i.test(lower)) {
    return "boolean";
  }

  return "text";
}

/**
 * Devuelve un valor por defecto sugerido según el tipo de dato.
 */
export function getDefaultParamValue(type: QueryParamType): string {
  switch (type) {
    case "date":
      return new Date().toISOString().slice(0, 10);
    case "datetime-local":
      return new Date().toISOString().slice(0, 16);
    case "number":
      return "1";
    case "boolean":
      return "true";
    case "text":
    default:
      return "";
  }
}

/**
 * Fusiona los parámetros extraídos del SQL con los valores preexistentes en memoria
 * para no perder los datos que el usuario ya haya tipeado.
 */
export function mergeDetectedParams(
  sql: string,
  existingMap: Record<string, { type?: QueryParamType; value: string }> = {}
): DetectedParam[] {
  const names = extractSqlParameters(sql);

  return names.map((name) => {
    const existing = existingMap[name];
    const type = existing?.type ?? inferParamType(name);
    const value =
      existing?.value !== undefined
        ? existing.value
        : getDefaultParamValue(type);

    return {
      name,
      type,
      value,
    };
  });
}
