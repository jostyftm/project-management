"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams } from "next/navigation";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import { Project, State, WorkItem, WorkItemType } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { WorkItemDetailSheet } from "@/components/plane/WorkItemDetailSheet";
import {
  Kanban,
  List as ListIcon,
  Plus,
  Search,
  Filter,
  AlertCircle,
  Clock,
  CheckCircle2,
  XCircle,
  Circle,
  Hash,
  ChevronRight,
  Loader2,
  Trash2,
  Calendar,
  Layers,
  Sparkles,
  GitBranch,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FIBONACCI_VALUES = ["0", "1", "2", "3", "5", "8", "13", "21"];
const TSHIRT_VALUES = ["XS", "S", "M", "L", "XL", "XXL"];

// Priority helper
const getPriorityBadge = (priority: string) => {
  switch (priority) {
    case "URGENT":
      return { label: "Urgente", color: "bg-red-50 text-red-700 border-red-200" };
    case "HIGH":
      return { label: "Alta", color: "bg-orange-50 text-orange-700 border-orange-200" };
    case "MEDIUM":
      return { label: "Media", color: "bg-amber-50 text-amber-700 border-amber-200" };
    case "LOW":
      return { label: "Baja", color: "bg-blue-50 text-blue-700 border-blue-200" };
    default:
      return { label: "Ninguna", color: "bg-slate-50 text-slate-600 border-slate-200" };
  }
};

// Draggable Work Item Card
function KanbanCard({
  item,
  states,
  onStateChange,
  onDelete,
  onClick,
}: {
  item: WorkItem;
  states: State[];
  onStateChange: (itemId: string | number, newStateId: string | number) => void;
  onDelete: (itemId: string | number) => void;
  onClick: (item: WorkItem) => void;
}) {
  const { attributes, listeners, setNodeRef, transform, isDragging } = useDraggable({
    id: String(item.id),
    data: { item },
  });

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: isDragging ? 50 : undefined,
      }
    : undefined;

  const priorityInfo = getPriorityBadge(item.priority);

  return (
    <div
      ref={setNodeRef}
      style={style}
      {...listeners}
      {...attributes}
      onClick={() => onClick(item)}
      className={cn(
        "group relative bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all cursor-pointer",
        isDragging && "opacity-60 ring-2 ring-indigo-500 shadow-lg"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5">
          <span className="text-xs font-mono font-semibold text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
            {item.identifier}
          </span>
          {item.type && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.2 rounded"
              style={{ backgroundColor: `${item.type.color}15`, color: item.type.color }}
            >
              {item.type.name}
            </span>
          )}
        </div>
        <div className="flex items-center gap-1.5">
          <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", priorityInfo.color)}>
            {priorityInfo.label}
          </span>
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onDelete(item.id);
            }}
            className="size-5 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity"
          >
            <Trash2 className="size-3" />
          </Button>
        </div>
      </div>

      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-3">
        {item.title}
      </h4>

      <div className="flex items-center justify-between text-xs text-slate-400 pt-2 border-t border-slate-100">
        <div className="flex items-center gap-2">
          {item.estimate_value ? (
            <span className="bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">
              {item.estimate_value}
            </span>
          ) : item.estimate_points ? (
            <span className="bg-indigo-50 text-indigo-700 font-semibold px-1.5 py-0.5 rounded text-[10px]">
              {item.estimate_points} pts
            </span>
          ) : null}

          {item.sub_items && item.sub_items.length > 0 && (
            <span className="flex items-center gap-1 text-[10px] text-slate-500 bg-slate-100 px-1.5 py-0.5 rounded">
              <GitBranch className="size-2.5" />
              {item.sub_items.length}
            </span>
          )}
        </div>

        {item.created_at && (
          <span className="text-[11px] text-slate-400">
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        )}
      </div>
    </div>
  );
}

