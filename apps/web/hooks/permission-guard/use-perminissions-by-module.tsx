import { APPLICATION_STORAGE_KEY, LOGIN_ROUTE, ROLE_PERMISSIONS } from "@/config/constants";
import { storage } from "@/lib/storage";
import { getPermissionByModule } from "@/services/auth/authService";
import { create } from "zustand";
import { persist } from "zustand/middleware";

/**
 * Mapeo canónico de rutas de frontend hacia los módulos registrados en SDI Auth Service (app 9).
 * Se evalúan primero rutas compuestas específicas antes que rutas padre.
 */
export const MODULE_MAP: { prefix: string; canonical: string }[] = [
  { prefix: "/setting/connections", canonical: "/setting/connections" }, // ID: 186
  { prefix: "/setting/categories", canonical: "/setting/categories" },   // ID: 189
  { prefix: "/setting", canonical: "/setting" },                         // ID: 185
  { prefix: "/reports", canonical: "/reports" },                         // ID: 187
  { prefix: "/overview", canonical: "/overview" },                       // ID: 188 (Resumen)
  { prefix: "/users", canonical: "/users" },                             // ID: 190
  { prefix: "/my-reports", canonical: "/my-reports" },                   // ID: 191
  { prefix: "/documents", canonical: "/documents" },                     // ID: 192
  { prefix: "/downloads", canonical: "/downloads" },                     // ID: 193
  { prefix: "/examples", canonical: "/reports" },
];

export const resolveCanonicalModule = (path: string): string => {
  const cleanPath = path.startsWith("/") ? path : `/${path}`;
  const match = MODULE_MAP.find(
    (m) => cleanPath === m.prefix || cleanPath.startsWith(`${m.prefix}/`)
  );
  return match ? match.canonical : cleanPath;
};

interface ActionsRolePermission {
  module: string;
  permissions: string[];
  modulePermissions: Record<string, string[]>;
  isSyncing: boolean;
  syncPermission: (path: string, force?: boolean) => Promise<void>;
  clearPermissions: () => void;
}

// Variable en memoria para rastrear el último módulo sincronizado en la sesión actual
let lastSyncedCanonical: string = "";

const usePermissionsByModule = create<ActionsRolePermission>()(
  persist(
    (set, get) => ({
      module: "",
      permissions: [],
      modulePermissions: {},
      isSyncing: false,

      syncPermission: async (path, force = false) => {
        try {
          const currentModule = resolveCanonicalModule(path);
          const cachedPermissions = get().modulePermissions?.[currentModule];

          // 1. Si ya tenemos permisos en caché para este módulo:
          // Activamos inmediatamente para 0ms de latencia y cero UI flicker.
          if (cachedPermissions && cachedPermissions.length > 0) {
            set({
              module: currentModule,
              permissions: cachedPermissions,
            });
          }

          // 2. Si es exactamente el mismo módulo canónico que ya fue sincronizado
          // en esta navegación y no es forzado, evitamos llamadas redundantes entre subrutas/pestañas
          // (ej: pasar de /reports a /reports/schedule).
          if (currentModule === lastSyncedCanonical && !force) {
            return;
          }

          const application =
            (storage.get(APPLICATION_STORAGE_KEY) as string) ||
            process.env.NEXT_PUBLIC_APPLICATION_ID ||
            "9";

          // Asegurar que quede almacenado si no existía
          if (!storage.get(APPLICATION_STORAGE_KEY)) {
            storage.set(APPLICATION_STORAGE_KEY, application);
          }

          // Si no había caché, mostramos indicador de sincronización
          if (!cachedPermissions || cachedPermissions.length === 0) {
            set({ isSyncing: true });
          }

          lastSyncedCanonical = currentModule;

          const response = await getPermissionByModule({
            path: currentModule,
            application_id: application,
          });

          if (response && Array.isArray(response)) {
            set((state) => ({
              module: currentModule,
              permissions: response,
              modulePermissions: {
                ...state.modulePermissions,
                [currentModule]: response,
              },
              isSyncing: false,
            }));
          }
        } catch (error: any) {
          lastSyncedCanonical = ""; // Permitir reintento si ocurrió un error
          // Manejo proactivo si la sesión expiró (401)
          if (error?.status === 401) {
            storage.remove(APPLICATION_STORAGE_KEY);
            if (typeof window !== "undefined") {
              window.location.href = LOGIN_ROUTE;
            }
            return;
          }

          console.warn("Error al sincronizar permisos de módulo:", error);
        } finally {
          set({ isSyncing: false });
        }
      },

      clearPermissions: () => {
        lastSyncedCanonical = "";
        set({
          module: "",
          permissions: [],
          modulePermissions: {},
          isSyncing: false,
        });
      },
    }),
    { name: ROLE_PERMISSIONS }
  )
);

export default usePermissionsByModule;
