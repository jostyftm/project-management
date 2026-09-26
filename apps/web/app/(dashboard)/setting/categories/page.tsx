"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/search-input";
import BaseIcon from "@/components/ui/base-icon";
import { Skeleton } from "@/components/ui/skeleton";
import PaginationButtons from "@/components/ui/pagination-buttons";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { CardHomePage } from "@/components/ui/card-home-page";
import { useResetPageOnEmpty } from "@/hooks/useResetPageOnEmpty";
import useDebounce from "@/hooks/use-debounce";
import { useListCategories } from "./hooks/use-list-categories";
import GeneralDialogCategory from "./components/dialog/GeneralDialogCategory";
import { ModalsNameCategory } from "./constants/category-constants";
import CategoryTree from "./components/tree/CategoryTree";
import { FolderTree, Plus, SearchX } from "lucide-react";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

const PageCategories = () => {
  const openModal = useModalActionStore((state) => state.openModal);

  const [search, setSearch] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const debouncedSearch = useDebounce(search, 300);

  const params = {
    filter: debouncedSearch ? { name: debouncedSearch } : {},
    page,
  };

  const { data, isLoading, meta } = useListCategories(params);

  useResetPageOnEmpty({ data, currentPage: page, onPageChange: setPage });

  const hasNoCategories = !isLoading && (!data || data.length === 0);

  return (
    <PermissionGuard
      action="view"
      unauthorizedComponent={<Unauthorized />}
    >
      <CardHomePage title="Categorías de reportes">
        <div className="px-4 space-y-4 mt-2">
          {/* Caso 1: No hay categorías registradas en el sistema (sin filtro de búsqueda) */}
          {hasNoCategories && !debouncedSearch ? (
            <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
              <div className="relative mb-6">
                <div className="w-24 h-24 rounded-3xl bg-purple-50 dark:bg-purple-950 flex items-center justify-center text-purple-600 shadow-inner border border-purple-200">
                  <FolderTree className="w-12 h-12 stroke-[1.5]" />
                </div>
                <div className="absolute -bottom-1.5 -right-1.5 w-9 h-9 rounded-xl bg-primary text-primary-foreground flex items-center justify-center shadow-md">
                  <Plus className="w-5 h-5 stroke-[2.5]" />
                </div>
              </div>

              <h3 className="text-2xl font-bold text-slate-900 tracking-tight mb-2">
                ¡Aún no tienes categorías creadas!
              </h3>
              <p className="text-sm text-muted-foreground max-w-md mb-8 leading-relaxed">
                Organiza y clasifica tus reportes en un catálogo jerárquico con niveles ilimitados de categorías y subcategorías.
              </p>

              <PermissionGuard action="create">
                <Button
                  size="lg"
                  className="gap-2 px-8 h-12 text-sm font-semibold shadow-md cursor-pointer hover:scale-[1.02] transition-transform"
                  onClick={() => openModal("create", ModalsNameCategory.createCategory)}
                >
                  <Plus className="w-4 h-4" />
                  <span>Crear mi primera categoría</span>
                </Button>
              </PermissionGuard>
            </div>
          ) : (
            <>
              {/* Barra de búsqueda y botón superior cuando existen categorías o hay búsqueda activa */}
              <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
                <div className="w-full sm:max-w-md">
                  <SearchInput
                    placeholder="Buscar categoría..."
                    onChangeDebounced={setSearch}
                  />
                </div>
                <div className="flex justify-end w-full sm:w-auto">
                  <PermissionGuard action="create">
                    <Button
                      className="cursor-pointer gap-2 w-full sm:w-auto"
                      onClick={() => openModal("create", ModalsNameCategory.createCategory)}
                    >
                      <BaseIcon name="Plus" />
                      <span>Crear categoría</span>
                    </Button>
                  </PermissionGuard>
                </div>
              </div>

              {/* Caso 2: Búsqueda sin resultados */}
              {hasNoCategories && debouncedSearch ? (
                <div className="flex flex-col items-center justify-center py-16 px-4 border-2 border-dashed rounded-xl text-center text-muted-foreground">
                  <div className="p-3 rounded-full bg-slate-100 text-slate-400 mb-3">
                    <SearchX className="w-8 h-8" />
                  </div>
                  <h4 className="text-base font-semibold text-slate-800">
                    No se encontraron categorías
                  </h4>
                  <p className="text-xs text-slate-500 max-w-sm mt-1 mb-4">
                    No hay ninguna categoría que coincida con &quot;{debouncedSearch}&quot;. Intenta con otro término o limpia el buscador.
                  </p>
                  <Button variant="outline" size="sm" onClick={() => setSearch("")}>
                    Limpiar búsqueda
                  </Button>
                </div>
              ) : (
                /* Caso 3: Árbol de categorías con datos o cargando */
                <div className="rounded-lg border border-slate-200 bg-white p-3">
                  {isLoading && !data.length ? (
                    <div className="space-y-2 p-2 py-1">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <Skeleton key={i} className="h-6 w-full" />
                      ))}
                    </div>
                  ) : data.length > 0 ? (
                    <CategoryTree categories={data} />
                  ) : null}

                  {meta && meta.total > 0 && (
                    <div className="mt-3 border-t border-slate-100 pt-3">
                      <PaginationButtons
                        meta={meta}
                        onPressPage={setPage}
                        disabled={isLoading}
                      />
                    </div>
                  )}
                </div>
              )}
            </>
          )}

          <GeneralDialogCategory />
        </div>
      </CardHomePage>
    </PermissionGuard>
  );
};

export default PageCategories;
