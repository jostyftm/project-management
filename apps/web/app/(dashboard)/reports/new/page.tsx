"use client";
import React, { useEffect } from "react";
import { CardHomePage } from "@/components/ui/card-home-page";
import { Skeleton } from "@/components/ui/skeleton";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { useReportWizardStore } from "@/hooks/zustand/use-report-wizard-store";
import { useListConnections } from "@/app/(dashboard)/setting/connections/hooks/use-list-connections";
import { useListReportCategories } from "@/hooks/use-list-report-categories";
import { ReportWizard } from "../components/wizard/ReportWizard";
import { ReportPrerequisitesWizard } from "../components/wizard/ReportPrerequisitesWizard";
import GeneralDialogConnection from "@/app/(dashboard)/setting/connections/components/dialog/GeneralDialogConnection";
import GeneralDialogCategory from "@/app/(dashboard)/setting/categories/components/dialog/GeneralDialogCategory";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

const NewReportPage = () => {
  const fetchCatalogs = useCatalogStore((state) => state.fetchCatalogs);
  const reset = useReportWizardStore((state) => state.reset);

  const { data: connections, isLoading: isLoadingConnections } =
    useListConnections({
      params: { params: { paginate: false } },
    });
  const { data: categories, isLoading: isLoadingCategories } =
    useListReportCategories();

  useEffect(() => {
    fetchCatalogs();
    reset();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const isLoading = isLoadingConnections || isLoadingCategories;
  const hasConnections = (connections?.length ?? 0) > 0;
  const hasCategories = (categories?.length ?? 0) > 0;
  const missingPrerequisites = !hasConnections || !hasCategories;

  return (
    <PermissionGuard
      action="create"
      unauthorizedComponent={<Unauthorized />}
    >
      <CardHomePage title="Crear reporte" backRoute="/reports">
        {isLoading ? (
          <div className="p-6 space-y-6 w-full">
            <div className="space-y-2 text-center">
              <Skeleton className="h-6 w-48 mx-auto" />
              <Skeleton className="h-4 w-96 mx-auto" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
              <Skeleton className="h-20 w-full rounded-xl" />
            </div>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <Skeleton className="h-64 w-full rounded-xl" />
              <Skeleton className="h-64 w-full rounded-xl" />
            </div>
          </div>
        ) : missingPrerequisites ? (
          <ReportPrerequisitesWizard
            connections={connections ?? []}
            categories={categories ?? []}
          />
        ) : (
          <ReportWizard mode="create" />
        )}

        {/* Modales reutilizables in situ para crear conexión o categoría */}
        <GeneralDialogConnection />
        <GeneralDialogCategory />
      </CardHomePage>
    </PermissionGuard>
  );
};

export default NewReportPage;