"use client";
import React, { useEffect, useState, useMemo } from "react";
import TemplateDialog from "@/components/common/templates/template-dialog";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { UserItem } from "../../types/user-types";
import { ModalsNameUser } from "../../constants/user-constants";
import { useUserActions } from "../../hooks/use-user-actions";
import {
  getUserReportsService,
  requestAllAvailableReports,
} from "../../services/user-service";
import { Report } from "@/types/report-type";
import { CheckSquare, FileSpreadsheet, Loader2, Search, Square } from "lucide-react";

const AssignReportsModal = () => {
  const { closeModal, name, open, data } = useModalActionStore();
  const user = data as UserItem;
  const { assignReports, isLoading } = useUserActions();

  const [availableReports, setAvailableReports] = useState<Report[]>([]);
  const [selectedReportIds, setSelectedReportIds] = useState<number[]>([]);
  const [isLoadingReports, setIsLoadingReports] = useState<boolean>(false);
  const [searchTerm, setSearchTerm] = useState<string>("");

  const isOpen = open && name === ModalsNameUser.assignReports;

  useEffect(() => {
    if (isOpen && user?.id) {
      setIsLoadingReports(true);
      setSearchTerm("");

      Promise.all([
        requestAllAvailableReports(),
        getUserReportsService(user.id),
      ])
        .then(([allRes, userRes]) => {
          const allList = Array.isArray(allRes)
            ? allRes
            : Array.isArray(allRes?.data)
            ? allRes.data
            : [];
          const userList = Array.isArray(userRes)
            ? userRes
            : Array.isArray(userRes?.data)
            ? userRes.data
            : [];

          setAvailableReports(allList);
          setSelectedReportIds(userList.map((r) => Number(r.id)));
        })
        .catch(() => {
          setAvailableReports([]);
          setSelectedReportIds([]);
        })
        .finally(() => {
          setIsLoadingReports(false);
        });
    }
  }, [isOpen, user?.id]);

  const filteredReports = useMemo(() => {
    if (!searchTerm.trim()) return availableReports;
    const term = searchTerm.toLowerCase();
    return availableReports.filter(
      (r) =>
        r.attributes?.name?.toLowerCase().includes(term) ||
        r.relationships?.category?.name?.toLowerCase().includes(term) ||
        r.relationships?.connection?.attributes?.name?.toLowerCase().includes(term)
    );
  }, [availableReports, searchTerm]);

  if (!isOpen) return null;

  const handleToggleReport = (reportId: number) => {
    setSelectedReportIds((prev) =>
      prev.includes(reportId)
        ? prev.filter((id) => id !== reportId)
        : [...prev, reportId]
    );
  };

  const handleSelectAll = () => {
    const allFilteredIds = filteredReports.map((r) => Number(r.id));
    const allSelected = allFilteredIds.every((id) =>
      selectedReportIds.includes(id)
    );

    if (allSelected) {
      // Uncheck filtered reports
      setSelectedReportIds((prev) =>
        prev.filter((id) => !allFilteredIds.includes(id))
      );
    } else {
      // Add all filtered reports
      setSelectedReportIds((prev) =>
        Array.from(new Set([...prev, ...allFilteredIds]))
      );
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user?.id) return;

    try {
      await assignReports(user.id, selectedReportIds);
      closeModal();
    } catch {}
  };

  const areAllFilteredSelected =
    filteredReports.length > 0 &&
    filteredReports.every((r) => selectedReportIds.includes(Number(r.id)));

  return (
    <TemplateDialog
      open={isOpen}
      setOpen={() => closeModal()}
      title="Asignar reportes al usuario"
      descripction={`Gestiona los permisos de descarga de reportes para ${user?.attributes?.name || "el usuario"}.`}
      className="sm:max-w-2xl flex flex-col"
    >
      <div className="flex flex-col space-y-4 py-2">
        {/* User Card Summary */}
        <div className="p-3 bg-slate-50 border rounded-lg flex flex-col sm:flex-row sm:items-center justify-between gap-2 text-xs text-slate-600">
          <div>
            <span className="font-semibold text-slate-800">Usuario: </span>
            {user?.attributes?.name} ({user?.attributes?.email})
          </div>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-[11px] font-mono">
              Auth ID: #{user?.attributes?.user_auth_id ?? "N/A"}
            </Badge>
            <Badge variant="secondary" className="text-[11px]">
              {selectedReportIds.length} seleccionado(s)
            </Badge>
          </div>
        </div>

        {/* Search and Selection Tools */}
        <div className="flex items-center gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
            <Input
              placeholder="Buscar reporte por nombre, categoría o conexión..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="pl-9 h-9 text-xs"
            />
          </div>
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={handleSelectAll}
            disabled={filteredReports.length === 0 || isLoadingReports}
            className="h-9 gap-1.5 text-xs shrink-0"
          >
            {areAllFilteredSelected ? (
              <>
                <Square className="h-3.5 w-3.5" />
                <span>Deseleccionar</span>
              </>
            ) : (
              <>
                <CheckSquare className="h-3.5 w-3.5" />
                <span>Marcar todos</span>
              </>
            )}
          </Button>
        </div>

        {/* List of Reports */}
        <div className="border rounded-lg max-h-72 overflow-y-auto divide-y bg-white">
          {isLoadingReports ? (
            <div className="flex flex-col items-center justify-center py-12 gap-2 text-slate-400">
              <Loader2 className="w-6 h-6 animate-spin text-primary" />
              <span className="text-xs">Cargando reportes disponibles...</span>
            </div>
          ) : filteredReports.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-10 px-4 text-center text-slate-500">
              <FileSpreadsheet className="w-8 h-8 text-slate-300 mb-2" />
              <p className="text-sm font-medium text-slate-700">
                {searchTerm
                  ? "No se encontraron reportes con ese criterio"
                  : "No hay reportes disponibles en el sistema"}
              </p>
              <p className="text-xs text-slate-400 mt-1 max-w-xs">
                {searchTerm
                  ? "Intenta con otro término de búsqueda"
                  : "Crea primero reportes en el módulo de Reportes para poder asignarlos."}
              </p>
            </div>
          ) : (
            filteredReports.map((report) => {
              const rId = Number(report.id);
              const isChecked = selectedReportIds.includes(rId);

              return (
                <label
                  key={report.id}
                  htmlFor={`report-check-${report.id}`}
                  className={`flex items-start gap-3 p-3 text-xs transition-colors cursor-pointer hover:bg-slate-50/80 ${
                    isChecked ? "bg-primary/5" : ""
                  }`}
                >
                  <Checkbox
                    id={`report-check-${report.id}`}
                    checked={isChecked}
                    onCheckedChange={() => handleToggleReport(rId)}
                    className="mt-0.5"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center justify-between gap-2">
                      <span className="font-semibold text-slate-900 truncate">
                        {report.attributes?.name}
                      </span>
                      {report.relationships?.category?.name && (
                        <Badge
                          variant="outline"
                          className="text-[10px] uppercase font-normal shrink-0"
                        >
                          {report.relationships.category.name}
                        </Badge>
                      )}
                    </div>
                    {report.attributes?.description && (
                      <p className="text-slate-500 text-[11px] truncate mt-0.5">
                        {report.attributes.description}
                      </p>
                    )}
                    {report.relationships?.connection?.attributes?.name && (
                      <span className="inline-block text-[10px] text-slate-400 mt-0.5">
                        Conexión: {report.relationships.connection.attributes.name}
                      </span>
                    )}
                  </div>
                </label>
              );
            })
          )}
        </div>

        {/* Modal Actions */}
        <div className="flex items-center justify-between pt-3 border-t">
          <span className="text-xs text-slate-500">
            {selectedReportIds.length} de {availableReports.length} reportes permitidos
          </span>
          <div className="flex gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => closeModal()}
              disabled={isLoading || isLoadingReports}
            >
              Cancelar
            </Button>
            <Button
              type="button"
              onClick={handleSubmit}
              disabled={isLoading || isLoadingReports}
              className="gap-2"
            >
              {isLoading && <Loader2 className="w-4 h-4 animate-spin" />}
              <span>{isLoading ? "Guardando..." : "Guardar permisos"}</span>
            </Button>
          </div>
        </div>
      </div>
    </TemplateDialog>
  );
};

export default AssignReportsModal;
