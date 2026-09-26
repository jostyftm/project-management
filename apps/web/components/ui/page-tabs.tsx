import { Permissions } from "@/hooks/permission-guard/use-check-has-permission";
import Link from "next/link";
import { usePathname } from "next/navigation";
import PermissionGuard from "../common/permision-guard/permission-guard";

export interface NavigationRoute {
  name: string;
  path: string;
  redirect?: string;
  permission?: Permissions;
}

interface NavigationTabsProps {
  routes: NavigationRoute[];
  onSelect?: (value: string) => void;
}

export const PageTabs: React.FC<NavigationTabsProps> = ({ routes = [] }) => {
  const router = usePathname();

  const matchingRoutes = routes.filter(
    (r) => router === r.path || router.startsWith(`${r.path}/`)
  );
  const activeRoute = matchingRoutes.reduce<NavigationRoute | null>(
    (best, r) => (!best || r.path.length > best.path.length ? r : best),
    null
  );

  return (
    <div className="flex gap-4 text-xs md:text-sm">
      <nav className="w-full flex overflow-x-auto scrollbar-none border-gray-200 py-2 px-2 md:px-0">
        {routes.map((element, item) => {
          const isActive = activeRoute?.path === element.path;
          return (
            <PermissionGuard
              key={item + 1}
              requiredPermissions={element.permission ?? []}
            >
              <Link
                key={item + 1}
                href={element.redirect ? element.redirect : element.path}
                className={`${
                  isActive ? "font-bold text-gray-900" : "text-gray-500 hover:text-gray-700"
                } block py-2 px-3 whitespace-nowrap transition-colors`}
                aria-current={isActive ? "page" : undefined}
              >
                <div>
                  {element.name}
                  <div
                    className={`h-0.5 mt-2 w-full rounded ${
                      isActive ? "bg-gray-900" : "hidden"
                    }`}
                  ></div>
                </div>
              </Link>
            </PermissionGuard>
          );
        })}
      </nav>
    </div>
  );
};
