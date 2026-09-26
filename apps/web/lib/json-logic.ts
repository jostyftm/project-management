import jsonLogic from "json-logic-js";
import { AlertConditionItem, ReportAlertConditionType } from "@/types/alert-types";

// Register custom operations in json-logic-js for full parity with backend
let operationsRegistered = false;

export function registerJsonLogicOperations() {
  if (operationsRegistered) return;

  // 1. older_than_days: fecha mayor a X días en el pasado
  jsonLogic.add_operation("older_than_days", (val: any, days: any) => {
    if (!val) return false;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays > Number(days);
    } catch {
      return false;
    }
  });

  // 2. newer_than_days: fecha dentro de los últimos X días
  jsonLogic.add_operation("newer_than_days", (val: any, days: any) => {
    if (!val) return false;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      const diffDays = (now.getTime() - d.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= Number(days);
    } catch {
      return false;
    }
  });

  // 3. days_until_less_than: fecha futura a menos de X días de vencer
  jsonLogic.add_operation("days_until_less_than", (val: any, days: any) => {
    if (!val) return false;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      const diffDays = (d.getTime() - now.getTime()) / (1000 * 60 * 60 * 24);
      return diffDays >= 0 && diffDays <= Number(days);
    } catch {
      return false;
    }
  });

  // 4. is_today: fecha corresponde al día de hoy
  jsonLogic.add_operation("is_today", (val: any) => {
    if (!val) return false;
    try {
      const d = new Date(val);
      if (isNaN(d.getTime())) return false;
      const now = new Date();
      return (
        d.getDate() === now.getDate() &&
        d.getMonth() === now.getMonth() &&
        d.getFullYear() === now.getFullYear()
      );
    } catch {
      return false;
    }
  });

  // 5. contains: búsqueda insensible a mayúsculas
  jsonLogic.add_operation("contains", (haystack: any, needle: any) => {
    if (needle === null || needle === undefined || needle === "") return true;
    return String(haystack ?? "").toLowerCase().includes(String(needle).toLowerCase());
  });

  // 6. not_contains: no contiene
  jsonLogic.add_operation("not_contains", (haystack: any, needle: any) => {
    if (needle === null || needle === undefined || needle === "") return false;
    return !String(haystack ?? "").toLowerCase().includes(String(needle).toLowerCase());
  });

  // 7. is_null: nulo o cadena vacía
  jsonLogic.add_operation("is_null", (val: any) => {
    return val === null || val === undefined || val === "";
  });

  // 8. is_not_null: no nulo ni vacío
  jsonLogic.add_operation("is_not_null", (val: any) => {
    return val !== null && val !== undefined && val !== "";
  });

  operationsRegistered = true;
}

// Auto-register operations on load
registerJsonLogicOperations();

/**
 * Construye un nodo individual de condición compatible con JsonLogic
 */
export function buildConditionNode(column: string, operator: string, value: any): Record<string, any> {
  const varRef = { var: column };
  const numVal = !isNaN(Number(value)) && value !== "" ? Number(value) : value;

  switch (operator) {
    case "is_null":
      return { is_null: varRef };
    case "is_not_null":
      return { is_not_null: varRef };
    case "is_today":
      return { is_today: varRef };
    case "older_than_days":
      return { older_than_days: [varRef, Number(value) || 0] };
    case "newer_than_days":
      return { newer_than_days: [varRef, Number(value) || 0] };
    case "days_until_less_than":
      return { days_until_less_than: [varRef, Number(value) || 0] };
    case "contains":
      return { contains: [varRef, value] };
    case "not_contains":
      return { not_contains: [varRef, value] };
    case "=":
      return { "==": [varRef, numVal] };
    case "!=":
      return { "!=": [varRef, numVal] };
    case ">":
      return { ">": [varRef, numVal] };
    case ">=":
      return { ">=": [varRef, numVal] };
    case "<":
      return { "<": [varRef, numVal] };
    case "<=":
      return { "<=": [varRef, numVal] };
    default:
      return { "==": [varRef, numVal] };
  }
}

/**
 * Compila las condiciones visuales del Alert Builder a un AST JsonLogic estándar
 */
export function compileConditionsToJsonLogic(
  conditionType: ReportAlertConditionType,
  conditions: AlertConditionItem[],
  singleFallback?: { column?: string | null; operator?: string; value?: string }
): Record<string, any> {
  if (conditionType === "row_count") {
    const op = singleFallback?.operator || ">";
    const val = Number(singleFallback?.value ?? 0);
    const validOp = [">", ">=", "<", "<=", "==", "!="].includes(op) ? op : "==";
    return { [validOp === "=" ? "==" : validOp]: [{ var: "_row_count" }, val] };
  }

  if ((!conditions || conditions.length === 0) && singleFallback?.column) {
    return buildConditionNode(
      singleFallback.column,
      singleFallback.operator || "=",
      singleFallback.value || ""
    );
  }

  if (!conditions || conditions.length === 0) {
    return {};
  }

  // Agrupar por bloques AND separados por OR: (C1 AND C2) OR (C3 AND C4)
  const groups: AlertConditionItem[][] = [];
  let currentGroup: AlertConditionItem[] = [];

  conditions.forEach((cond, idx) => {
    const logic = (cond.logic_operator || "AND").toUpperCase();
    if (idx > 0 && logic === "OR") {
      if (currentGroup.length > 0) {
        groups.push(currentGroup);
      }
      currentGroup = [];
    }
    currentGroup.push(cond);
  });

  if (currentGroup.length > 0) {
    groups.push(currentGroup);
  }

  const orOperands: Record<string, any>[] = [];

  groups.forEach((group) => {
    const andOperands: Record<string, any>[] = group
      .filter((c) => !!c.column)
      .map((c) => buildConditionNode(c.column!, c.operator, c.value));

    if (andOperands.length === 1) {
      orOperands.push(andOperands[0]);
    } else if (andOperands.length > 1) {
      orOperands.push({ and: andOperands });
    }
  });

  if (orOperands.length === 1) {
    return orOperands[0];
  }

  if (orOperands.length > 1) {
    return { or: orOperands };
  }

  return {};
}

/**
 * Evalúa una regla JsonLogic en el cliente con datos arbitrarios
 */
export function evaluateJsonLogic(rule: Record<string, any>, data: any): boolean {
  if (!rule || Object.keys(rule).length === 0) return false;
  try {
    return Boolean(jsonLogic.apply(rule, data));
  } catch (err) {
    console.error("Error evaluating JsonLogic rule:", err);
    return false;
  }
}

/**
 * Evalúa una regla sobre un conjunto de filas simulando la detección del backend
 */
export function evaluateJsonLogicRows(
  rule: Record<string, any>,
  rows: Record<string, any>[]
): { triggered: boolean; evaluatedValue: string; matchingRows: Record<string, any>[] } {
  if (!rule || Object.keys(rule).length === 0) {
    return { triggered: false, evaluatedValue: "0", matchingRows: [] };
  }

  const ruleStr = JSON.stringify(rule);
  if (ruleStr.includes('"_row_count"')) {
    const triggered = evaluateJsonLogic(rule, { _row_count: rows.length, _rows: rows });
    return {
      triggered,
      evaluatedValue: String(rows.length),
      matchingRows: triggered ? rows.slice(0, 10) : [],
    };
  }

  const matching = rows.filter((row) => evaluateJsonLogic(rule, row));
  return {
    triggered: matching.length > 0,
    evaluatedValue: matching.length > 0 ? `${matching.length} filas detectadas` : "0 filas coincidentes",
    matchingRows: matching.slice(0, 10),
  };
}

export default jsonLogic;
