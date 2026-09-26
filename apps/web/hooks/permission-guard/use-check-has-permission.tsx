import { usePathname } from "next/navigation";
import usePermissionsByModule, { resolveCanonicalModule } from "./use-perminissions-by-module";

export type Operator = "AND" | "OR";

export type StandardAction =
  | "create"
  | "read"
  | "update"
  | "edit"
  | "delete"
  | "destroy"
  | "view"
  | "execute"
  | "run"
  | "test"
  | "toggle"
  | "generate"
  | "preview"
  | "sync"
  | "assign"
  | "download"
  | "export"
  | "duplicate"
  | "clone"
  | "publish"
  | "share"
  | "sign";

/**
 * Unión abierta: Ofrece autocompletado en el IDE de todas las acciones comunes,
 * pero permite escribir cualquier cadena personalizada sin errores de TypeScript.
 */
export type SemanticAction = StandardAction | (string & {});

type Actions = StandardAction;

type Modules =
  | "reports"
  | "reports_schedule"
  | "reports_alerts"
  | "reports_executions"
  | "my_reports"
  | "settings_connections"
  | "settings_categories"
  | "users"
  | "documents"
  | "dashboard";

type Especial = "" | "*";

export type Permissions = `${Modules}.${Actions}` | SemanticAction | Especial | string;

/**
 * Diccionario de equivalencias y sinónimos semánticos para tolerar
 * variaciones en la nomenclatura entre backend y frontend.
 */
export const ACTION_SYNONYMS: Record<string, string[]> = {
  view: ["view", "read", "list", "show"],
  read: ["read", "view", "list", "show"],
  create: ["create", "new", "store", "add"],
  update: ["update", "edit", "modify"],
  edit: ["update", "edit", "modify"],
  delete: ["delete", "destroy", "remove"],
  destroy: ["delete", "destroy", "remove"],
  execute: ["execute", "run", "play"],
  run: ["run", "execute", "play"],
  export: ["export", "download"],
  download: ["download", "export"],
  test: ["test", "test_connection", "check"],
  test_connection: ["test", "test_connection", "check"],
  duplicate: ["duplicate", "clone", "copy"],
  clone: ["duplicate", "clone", "copy"],
  toggle: ["toggle", "activate", "pause"],
  sync: ["sync", "synchronize", "refresh"],
};

/**
 * Verifica si un conjunto de permisos de usuario contiene una acción específica
 * (CRUD o personalizada como 'sync', 'export', 'test').
 */
export const matchActionInPermissions = (
  action: string,
  userPermissions: string[]
): boolean => {
  if (!userPermissions || userPermissions.length === 0) return false;
  if (userPermissions.includes("*")) return true;

  const targetAction = action.toLowerCase().trim();
  const synonyms = ACTION_SYNONYMS[targetAction] || [targetAction];

  return userPermissions.some((perm) => {
    const lowerPerm = perm.toLowerCase().trim();
    if (synonyms.includes(lowerPerm)) return true;

    // Si sigue el formato habitual: dominio.accion
    const parts = lowerPerm.split(".");
    const permAction = parts[parts.length - 1];
    return synonyms.includes(permAction);
  });
};

/**
 * Normaliza las variantes posibles de un permiso para garantizar compatibilidad
 * entre la convención simplificada (reports.create), la convención de base de datos
 * (reports_reports.create), y la equivalencia funcional view <-> read.
 */
export const normalizePermissionVariants = (perm: string): string[] => {
  const variants = new Set<string>([perm]);

  // 1. Homologación de prefijos (reports.accion <-> reports_reports.accion)
  if (perm.startsWith("reports.")) {
    variants.add(perm.replace(/^reports\./, "reports_reports."));
  } else if (perm.startsWith("reports_reports.")) {
    variants.add(perm.replace(/^reports_reports\./, "reports."));
  }

  // 2. Submódulos de reportes (schedule, alerts, executions heredan de reports si no están explícitos)
  if (
    perm.startsWith("reports_schedule.") ||
    perm.startsWith("reports_alerts.") ||
    perm.startsWith("reports_executions.")
  ) {
    const action = perm.split(".")[1] || "";
    variants.add(`reports.${action}`);
    variants.add(`reports_reports.${action}`);
  }

  // 3. Equivalencia de verbos: view <-> read
  const currentList = Array.from(variants);
  for (const v of currentList) {
    if (v.endsWith(".read")) {
      variants.add(v.replace(/\.read$/, ".view"));
    } else if (v.endsWith(".view")) {
      variants.add(v.replace(/\.view$/, ".read"));
    }
  }

  return Array.from(variants);
};

export const useCheckHasPermission = (
  requiredPermissions: Permissions | Permissions[],
  operator: Operator = "OR",
  targetModule?: string
): boolean => {
  const pathname = usePathname();
  const allModulePermissions = usePermissionsByModule((state) => state.modulePermissions);
  const currentPermissions = usePermissionsByModule((state) => state.permissions);

  const activeCanonical = pathname ? resolveCanonicalModule(pathname) : "";
  const activeModulePerms = activeCanonical ? allModulePermissions[activeCanonical] : undefined;

  const userPermissions = targetModule
    ? allModulePermissions[resolveCanonicalModule(targetModule)] || currentPermissions
    : (activeModulePerms && activeModulePerms.length > 0 ? activeModulePerms : currentPermissions);

  if (!userPermissions || userPermissions.length === 0) return false;

  // Si el usuario tiene comodín de superadmin
  if (userPermissions.includes("*")) return true;

  const required = Array.isArray(requiredPermissions)
    ? requiredPermissions
    : [requiredPermissions];

  const checkSingle = (permOrAction: string): boolean => {
    if (!permOrAction) return false;

    // Si no contiene punto, se evalúa como acción semántica contextual (ej: 'create', 'update', 'sync')
    if (!permOrAction.includes(".")) {
      return matchActionInPermissions(permOrAction, userPermissions);
    }

    // Si contiene punto, evaluar mediante normalización de variantes de nombre técnico
    const variants = normalizePermissionVariants(permOrAction);
    return variants.some((v) => userPermissions.includes(v));
  };

  return operator === "AND"
    ? required.every((p) => checkSingle(p))
    : required.some((p) => checkSingle(p));
};
