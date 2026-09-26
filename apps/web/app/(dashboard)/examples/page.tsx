"use client";
import React, { useState } from "react";
import { Button } from "@/components/ui/button";
import SearchInput from "@/components/ui/search-input";
import BaseIcon from "@/components/ui/base-icon";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { DataTable } from "@/components/ui/data-table";
import { CardHomePage } from "@/components/ui/card-home-page";
// import PermissionGuard from "@/components/common/permision-guard/permission-guard";
// import CheckingPermissions from "@/components/common/permision-guard/checking-permissions";
// import Unauthorized from "@/components/common/permision-guard/unauthorized";
import { useResetPageOnEmpty } from "@/hooks/useResetPageOnEmpty";
import useDebounce from "@/hooks/use-debounce";
import { useListExamples } from "./hooks/use-list-example";
import { ModalsNameExample } from "./constants/example-contants";
import { ColumnsExample } from "./components/(table)/ColumnsExample";
import GeneralDialogExample from "./components/dialog/GeneralDialogExample";

const PageExample = () => {
  const openModal = useModalActionStore((state) => state.openModal);

  const [search, setSearch] = useState<string>("");
  const [sort, setSort] = useState<string>("");
  const [page, setPage] = useState<number>(1);

  const debouncedSearch = useDebounce(search, 500);

  const params = {
    filter: { source_name: debouncedSearch },
    paginate: true,
    page: page,
    ...(sort ? { sort } : {}),
  };

  const { data, isLoading, meta } = useListExamples({ params: { params } });

  useResetPageOnEmpty({
    data,
    currentPage: page,
    onPageChange: setPage,
  });

  return (
    <CardHomePage title="Página de ejemplo">
      {/* <PermissionGuard
        skeleton={<CheckingPermissions />}
        unauthorizedComponent={<Unauthorized />}
        requiredPermissions={["aud_scrutiny_config_sources.read"]}
      > */}
        <div className="px-4 space-y-4 mt-2">
          <SearchInput placeholder="Buscar..." onChangeDebounced={setSearch} />
          {/* <PermissionGuard
            requiredPermissions={["aud_scrutiny_config_sources.create"]}
          > */}
            <div className="flex justify-end">
              <Button
                className="cursor-pointer"
                onClick={() =>
                  openModal("create", ModalsNameExample.createExample)
                }
              >
                <BaseIcon name="Plus" />
                <span>Crear</span>
              </Button>
            </div>
          {/* </PermissionGuard> */}

          <DataTable
            columns={ColumnsExample({
              setSortColumn: setSort,
              sortColumn: sort,
            })}
            data={data ?? []}
            isLoading={isLoading || !data}
            onPressPage={setPage}
            metaPagination={meta}
          />
          <GeneralDialogExample />
        </div>
      {/* </PermissionGuard> */}
    </CardHomePage>
  );
};

export default PageExample;
