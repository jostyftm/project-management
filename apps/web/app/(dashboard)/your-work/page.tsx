"use client";

import React, { useEffect, useState, useMemo } from "react";
import Link from "next/link";
import { yourWorkService, YourWorkTab } from "@/services/plane/yourWorkService";
import { WorkItem } from "@/types/plane-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  UserCheck,
  FileEdit,
  FileQuestion,
  Search,
  Calendar,
  AlertCircle,
  Hash,
  ExternalLink,
  Clock,
  Sparkles,
  Inbox,
} from "lucide-react";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";

export default function YourWorkPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<YourWorkTab>("assigned");
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);
  const [searchQuery, setSearchQuery] = useState<string>("");

  const fetchItems = async (tab: YourWorkTab) => {
    try {
      setLoading(true);
      const data = await yourWorkService.list(tab);
      setItems(data);
    } catch (err) {
      console.error("Error fetching your work:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (currentWorkspace) {
      fetchItems(activeTab);
    }
  }, [currentWorkspace, activeTab]);

  const filteredItems = useMemo(() => {
    if (!searchQuery.trim()) return items;
    const q = searchQuery.toLowerCase();
    return items.filter(
      (item) =>
        item.title.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q) ||
        item.project?.name.toLowerCase().includes(q)
    );
  }, [items, searchQuery]);

  const getPriorityBadge = (priority: string) => {
    switch (priority) {
      case "URGENT":
        return <Badge variant="destructive" className="bg-red-500/10 text-red-600 border-red-200">Urgente</Badge>;
      case "HIGH":
        return <Badge variant="outline" className="bg-amber-500/10 text-amber-600 border-amber-200">Alta</Badge>;
      case "MEDIUM":
        return <Badge variant="outline" className="bg-blue-500/10 text-blue-600 border-blue-200">Media</Badge>;
      case "LOW":
        return <Badge variant="outline" className="bg-slate-500/10 text-slate-600 border-slate-200">Baja</Badge>;
      default:
        return <Badge variant="outline" className="text-slate-400 border-slate-200">Sin prioridad</Badge>;
    }
  };

  return (
    <div className="flex-1 space-y-6 p-6 max-w-7xl mx-auto">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="size-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Your Work</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Centro de control personal: tareas asignadas, creadas y borradores pendientes en todo el workspace.
          </p>
        </div>

        <div className="relative w-full sm:w-72">
          <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
          <Input
            placeholder="Buscar en Your Work..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="pl-9 bg-white"
          />
        </div>
      </div>

      {/* Tabs strictly following user requirement: '2. organización por pestaña' */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as YourWorkTab)}
        className="w-full space-y-4"
      >
        <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
          <TabsTrigger value="assigned" className="flex items-center gap-2 text-xs font-semibold px-4 py-2">
            <UserCheck className="size-4" />
            <span>Asignadas a mí</span>
          </TabsTrigger>
          <TabsTrigger value="created" className="flex items-center gap-2 text-xs font-semibold px-4 py-2">
            <FileEdit className="size-4" />
            <span>Creadas por mí</span>
          </TabsTrigger>
          <TabsTrigger value="drafts" className="flex items-center gap-2 text-xs font-semibold px-4 py-2">
            <FileQuestion className="size-4" />
            <span>Borradores</span>
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-0">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-16 text-slate-400 space-y-2">
              <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600"></div>
              <p className="text-sm">Cargando tareas...</p>
            </div>
          ) : filteredItems.length === 0 ? (
            <div className="flex flex-col items-center justify-center p-16 border-2 border-dashed border-slate-200 rounded-xl bg-slate-50/50 text-center">
              <div className="p-3 bg-white rounded-full shadow-sm border border-slate-100 mb-3">
                <Inbox className="size-8 text-slate-400" />
              </div>
              <h3 className="font-semibold text-slate-700 text-base">No hay elementos en esta sección</h3>
              <p className="text-sm text-slate-500 max-w-sm mt-1">
                {activeTab === "assigned"
                  ? "No tienes work items asignados pendientes en este workspace."
                  : activeTab === "created"
                  ? "Aún no has creado work items en este workspace."
                  : "No tienes ningún borrador guardado en este momento."}
              </p>
            </div>
          ) : (
            <div className="bg-white border border-slate-200 rounded-xl overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-600">
                    <tr>
                      <th className="py-3 px-4">Identificador</th>
                      <th className="py-3 px-4">Título</th>
                      <th className="py-3 px-4">Proyecto</th>
                      <th className="py-3 px-4">Estado</th>
                      <th className="py-3 px-4">Prioridad</th>
                      <th className="py-3 px-4">Estimación</th>
                      <th className="py-3 px-4">Fecha Límite</th>
                      <th className="py-3 px-4 text-right">Acción</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {filteredItems.map((item) => (
                      <tr key={item.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="font-mono text-xs font-bold bg-indigo-50 text-indigo-700 px-2 py-0.5 rounded border border-indigo-100">
                            {item.identifier}
                          </span>
                        </td>
                        <td className="py-3 px-4 font-medium text-slate-800">
                          <div className="flex items-center gap-2 max-w-md truncate">
                            {item.is_draft && (
                              <span className="text-[10px] font-bold bg-amber-100 text-amber-800 px-1.5 py-0.5 rounded">
                                DRAFT
                              </span>
                            )}
                            <span className="truncate">{item.title}</span>
                          </div>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span className="text-xs text-slate-600 font-medium bg-slate-100 px-2 py-1 rounded">
                            {item.project?.name || "Proyecto"}
                          </span>
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {item.state ? (
                            <div className="inline-flex items-center gap-1.5 px-2 py-0.5 rounded-full text-xs font-medium border"
                                 style={{
                                   backgroundColor: `${item.state.color}15`,
                                   borderColor: `${item.state.color}40`,
                                   color: item.state.color,
                                 }}>
                              <span className="size-2 rounded-full" style={{ backgroundColor: item.state.color }} />
                              {item.state.name}
                            </div>
                          ) : (
                            <span className="text-xs text-slate-400">Sin estado</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          {getPriorityBadge(item.priority)}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-600 font-medium">
                          {item.estimate_value ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              {item.estimate_value}
                            </span>
                          ) : item.estimate_points ? (
                            <span className="bg-slate-100 px-2 py-0.5 rounded">
                              {item.estimate_points} pts
                            </span>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-xs text-slate-500">
                          {item.target_date ? (
                            <div className="flex items-center gap-1">
                              <Calendar className="size-3.5 text-slate-400" />
                              <span>{item.target_date}</span>
                            </div>
                          ) : (
                            <span className="text-slate-300">-</span>
                          )}
                        </td>
                        <td className="py-3 px-4 text-right whitespace-nowrap">
                          {item.project?.id ? (
                            <Link href={`/projects/${item.project.id}`}>
                              <Button variant="ghost" size="sm" className="h-8 gap-1 text-indigo-600 hover:text-indigo-800">
                                <span>Ver</span>
                                <ExternalLink className="size-3.5" />
                              </Button>
                            </Link>
                          ) : null}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
}
