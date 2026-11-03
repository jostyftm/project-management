"use client";

import React, { useState } from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { Users, Shield, Briefcase, CheckCircle2, Clock, LayoutGrid, List } from "lucide-react";

interface MemberItem {
  id: string;
  name: string;
  email: string;
  avatar?: string | null;
  role: string;
  capacity_points: number;
  projects?: Array<{ id: string; name: string; identifier: string; role: string; capacity_points: number }>;
  total_assigned: number;
  active_assigned: number;
  completed_assigned: number;
}

interface ProjectMembersBlockProps {
  block: ReportBlock;
  data?: {
    members?: MemberItem[];
    total_members?: number;
    total_capacity_points?: number;
    role_distribution?: Record<string, number>;
  };
  isEditing?: boolean;
}

export function ProjectMembersBlock({ block, data }: ProjectMembersBlockProps) {
  const [viewMode, setViewMode] = useState<"cards" | "table">(block.config?.view_mode || "cards");

  const members: MemberItem[] = data?.members || [
    {
      id: "1",
      name: "Alejandro Gómez",
      email: "alejandro@ejemplo.com",
      role: "ADMIN",
      capacity_points: 20,
      total_assigned: 12,
      active_assigned: 5,
      completed_assigned: 7,
      projects: [{ id: "1", name: "Core Engine", identifier: "ENG", role: "ADMIN", capacity_points: 20 }],
    },
    {
      id: "2",
      name: "Mariana Silva",
      email: "mariana@ejemplo.com",
      role: "MEMBER",
      capacity_points: 18,
      total_assigned: 9,
      active_assigned: 3,
      completed_assigned: 6,
      projects: [{ id: "1", name: "Core Engine", identifier: "ENG", role: "MEMBER", capacity_points: 18 }],
    },
  ];

  const totalMembers = data?.total_members ?? members.length;
  const totalCapacity = data?.total_capacity_points ?? members.reduce((acc, m) => acc + (m.capacity_points || 0), 0);

  const getRoleBadge = (role: string) => {
    const normalized = (role || "").toUpperCase();
    if (normalized === "ADMIN" || normalized === "OWNER") {
      return (
        <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-semibold bg-indigo-50 text-indigo-700 dark:bg-indigo-950/50 dark:text-indigo-400 border border-indigo-200 dark:border-indigo-800">
          <Shield className="w-2.5 h-2.5" />
          {role}
        </span>
      );
    }
    if (normalized === "VIEWER") {
      return (
        <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-neutral-100 text-neutral-600 dark:bg-neutral-800 dark:text-neutral-400">
          Visualizador
        </span>
      );
    }
    return (
      <span className="px-2 py-0.5 rounded-full text-[10px] font-semibold bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400 border border-blue-200 dark:border-blue-800">
        {role || "Miembro"}
      </span>
    );
  };

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200/80 dark:border-neutral-800 rounded-xl p-5 shadow-xs">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 mb-5 pb-4 border-b border-neutral-100 dark:border-neutral-800/80">
        <div className="flex items-center gap-2.5">
          <div className="p-2 rounded-lg bg-indigo-50 dark:bg-indigo-950/50 text-indigo-600 dark:text-indigo-400">
            <Users className="w-4 h-4" />
          </div>
          <div>
            <h4 className="text-sm font-semibold text-neutral-900 dark:text-neutral-100">
              {block.title || "Integrantes del Proyecto"}
            </h4>
            <p className="text-xs text-neutral-500 dark:text-neutral-400">
              {totalMembers} miembro{totalMembers === 1 ? "" : "s"} registrado{totalMembers === 1 ? "" : "s"} • {totalCapacity} pts de capacidad combinada
            </p>
          </div>
        </div>

        {/* View mode toggle */}
        <div className="flex items-center gap-1 bg-neutral-100 dark:bg-neutral-800 p-0.5 rounded-lg self-start sm:self-auto">
          <button
            type="button"
            onClick={() => setViewMode("cards")}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              viewMode === "cards"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
            title="Vista de Tarjetas"
          >
            <LayoutGrid className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md text-xs transition-colors ${
              viewMode === "table"
                ? "bg-white dark:bg-neutral-700 text-neutral-900 dark:text-neutral-100 shadow-2xs"
                : "text-neutral-500 hover:text-neutral-900 dark:hover:text-neutral-200"
            }`}
            title="Vista de Tabla"
          >
            <List className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {members.length === 0 ? (
        <div className="py-8 text-center text-xs text-neutral-400">
          No se encontraron integrantes para los filtros seleccionados.
        </div>
      ) : viewMode === "cards" ? (
        /* Cards View */
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3.5">
          {members.map((m) => {
            const initial = (m.name || "U").charAt(0).toUpperCase();
            return (
              <div
                key={m.id}
                className="p-3.5 rounded-xl border border-neutral-200/80 dark:border-neutral-800 bg-neutral-50/40 dark:bg-neutral-900/40 hover:border-neutral-300 dark:hover:border-neutral-700 transition-colors flex flex-col justify-between"
              >
                <div>
                  <div className="flex items-start justify-between gap-2 mb-2">
                    <div className="flex items-center gap-2.5">
                      {m.avatar ? (
                        <img
                          src={m.avatar}
                          alt={m.name}
                          className="w-9 h-9 rounded-full object-cover border border-neutral-200 dark:border-neutral-700"
                        />
                      ) : (
                        <div className="w-9 h-9 rounded-full bg-gradient-to-br from-indigo-500 to-indigo-700 text-white flex items-center justify-center font-bold text-xs shadow-2xs">
                          {initial}
                        </div>
                      )}
                      <div>
                        <span className="text-xs font-semibold text-neutral-900 dark:text-neutral-100 block truncate max-w-[140px]">
                          {m.name}
                        </span>
                        <span className="text-[11px] text-neutral-500 dark:text-neutral-400 block truncate max-w-[140px]">
                          {m.email}
                        </span>
                      </div>
                    </div>
                    {getRoleBadge(m.role)}
                  </div>

                  {/* Projects Badges */}
                  {m.projects && m.projects.length > 0 && (
                    <div className="flex flex-wrap gap-1 mt-2.5 mb-3">
                      {m.projects.map((p) => (
                        <span
                          key={p.id}
                          className="inline-flex items-center gap-1 text-[10px] font-medium bg-neutral-100 dark:bg-neutral-800 text-neutral-600 dark:text-neutral-300 px-1.5 py-0.5 rounded"
                        >
                          <Briefcase className="w-2.5 h-2.5 opacity-60" />
                          {p.identifier || p.name}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                {/* Metrics Footer */}
                <div className="grid grid-cols-3 gap-1 pt-3 border-t border-neutral-200/60 dark:border-neutral-800 text-center">
                  <div>
                    <span className="text-[10px] text-neutral-400 block">Capacidad</span>
                    <span className="text-xs font-bold text-neutral-700 dark:text-neutral-300">
                      {m.capacity_points} pts
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-amber-600/80 dark:text-amber-400/80 block">Activas</span>
                    <span className="text-xs font-bold text-amber-600 dark:text-amber-400">
                      {m.active_assigned}
                    </span>
                  </div>
                  <div>
                    <span className="text-[10px] text-emerald-600/80 dark:text-emerald-400/80 block">Completadas</span>
                    <span className="text-xs font-bold text-emerald-600 dark:text-emerald-400">
                      {m.completed_assigned}
                    </span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Table View */
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-neutral-200 dark:border-neutral-800 text-[11px] font-semibold text-neutral-500 uppercase tracking-wider">
                <th className="py-2.5 px-3">Miembro</th>
                <th className="py-2.5 px-3">Rol</th>
                <th className="py-2.5 px-3 text-center">Capacidad</th>
                <th className="py-2.5 px-3 text-center">Tareas Activas</th>
                <th className="py-2.5 px-3 text-center">Completadas</th>
                <th className="py-2.5 px-3 text-right">Total Asignado</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-neutral-100 dark:divide-neutral-800/60 text-xs">
              {members.map((m) => (
                <tr key={m.id} className="hover:bg-neutral-50/50 dark:hover:bg-neutral-800/40">
                  <td className="py-3 px-3">
                    <div className="flex items-center gap-2.5">
                      <div className="w-7 h-7 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-400 font-bold flex items-center justify-center text-[10px]">
                        {(m.name || "U").charAt(0).toUpperCase()}
                      </div>
                      <div>
                        <span className="font-medium text-neutral-900 dark:text-neutral-100 block">
                          {m.name}
                        </span>
                        <span className="text-[11px] text-neutral-400">{m.email}</span>
                      </div>
                    </div>
                  </td>
                  <td className="py-3 px-3">{getRoleBadge(m.role)}</td>
                  <td className="py-3 px-3 text-center font-semibold text-neutral-700 dark:text-neutral-300">
                    {m.capacity_points} pts
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-amber-600 dark:text-amber-400">
                    {m.active_assigned}
                  </td>
                  <td className="py-3 px-3 text-center font-bold text-emerald-600 dark:text-emerald-400">
                    {m.completed_assigned}
                  </td>
                  <td className="py-3 px-3 text-right font-medium text-neutral-600 dark:text-neutral-400">
                    {m.total_assigned}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}

export function ProjectMembersConfigPanel({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Vista por defecto
        </label>
        <select
          value={config.view_mode || "cards"}
          onChange={(e) => onChange({ ...config, view_mode: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-2 text-neutral-800 dark:text-neutral-200"
        >
          <option value="cards">Cuadrícula de Tarjetas</option>
          <option value="table">Tabla Compacta</option>
        </select>
      </div>

      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Filtro por Rol
        </label>
        <select
          value={config.role || "all"}
          onChange={(e) => onChange({ ...config, role: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-2 text-neutral-800 dark:text-neutral-200"
        >
          <option value="all">Todos los roles</option>
          <option value="ADMIN">Administradores</option>
          <option value="MEMBER">Miembros</option>
          <option value="VIEWER">Visualizadores</option>
        </select>
      </div>
    </div>
  );
}
