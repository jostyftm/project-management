"use client";
import React, { useState, useEffect } from "react";
import { CardHomePage } from "@/components/ui/card-home-page";
import { DataTable } from "@/components/ui/data-table";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import BaseIcon from "@/components/ui/base-icon";
import AlertDeleteDialog from "@/components/common/dialog/AlertDeleteDialog";
import TemplateDialog from "@/components/common/templates/template-dialog";
import { ReportSchedule } from "@/types/schedule-type";
import { useCatalogStore } from "@/hooks/zustand/use-catalog-store";
import { useListSchedules } from "./hooks/use-list-schedules";
import { useScheduleActions } from "./hooks/use-schedule-actions";
import { useRunSchedule } from "./hooks/use-run-schedule";
import { ColumnsSchedule } from "./components/ColumnsSchedule";
import { ScheduleDialog } from "./components/ScheduleDialog";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";
import Unauthorized from "@/components/common/permision-guard/unauthorized";

const PageSchedule = () => {
  const fetchCatalogs = useCatalogStore((state) => state.fetchCatalogs);

  useEffect(() => {
    fetchCatalogs();
  }, [fetchCatalogs]);

  const [dialogOpen, setDialogOpen] = useState(false);
  const [editing, setEditing] = useState<ReportSchedule | null>(null);
  const [deleting, setDeleting] = useState<ReportSchedule | null>(null);
  const [selectedSchedules, setSelectedSchedules] = useState<ReportSchedule[]>([]);

  const { data, isLoading, refetch } = useListSchedules({
    params: { params: { paginate: true, page: 1 } },
  });

  const {
    deleteSchedule,
    cloneSchedule,
    bulkToggleSchedule,
    isLoading: isActionsLoading,
  } = useScheduleActions({
    refetch,
  });

  const { runSchedule, isRunning } = useRunSchedule();

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await deleteSchedule.mutateAsync(deleting.id);
      setDeleting(null);
    } catch {}
  };

  const handleNew = () => {
    setEditing(null);
    setDialogOpen(true);
  };

  const handleEdit = (schedule: ReportSchedule) => {
    setEditing(schedule);
    setDialogOpen(true);
  };

  const handleClone = async (schedule: ReportSchedule) => {
    try {
      await cloneSchedule.mutateAsync(schedule.id);
    } catch {}
  };

  const handleBulkToggle = async (status: "active" | "inactive") => {
    if (selectedSchedules.length === 0) return;
    const ids = selectedSchedules.map((s) => s.id);
    try {
      await bulkToggleSchedule.mutateAsync({ ids, status });
      setSelectedSchedules([]);
    } catch {}
  };

  return (
    <PermissionGuard
      action="view"
      unauthorizedComponent={<Unauthorized />}
    >
      <CardHomePage title="Programación de reportes">
        <div className="px-4 mt-2 space-y-4">
          <div className="flex items-center justify-between">
            <p className="text-sm text-muted-foreground">
              Define cuándo y a dónde se envían tus reportes.
            </p>
            <PermissionGuard action="create">
              <Button onClick={handleNew}>
                <BaseIcon name="Plus" size={15} />
                Nueva programación
              </Button>
            </PermissionGuard>
          </div>

          {/* Barra de acciones masivas (mejora 3.2) */}
          {selectedSchedules.length > 0 && (
            <div className="flex items-center justify-between p-2.5 px-4 rounded-lg bg-slate-100 dark:bg-slate-800 border border-slate-200 dark:border-slate-700 animate-in fade-in duration-200">
              <div className="flex items-center gap-2">
                <Badge variant="secondary" className="font-semibold">
                  {selectedSchedules.length}
                </Badge>
                <span className="text-xs text-muted-foreground">
                  programación{selectedSchedules.length > 1 ? "es" : ""} seleccionada{selectedSchedules.length > 1 ? "s" : ""}
                </span>
              </div>
              <div className="flex items-center gap-2">
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-green-700 border-green-300 hover:bg-green-50"
                  disabled={isActionsLoading}
                  onClick={() => handleBulkToggle("active")}
                >
                  <BaseIcon name="CircleCheck" size={14} />
                  Activar seleccionadas
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  className="h-8 gap-1.5 text-xs text-amber-700 border-amber-300 hover:bg-amber-50"
                  disabled={isActionsLoading}
                  onClick={() => handleBulkToggle("inactive")}
                >
                  <BaseIcon name="CircleSlash" size={14} />
                  Pausar seleccionadas
                </Button>
              </div>
            </div>
          )}

          <DataTable
            columns={ColumnsSchedule({
              onEdit: handleEdit,
              onDelete: setDeleting,
              onRun: (schedule) => runSchedule(schedule.id),
              onClone: handleClone,
              isRunningId: isRunning,
            })}
            data={data ?? []}
            isLoading={isLoading || !data}
            onSelectRows={(rows) => setSelectedSchedules(rows as unknown as ReportSchedule[])}
          />
        </div>

        <ScheduleDialog
          open={dialogOpen}
          onOpenChange={setDialogOpen}
          schedule={editing}
          onRefetch={refetch}
        />

        <TemplateDialog
          open={Boolean(deleting)}
          setOpen={() => setDeleting(null)}
          className="sm:max-w-md"
          title="Eliminar programación"
          descripction="Esta acción no se puede deshacer."
        >
          {deleting && (
            <AlertDeleteDialog
              closeModal={() => setDeleting(null)}
              action={handleDelete}
              isLoading={deleteSchedule.isPending}
              title="Eliminar programación"
              description="¿Estás seguro de que deseas eliminar esta programación? Esta acción no se puede deshacer."
            />
          )}
        </TemplateDialog>
      </CardHomePage>
    </PermissionGuard>
  );
};

export default PageSchedule;
