"use client";
import React, { useEffect } from "react";
import { useParams } from "next/navigation";
import { CardHomePage } from "@/components/ui/card-home-page";
import BaseIcon from "@/components/ui/base-icon";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { useReportById } from "../../hooks/use-report-by-id";
import { useReportWizardStore } from "@/hooks/zustand/use-report-wizard-store";
import { ReportWizard } from "../../components/wizard/ReportWizard";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

const EditReportPage = () => {
  const params = useParams<{ id: string }>();
  const id = params?.id ? String(params.id) : null;

  const fetchCatalogs = useCatalogStore((state) => state.fetchCatalogs);
  const reset = useReportWizardStore((state) => state.reset);

  const { data: report, isPending } = useReportById(id);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  return (
    <PermissionGuard
      action="update"
      unauthorizedComponent={<Unauthorized />}
    >
      <CardHomePage title="Actualizar reporte" backRoute="/reports">
        {isPending || !report ? (
          <div className="flex items-center gap-2 py-10 text-muted-foreground">
            <BaseIcon name="Loader" className="animate-spin" size={16} />
            Cargando reporte...
          </div>
        ) : (
          <ReportWizard mode="update" report={report} />
        )}
      </CardHomePage>
    </PermissionGuard>
  );
};

export default EditReportPage;