// Droppable Kanban Column
function KanbanColumn({
  state,
  items,
  states,
  onStateChange,
  onDelete,
  onCardClick,
}: {
  state: State;
  items: WorkItem[];
  states: State[];
  onStateChange: (itemId: string | number, newStateId: string | number) => void;
  onDelete: (itemId: string | number) => void;
  onCardClick: (item: WorkItem) => void;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: String(state.id),
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] w-full bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 max-h-[calc(100vh-14rem)] transition-colors",
        isOver && "bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-200"
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: state.color || "#6366f1" }}
          />
          <h3 className="font-semibold text-sm text-slate-800">{state.name}</h3>
        </div>
        <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full shadow-xs">
          {items.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {items.length === 0 ? (
          <div className="flex items-center justify-center p-6 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
            Sin items
          </div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              states={states}
              onStateChange={onStateChange}
              onDelete={onDelete}
              onClick={onCardClick}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function ProjectWorkItemsPage() {
  const params = useParams();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [types, setTypes] = useState<WorkItemType[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View & Filters
  const [viewMode, setViewMode] = useState<"kanban" | "list">("kanban");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");

  // Create Modal & Draft Persistence
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [newTitle, setNewTitle] = useState("");
  const [newDescription, setNewDescription] = useState("");
  const [newPriority, setNewPriority] = useState<string>("NONE");
  const [newTypeId, setNewTypeId] = useState<string>("");
  const [newStateId, setNewStateId] = useState<string>("");
  const [newEstimateValue, setNewEstimateValue] = useState<string>("");

  // Work Item Detail Sheet
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  // Restore draft from localStorage
  useEffect(() => {
    if (!projectId) return;
    try {
      const saved = localStorage.getItem(`plane_draft_${projectId}`);
      if (saved) {
        const parsed = JSON.parse(saved);
        if (parsed.title) setNewTitle(parsed.title);
        if (parsed.description) setNewDescription(parsed.description);
      }
    } catch {
      // Ignore storage errors
    }
  }, [projectId]);

  // Persist draft on change
  const handleTitleChange = (val: string) => {
    setNewTitle(val);
    try {
      localStorage.setItem(
        `plane_draft_${projectId}`,
        JSON.stringify({ title: val, description: newDescription })
      );
    } catch {
      // Ignore
    }
  };

  const handleDescChange = (val: string) => {
    setNewDescription(val);
    try {
      localStorage.setItem(
        `plane_draft_${projectId}`,
        JSON.stringify({ title: newTitle, description: val })
      );
    } catch {
      // Ignore
    }
  };

  const loadData = useCallback(async () => {
    if (!projectId) return;
    setIsLoading(true);
    try {
      const [projData, statesData, itemsData, typesData] = await Promise.all([
        projectService.get(projectId),
        projectService.getStates(projectId),
        workItemService.list(projectId),
        workItemTypeService.list(projectId),
      ]);
      setProject(projData);
      setStates(statesData);
      setWorkItems(itemsData);
      setTypes(typesData);
      if (statesData.length > 0 && !newStateId) {
        setNewStateId(String(statesData[0].id));
      }
      if (typesData.length > 0 && !newTypeId) {
        setNewTypeId(String(typesData[0].id));
      }
    } catch (err: any) {
      toast.error("Error al cargar la información del proyecto");
    } finally {
      setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStateChange = async (itemId: string | number, nextStateId: string | number) => {
    setWorkItems((prev) =>
      prev.map((item) => {
        if (String(item.id) === String(itemId)) {
          const targetState = states.find((s) => String(s.id) === String(nextStateId));
          return { ...item, state: targetState };
        }
        return item;
      })
    );

    try {
      await workItemService.update(itemId, { state_id: nextStateId });
      const targetState = states.find((s) => String(s.id) === String(nextStateId));
      toast.success(`Estado cambiado a "${targetState?.name ?? 'Nuevo estado'}"`);
    } catch (err: any) {
      toast.error("No se pudo actualizar el estado");
      loadData();
    }
  };

  const handleDeleteItem = async (itemId: string | number) => {
    try {
      await workItemService.delete(itemId);
      setWorkItems((prev) => prev.filter((i) => String(i.id) !== String(itemId)));
      toast.success("Work item eliminado");
    } catch (err: any) {
      toast.error("Error al eliminar el work item");
    }
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over) return;

    const itemId = String(active.id);
    const targetStateId = String(over.id);

    const currentItem = workItems.find((w) => String(w.id) === itemId);
    if (!currentItem || String(currentItem.state?.id) === targetStateId) {
      return;
    }

    handleStateChange(itemId, targetStateId);
  };

  const handleOpenDetail = (item: WorkItem) => {
    setSelectedItemId(item.id);
    setDetailSheetOpen(true);
  };

  const handleCreateWorkItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newTitle.trim()) return;

    setIsSubmitting(true);
    try {
      await workItemService.create(projectId, {
        title: newTitle.trim(),
        priority: newPriority as any,
        state_id: newStateId || (states[0]?.id ? String(states[0].id) : undefined),
        type_id: newTypeId || undefined,
        estimate_value: newEstimateValue || undefined,
        estimate_points: newEstimateValue && !isNaN(Number(newEstimateValue)) ? Number(newEstimateValue) : undefined,
      });

      toast.success("Work item creado exitosamente");
      setNewTitle("");
      setNewDescription("");
      setNewPriority("NONE");
      setNewEstimateValue("");
      localStorage.removeItem(`plane_draft_${projectId}`);
      setOpenCreateModal(false);
      loadData();
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al crear el work item");
    } finally {
      setIsSubmitting(false);
    }
  };

  const estimateSystem = project?.estimate_system || "FIBONACCI";

  // Filtered items
  const filteredItems = useMemo(() => {
    return workItems.filter((item) => {
      const matchSearch =
        item.title.toLowerCase().includes(search.toLowerCase()) ||
        item.identifier.toLowerCase().includes(search.toLowerCase());
      const matchPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
      const matchType = typeFilter === "ALL" || String(item.type?.id) === typeFilter;
      return matchSearch && matchPriority && matchType;
    });
  }, [workItems, search, priorityFilter, typeFilter]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-24">
        <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
        <p className="text-sm text-slate-500 font-medium">Cargando proyecto y work items...</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Top Header & Breadcrumbs */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-4">
        <div>
          <div className="flex items-center gap-2 text-xs text-slate-500 mb-1">
            <Link href="/projects" className="hover:text-indigo-600 transition-colors">
              Proyectos
            </Link>
            <ChevronRight className="size-3 text-slate-300" />
            <span className="font-semibold text-slate-800">{project?.name}</span>
          </div>
          <div className="flex items-center gap-3">
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              {project?.name}
            </h1>
            <span className="inline-flex items-center px-2 py-0.5 rounded text-xs font-mono font-bold bg-slate-100 text-slate-700">
              {project?.identifier}
            </span>
          </div>
          {project?.description && (
            <p className="text-sm text-slate-500 mt-1 max-w-2xl">{project.description}</p>
          )}
        </div>

        <div className="flex items-center gap-2">
          <Button
            onClick={() => setOpenCreateModal(true)}
            className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm"
          >
            <Plus className="mr-2 size-4" />
            Crear Work Item
          </Button>
        </div>
      </div>

      {/* Control bar: Search, Filter, Layout Switcher */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
        <div className="flex flex-wrap items-center gap-2 flex-1">
          <div className="relative flex-1 min-w-[200px] max-w-xs">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <Input
              placeholder="Buscar por título o ID..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
            />
          </div>

          <Select value={typeFilter} onValueChange={setTypeFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Tipo" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los tipos</SelectItem>
              {types.map((t) => (
                <SelectItem key={t.id} value={String(t.id)}>
                  {t.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>

          <Select value={priorityFilter} onValueChange={setPriorityFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-slate-50 border-slate-200">
              <Filter className="mr-1.5 size-3.5 text-slate-400" />
              <SelectValue placeholder="Prioridad" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todas las prioridades</SelectItem>
              <SelectItem value="URGENT">Urgente</SelectItem>
              <SelectItem value="HIGH">Alta</SelectItem>
              <SelectItem value="MEDIUM">Media</SelectItem>
              <SelectItem value="LOW">Baja</SelectItem>
              <SelectItem value="NONE">Ninguna</SelectItem>
            </SelectContent>
          </Select>
        </div>

        {/* View Switcher: List vs Kanban */}
        <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
          <button
            type="button"
            onClick={() => setViewMode("kanban")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              viewMode === "kanban"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <Kanban className="size-3.5" />
            <span>Kanban</span>
          </button>
          <button
            type="button"
            onClick={() => setViewMode("list")}
            className={cn(
              "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
              viewMode === "list"
                ? "bg-white text-indigo-600 shadow-xs"
                : "text-slate-600 hover:text-slate-900"
            )}
          >
            <ListIcon className="size-3.5" />
            <span>Lista</span>
          </button>
        </div>
      </div>

      {/* Main Work Items Container */}
      {viewMode === "kanban" ? (
        <DndContext
          sensors={sensors}
          collisionDetection={closestCorners}
          onDragEnd={handleDragEnd}
        >
          <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
            {states.map((state) => {
              const columnItems = filteredItems.filter(
                (item) => String(item.state?.id) === String(state.id)
              );
              return (
                <KanbanColumn
                  key={state.id}
                  state={state}
                  items={columnItems}
                  states={states}
                  onStateChange={handleStateChange}
                  onDelete={handleDeleteItem}
                  onCardClick={handleOpenDetail}
                />
              );
            })}
          </div>
        </DndContext>
      ) : (
        /* List View */
        <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
          <table className="w-full text-left text-sm">
            <thead className="bg-slate-50 border-b border-slate-200 text-xs font-semibold text-slate-500 uppercase">
              <tr>
                <th className="px-4 py-3 w-24">ID</th>
                <th className="px-4 py-3">Título</th>
                <th className="px-4 py-3 w-32">Tipo</th>
                <th className="px-4 py-3 w-36">Estado</th>
                <th className="px-4 py-3 w-28">Prioridad</th>
                <th className="px-4 py-3 w-28">Estimación</th>
                <th className="px-4 py-3 w-32">Fecha</th>
                <th className="px-4 py-3 w-16 text-right">Acciones</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {filteredItems.length === 0 ? (
                <tr>
                  <td colSpan={8} className="px-4 py-12 text-center text-sm text-slate-400">
                    No hay work items que coincidan con los filtros.
                  </td>
                </tr>
              ) : (
                filteredItems.map((item) => {
                  const priority = getPriorityBadge(item.priority);
                  return (
                    <tr
                      key={item.id}
                      onClick={() => handleOpenDetail(item)}
                      className="hover:bg-slate-50/80 transition-colors cursor-pointer"
                    >
                      <td className="px-4 py-3 font-mono font-semibold text-xs text-slate-500">
                        {item.identifier}
                      </td>
                      <td className="px-4 py-3 font-medium text-slate-900">
                        {item.title}
                      </td>
                      <td className="px-4 py-3">
                        {item.type && (
                          <span
                            className="text-[10px] font-semibold px-2 py-0.5 rounded"
                            style={{
                              backgroundColor: `${item.type.color}15`,
                              color: item.type.color,
                            }}
                          >
                            {item.type.name}
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-3" onClick={(e) => e.stopPropagation()}>
                        <Select
                          value={String(item.state?.id || "")}
                          onValueChange={(val) => handleStateChange(item.id, val)}
                        >
                          <SelectTrigger className="h-7 text-xs bg-transparent border-slate-200">
                            <span
                              className="size-2 rounded-full mr-1.5 shrink-0"
                              style={{ backgroundColor: item.state?.color || "#6366f1" }}
                            />
                            <SelectValue placeholder="Estado">
                              {item.state?.name || "Sin estado"}
                            </SelectValue>
                          </SelectTrigger>
                          <SelectContent>
                            {states.map((st) => (
                              <SelectItem key={st.id} value={String(st.id)}>
                                <div className="flex items-center gap-1.5">
                                  <span
                                    className="size-2 rounded-full"
                                    style={{ backgroundColor: st.color || "#6366f1" }}
                                  />
                                  <span>{st.name}</span>
                                </div>
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </td>
                      <td className="px-4 py-3">
                        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", priority.color)}>
                          {priority.label}
                        </span>
                      </td>
                      <td className="px-4 py-3 text-xs font-semibold text-slate-600">
                        {item.estimate_value || (item.estimate_points ? `${item.estimate_points} pts` : "-")}
                      </td>
                      <td className="px-4 py-3 text-xs text-slate-400">
                        {item.created_at ? new Date(item.created_at).toLocaleDateString() : "-"}
                      </td>
                      <td className="px-4 py-3 text-right" onClick={(e) => e.stopPropagation()}>
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() => handleDeleteItem(item.id)}
                          className="size-7 text-slate-400 hover:text-red-600"
                        >
                          <Trash2 className="size-3.5" />
                        </Button>
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      )}

      {/* Modal Crear Work Item */}
      <Dialog open={openCreateModal} onOpenChange={setOpenCreateModal}>
        <DialogContent className="sm:max-w-lg">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2 text-xl font-bold">
              <Plus className="size-5 text-indigo-600" />
              Nuevo Work Item
            </DialogTitle>
            <DialogDescription>
              Crea una tarea, bug, historia o épica para {project?.name}.
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleCreateWorkItem} className="space-y-4 py-2">
            <div className="space-y-2">
              <Label htmlFor="wi-title">Título *</Label>
              <Input
                id="wi-title"
                placeholder="Ej. Implementar autenticación OAuth"
                value={newTitle}
                onChange={(e) => handleTitleChange(e.target.value)}
                required
              />
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-2">
                <Label>Tipo</Label>
                <Select value={newTypeId} onValueChange={setNewTypeId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Tipo" />
                  </SelectTrigger>
                  <SelectContent>
                    {types.map((t) => (
                      <SelectItem key={t.id} value={String(t.id)}>
                        {t.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wi-state">Estado</Label>
                <Select value={newStateId} onValueChange={setNewStateId}>
                  <SelectTrigger id="wi-state">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((st) => (
                      <SelectItem key={st.id} value={String(st.id)}>
                        <div className="flex items-center gap-1.5">
                          <span
                            className="size-2 rounded-full"
                            style={{ backgroundColor: st.color || "#6366f1" }}
                          />
                          <span>{st.name}</span>
                        </div>
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>

              <div className="space-y-2">
                <Label htmlFor="wi-priority">Prioridad</Label>
                <Select value={newPriority} onValueChange={setNewPriority}>
                  <SelectTrigger id="wi-priority">
                    <SelectValue placeholder="Prioridad" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="URGENT">Urgente</SelectItem>
                    <SelectItem value="HIGH">Alta</SelectItem>
                    <SelectItem value="MEDIUM">Media</SelectItem>
                    <SelectItem value="LOW">Baja</SelectItem>
                    <SelectItem value="NONE">Ninguna</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </div>

            {/* Estimate Selector in Creation Modal */}
            {estimateSystem !== "NONE" && (
              <div className="space-y-2">
                <Label className="text-xs font-semibold">
                  Estimación ({estimateSystem === "TSHIRT" ? "Tallas de Camiseta" : "Puntos Fibonacci"})
                </Label>
                {estimateSystem === "FIBONACCI" && (
                  <div className="flex flex-wrap gap-1.5">
                    {FIBONACCI_VALUES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setNewEstimateValue(newEstimateValue === v ? "" : v)}
                        className={cn(
                          "px-2.5 py-1 text-xs font-semibold rounded-md border transition-all cursor-pointer",
                          newEstimateValue === v
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                        )}
                      >
                        {v} pts
                      </button>
                    ))}
                  </div>
                )}
                {estimateSystem === "TSHIRT" && (
                  <div className="flex flex-wrap gap-1.5">
                    {TSHIRT_VALUES.map((v) => (
                      <button
                        key={v}
                        type="button"
                        onClick={() => setNewEstimateValue(newEstimateValue === v ? "" : v)}
                        className={cn(
                          "px-3 py-1 text-xs font-bold rounded-md border transition-all cursor-pointer",
                          newEstimateValue === v
                            ? "bg-indigo-600 text-white border-indigo-600"
                            : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300"
                        )}
                      >
                        {v}
                      </button>
                    ))}
                  </div>
                )}
                {estimateSystem === "NUMERIC" && (
                  <Input
                    type="number"
                    min={0}
                    placeholder="Ej. 5"
                    value={newEstimateValue}
                    onChange={(e) => setNewEstimateValue(e.target.value)}
                  />
                )}
              </div>
            )}

            <div className="space-y-2">
              <Label htmlFor="wi-desc">Descripción (Opcional)</Label>
              <Textarea
                id="wi-desc"
                placeholder="Detalles sobre los requerimientos, criterios de aceptación..."
                value={newDescription}
                onChange={(e) => handleDescChange(e.target.value)}
                rows={3}
              />
            </div>

            <DialogFooter className="pt-2">
              <Button type="button" variant="outline" onClick={() => setOpenCreateModal(false)}>
                Cancelar
              </Button>
              <Button type="submit" className="bg-indigo-600 hover:bg-indigo-500 text-white" disabled={isSubmitting}>
                {isSubmitting ? <Loader2 className="size-4 animate-spin mr-2" /> : null}
                Guardar Work Item
              </Button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Work Item Detail Sheet */}
      <WorkItemDetailSheet
        workItemId={selectedItemId}
        project={project}
        states={states}
        availableItems={workItems}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        onUpdated={loadData}
      />
    </div>
  );
}
