"use client";
import React from "react";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import AlertDeleteDialog from "@/components/common/dialog/AlertDeleteDialog";
import TemplateDialog from "@/components/common/templates/template-dialog";
import { Report } from "@/types/report-type";
import { useReportActions } from "../../hooks/use-report-actions";
import { ModalsNameReport } from "../../constants/report-constants";

const GeneralDialogReport = () => {
  const { closeModal, name, open, data } = useModalActionStore();
  const report = data as Report;

  const { deleteReport, isLoading } = useReportActions();

  const handleDelete = async () => {
    if (report?.id) {
      try {
        await deleteReport(report.id);
        closeModal();
      } catch {}
    }
  };

  const isDelete = name === ModalsNameReport.deleteReport;

  if (!open || !isDelete) return null;

  return (
    <TemplateDialog
      open={open}
      setOpen={() => closeModal()}
      className="sm:max-w-2xl flex flex-col"
      title="Eliminar reporte"
    >
      <AlertDeleteDialog
        closeModal={() => closeModal()}
        action={handleDelete}
        isLoading={isLoading}
        title="Eliminar reporte"
        description={`¿Estás seguro de que deseas eliminar el reporte "${report?.attributes.name}"? Esta acción no se puede deshacer.`}
      />
    </TemplateDialog>
  );
};

export default GeneralDialogReport;