"use client";
import React, { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/search-input";
import BaseIcon from "@/components/ui/base-icon";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { DataTable } from "@/components/ui/data-table";
import { CardHomePage } from "@/components/ui/card-home-page";
import { useResetPageOnEmpty } from "@/hooks/useResetPageOnEmpty";
import useDebounce from "@/hooks/use-debounce";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { useListConnections } from "./hooks/use-list-connections";
import { ModalsNameConnection } from "./constants/connection-constants";
import { ColumnsConnection } from "./components/(table)/ColumnsConnection";
import GeneralDialogConnection from "./components/dialog/GeneralDialogConnection";
import { Database, Plus, SearchX } from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

const PageConnections = () => {
  const openModal = useModalActionStore((state) => state.openModal);
  const fetchCatalogs = useCatalogStore((state) => state.fetchCatalogs);

  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const debouncedSearch = useDebounce(search, 500);

  const params = {
    filter: { name: debouncedSearch },
    paginate: true,
    page: page,
    ...(sort ? { sort } : {}),
  };

  const { data, isLoading, meta } = useListConnections({
    params: { params },
  });

  useResetPageOnEmpty({ data, currentPage: page, onPageChange: setPage });

  useEffect(() => {
    fetchCatalogs();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const hasNoConnections = !isLoading && (!data || data.length === 0);

  return (
    <PermissionGuard
      action="view"
      unauthorizedComponent={<Unauthorized />}
    >
      <CardHomePage title="Conexiones a bases de datos">
        <div className="px-4 space-y-4 mt-2">
          {/* Caso 1: No hay conexiones registradas en el sistema (sin filtro de búsqueda) */}
          {hasNoConnections && !debouncedSearch ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-blue-50 dark:bg-blue-950 flex items-center justify-center text-blue-600 shadow-inner border border-blue-200">
                  <Database className="w-12 h-12 stroke-[1.5]" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                ¡Aún no tienes conexiones a bases de datos creadas!
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                Conecta tus motores PostgreSQL, MySQL u Oracle para comenzar a consultar y extraer información en tus reportes dinámicos.
              </p>

              <PermissionGuard action="create">
                <Button
                  size="lg"
                  className="gap-2 px-8 h-12 text-sm font-semibold shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() =>
                    openModal("create", ModalsNameConnection.createConnection)
                  }
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear mi primera conexión</span>
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <>
              {/* Barra de búsqueda y botón superior cuando existen conexiones o hay búsqueda activa */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:max-w-md">
                  <SearchInput
                    placeholder="Buscar conexión..."
                    onChangeDebounced={setSearch}
                  />
                </div>
                <div className="flex justify-end w-full sm:w-auto">
                  <PermissionGuard action="create">
                    <Button
                      className="cursor-pointer gap-2 w-full sm:w-auto"
                      onClick={() =>
                        openModal("create", ModalsNameConnection.createConnection)
                      }
                    >
                      <BaseIcon name="Plus" />
                      <span>Crear conexión</span>
                    </Button>
                  </PermissionGuard>
                </div>
              </div>

              {/* Caso 2: Búsqueda sin resultados */}
              {hasNoConnections && debouncedSearch ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                  <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
                    <SearchX className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-800">
                    No se encontraron conexiones
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    No hay ninguna conexión que coincida con &quot;{debouncedSearch}&quot;. Intenta con otro término o limpia el buscador.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                /* Caso 3: Tabla normal con datos o en estado de carga */
                <DataTable
                  columns={ColumnsConnection()}
                  data={data ?? []}
                  isLoading={isLoading || !data}
                  onPressPage={setPage}
                  metaPagination={meta}
                />
              )}
            </>
          )}

          <GeneralDialogConnection />
        </div>
      </CardHomePage>
    </PermissionGuard>
  );
};

export default PageConnections;
