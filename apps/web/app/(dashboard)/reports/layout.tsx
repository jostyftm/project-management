"use client";
import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";

import PermissionGuard from "@/components/common/permision-guard/permission-guard";

const routes = [
  { name: "Reportes", path: "/reports" },
  { name: "Programación", path: "/reports/schedule" },
  { name: "Historial de ejecuciones", path: "/reports/executions" },
  { name: "Alertas de Datos", path: "/reports/alerts" },
];

const ReportsLayout = ({ children }: { children: React.ReactNode }) => {
  const pathname = usePathname();

  // Selecciona la ruta coincidente más específica (la de path más largo)
  const matchingRoutes = routes.filter(
    (r) => pathname === r.path || pathname.startsWith(`${r.path}/`)
  );
  const activeRoute = matchingRoutes.reduce<(typeof routes)[0] | null>(
    (best, r) => (!best || r.path.length > best.path.length ? r : best),
    null
  );

  return (
    <div className="space-y-4">
      <nav className="w-full flex overflow-x-auto border-b border-gray-200 py-1 px-2 md:px-0 gap-4">
        {routes.map((element) => {
          const active = activeRoute?.path === element.path;
          return (
            <PermissionGuard key={element.path} action="view">
              <Link
                href={element.path}
                className={`block py-2 px-3 whitespace-nowrap text-xs md:text-sm transition-colors ${
                  active ? "font-bold text-gray-900" : "text-gray-500 hover:text-gray-700"
                }`}
                aria-current={active ? "page" : undefined}
              >
                <div>
                  {element.name}
                  <div
                    className={`h-0.5 mt-2 w-full rounded ${
                      active ? "bg-gray-900" : "hidden"
                    }`}
                  />
                </div>
              </Link>
            </PermissionGuard>
          );
        })}
      </nav>
      {children}
    </div>
  );
};

export default ReportsLayout;
