import { usePathname } from "next/navigation";
import usePermissionsByModule, { resolveCanonicalModule } from "./use-perminissions-by-module";
import { matchActionInPermissions, SemanticAction } from "./use-check-has-permission";

export interface ModuleActions {
  canCreate: boolean;
  canRead: boolean;
  canUpdate: boolean;
  canDelete: boolean;
  canView: boolean;
  canExecute: boolean;
  isSuperAdmin: boolean;
  /** Evalúa dinámicamente cualquier acción semántica (ej: can('sync'), can('test'), can('export')) */
  can: (action: SemanticAction) => boolean;
  hasPermission: (action: SemanticAction) => boolean;
}

/**
 * Hook ergonómico contextual para consultar rápidamente acciones permitidas sobre el módulo actual
 * o sobre un recurso específico, sin manipular cadenas técnicas de base de datos.
 *
 * @example
 * // 1. Módulo actual (pantalla activa):
 * const { canCreate, canUpdate, canDelete, can } = useModuleActions();
 * if (can("sync")) { ... }
 *
 * // 2. Recurso o módulo cruzado específico:
 * const { canCreate } = useModuleActions("connections");
 */
export const useModuleActions = (resource?: string): ModuleActions => {
  const pathname = usePathname();
  const allModulePermissions = usePermissionsByModule((state) => state.modulePermissions);
  const currentPermissions = usePermissionsByModule((state) => state.permissions);

  // Determinar los permisos correspondientes:
  // 1. Si se especifica un recurso/módulo explícito (ej: 'connections'), usar sus permisos específicos.
  // 2. Si no se especifica, inferir el módulo canónico de la URL actual (pathname) para máxima precisión contextual.
  // 3. Fallback a currentPermissions del store.
  const activeCanonical = pathname ? resolveCanonicalModule(pathname) : "";
  const modulePerms = activeCanonical ? allModulePermissions[activeCanonical] : undefined;

  const permissions = resource
    ? allModulePermissions[resolveCanonicalModule(resource)] || currentPermissions
    : (modulePerms && modulePerms.length > 0 ? modulePerms : currentPermissions);

  const isSuperAdmin = permissions.includes("*");

  const checkAction = (action: string): boolean => {
    if (isSuperAdmin) return true;
    if (resource) {
      return (
        permissions.includes(`${resource}.${action}`) ||
        permissions.includes(`reports_${resource}.${action}`) ||
        matchActionInPermissions(action, permissions)
      );
    }
    return matchActionInPermissions(action, permissions);
  };

  const canCreate = checkAction("create");
  const canRead = checkAction("read");
  const canUpdate = checkAction("update");
  const canDelete = checkAction("delete");
  const canView = checkAction("view");
  const canExecute = checkAction("execute");

  return {
    canCreate,
    canRead,
    canUpdate,
    canDelete,
    canView,
    canExecute,
    isSuperAdmin,
    can: checkAction,
    hasPermission: checkAction,
  };
};

export default useModuleActions;
