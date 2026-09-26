"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/search-input";
import { DataTable } from "@/components/ui/data-table";
import { CardHomePage } from "@/components/ui/card-home-page";
import { useResetPageOnEmpty } from "@/hooks/useResetPageOnEmpty";
import useDebounce from "@/hooks/use-debounce";
import { useListUsers } from "./hooks/use-list-users";
import { useUserActions } from "./hooks/use-user-actions";
import { ColumnsUsers } from "./components/(table)/ColumnsUsers";
import GeneralDialogUser from "./components/dialog/GeneralDialogUser";
import { RefreshCw, SearchX, UserCheck, Users } from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

const PageUsers = () => {
  const [search, setSearch] = useState<string>("");
  const [sort] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const debouncedSearch = useDebounce(search, 500);

  const params = {
    filter: {
      ...(debouncedSearch ? { name: debouncedSearch } : {}),
    },
    paginate: true,
    page: page,
    limit: 10,
    ...(sort ? { sort } : {}),
  };

  const { data, isLoading, meta, refetch } = useListUsers({
    params: { params },
  });
  const { syncUsers, isSyncing } = useUserActions();

  useResetPageOnEmpty({ data, currentPage: page, onPageChange: setPage });

  const handleSync = async () => {
    try {
      await syncUsers({ sync: true });
      refetch();
    } catch {}
  };

  const hasNoUsers = !isLoading && (!data || data.length === 0);

  return (
    <PermissionGuard action="view" unauthorizedComponent={<Unauthorized />}>
      <CardHomePage title="Gestión de Usuarios">
        <div className="px-4 space-y-4 mt-2">
          {/* Caso 1: No hay usuarios registrados en el sistema */}
          {hasNoUsers && !debouncedSearch ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-primary/10 flex items-center justify-center text-primary shadow-inner border border-primary/20">
                  <Users className="w-12 h-12 stroke-[1.5]" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                  <UserCheck className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                ¡Aún no hay usuarios sincronizados!
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                Los usuarios se sincronizan automáticamente con el servicio central de autenticación según sus permisos en la aplicación de reportes.
              </p>

              <PermissionGuard action="sync">
                <Button
                  size="lg"
                  className="gap-2 px-8 h-12 text-sm font-semibold shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={handleSync}
                  disabled={isSyncing}
                >
                  <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin" : ""}`} />
                  <span>{isSyncing ? "Sincronizando usuarios..." : "Sincronizar usuarios ahora"}</span>
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <>
              {/* Barra de búsqueda y botón de sincronización */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:max-w-md">
                  <SearchInput
                    placeholder="Buscar usuario por nombre..."
                    onChangeDebounced={setSearch}
                  />
                </div>
                <div className="flex justify-end w-full sm:w-auto">
                  <PermissionGuard action="sync">
                    <Button
                      variant="outline"
                      className="cursor-pointer gap-2 w-full sm:w-auto border-slate-300 hover:bg-slate-50"
                      onClick={handleSync}
                      disabled={isSyncing}
                    >
                      <RefreshCw className={`w-4 h-4 ${isSyncing ? "animate-spin text-primary" : ""}`} />
                      <span>{isSyncing ? "Sincronizando..." : "Sincronizar con Auth"}</span>
                    </Button>
                  </PermissionGuard>
                </div>
              </div>

              {/* Caso 2: Búsqueda sin resultados */}
              {hasNoUsers && debouncedSearch ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                  <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
                    <SearchX className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-800">
                    No se encontraron usuarios
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    No hay ningún usuario registrado que coincida con &quot;{debouncedSearch}&quot;.
                  </p>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setSearch("")}
                  >
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                /* Caso 3: Tabla con datos o en estado de carga */
                <DataTable
                  columns={ColumnsUsers()}
                  data={data ?? []}
                  isLoading={isLoading || !data}
                  onPressPage={setPage}
                  metaPagination={meta}
                />
              )}
            </>
          )}

          <GeneralDialogUser />
        </div>
      </CardHomePage>
    </PermissionGuard>
  );
};

export default PageUsers;
