"use client";

import React, { useEffect, useState, useMemo, useCallback } from "react";
import Link from "next/link";
import {
  DndContext,
  useDraggable,
  useDroppable,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
  PointerSensor,
  useSensor,
  useSensors,
  closestCorners,
} from "@dnd-kit/core";
import { yourWorkService, YourWorkTab } from "@/services/plane/yourWorkService";
import { workItemService } from "@/services/plane/workItemService";
import { projectService } from "@/services/plane/projectService";
import { projectMemberService } from "@/services/plane/projectMemberService";
import { cycleService } from "@/services/plane/cycleService";
import { WorkItemListRow, ProjectMemberOption, CycleOption } from "@/components/plane/work-items/WorkItemListRow";
import { WorkItem, State, WorkItemType, SavedView } from "@/types/plane-types";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkItemDetailSheet } from "@/components/plane/WorkItemDetailSheet";
import { CalendarView } from "@/components/plane/views/CalendarView";
import { GanttView } from "@/components/plane/views/GanttView";
import { SavedViewsBar } from "@/components/plane/views/SavedViewsBar";
import {
  UserCheck,
  FileEdit,
  FileQuestion,
  Search,
  Calendar as CalendarIcon,
  Inbox,
  FolderKanban,
  Maximize2,
  GitBranch,
  Kanban,
  List as ListIcon,
  GanttChart,
  Filter,
  Layers,
  Loader2,
  Clock,
} from "lucide-react";
import { useWorkspaceStore } from "@/hooks/use-workspace-store";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

// Priority helpers
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

const PRIORITY_GROUPS = [
  { id: "URGENT", name: "Urgente", color: "#ef4444" },
  { id: "HIGH", name: "Alta", color: "#f97316" },
  { id: "MEDIUM", name: "Media", color: "#f59e0b" },
  { id: "LOW", name: "Baja", color: "#3b82f6" },
  { id: "NONE", name: "Ninguna", color: "#94a3b8" },
];

const STATE_GROUPS = [
  { id: "BACKLOG", name: "Backlog", color: "#94a3b8" },
  { id: "UNSTARTED", name: "Por Hacer", color: "#60a5fa" },
  { id: "STARTED", name: "En Progreso", color: "#f59e0b" },
  { id: "COMPLETED", name: "Completado", color: "#10b981" },
  { id: "CANCELLED", name: "Cancelado", color: "#ef4444" },
];

// Draggable Kanban Card for Tu Trabajo
function KanbanCard({
  item,
  onClick,
  canDrag = true,
}: {
  item: WorkItem;
  onClick: (item: WorkItem) => void;
  canDrag?: boolean;
}) {
  const { attributes, listeners, setNodeRef, isDragging } = useDraggable({
    id: String(item.id),
    data: { item },
    disabled: !canDrag,
  });

  const priorityInfo = getPriorityBadge(item.priority);

  if (isDragging) {
    return (
      <div
        ref={setNodeRef}
        className="h-32 rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50/40 opacity-40 transition-all pointer-events-none"
      />
    );
  }

  return (
    <div
      ref={setNodeRef}
      {...(canDrag ? listeners : {})}
      {...(canDrag ? attributes : {})}
      onClick={() => onClick(item)}
      className={cn(
        "group relative bg-white border border-slate-200 rounded-lg p-3.5 shadow-xs hover:border-indigo-300 hover:shadow-sm transition-all select-none",
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer"
      )}
    >
      <div className="flex items-center justify-between gap-2 mb-2">
        <div className="flex items-center gap-1.5 flex-wrap">
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
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border shrink-0", priorityInfo.color)}>
          {priorityInfo.label}
        </span>
      </div>

      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-2">
        {item.title}
      </h4>

      {/* Project badge */}
      {item.project && (
        <div className="mb-2.5">
          <span className="text-[11px] text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded inline-flex items-center gap-1 max-w-full truncate">
            <FolderKanban className="size-3 text-slate-400 shrink-0" />
            <span className="truncate">{item.project.name}</span>
          </span>
        </div>
      )}

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

        {item.target_date ? (
          <span className="text-[11px] text-slate-500 flex items-center gap-1">
            <CalendarIcon className="size-3 text-slate-400" />
            {item.target_date}
          </span>
        ) : item.created_at ? (
          <span className="text-[11px] text-slate-400">
            {new Date(item.created_at).toLocaleDateString()}
          </span>
        ) : null}
      </div>
    </div>
  );
}

// Kanban Card Preview for DragOverlay
function KanbanCardPreview({ item }: { item: WorkItem }) {
  const priorityInfo = getPriorityBadge(item.priority);

  return (
    <div className="w-[280px] bg-white border-2 border-indigo-500 rounded-lg p-3.5 shadow-2xl rotate-1 scale-105 pointer-events-none cursor-grabbing z-[9999]">
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
        <span className={cn("text-[11px] font-medium px-2 py-0.5 rounded-full border", priorityInfo.color)}>
          {priorityInfo.label}
        </span>
      </div>

      <h4 className="text-sm font-medium text-slate-900 line-clamp-2 mb-2">
        {item.title}
      </h4>

      {item.project && (
        <div className="mb-2">
          <span className="text-[11px] text-slate-600 font-medium bg-slate-100 px-2 py-0.5 rounded inline-flex items-center gap-1">
            <FolderKanban className="size-3 text-slate-400" />
            {item.project.name}
          </span>
        </div>
      )}
    </div>
  );
}

// Droppable Kanban Column
function KanbanColumn({
  columnId,
  title,
  color,
  items,
  onCardClick,
  canDrag = true,
}: {
  columnId: string;
  title: string;
  color: string;
  items: WorkItem[];
  onCardClick: (item: WorkItem) => void;
  canDrag?: boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
  });

  return (
    <div
      ref={setNodeRef}
      className={cn(
        "flex flex-col min-w-[280px] max-w-[320px] w-full bg-slate-100/70 border border-slate-200/80 rounded-xl p-3 min-h-[400px] max-h-[calc(100vh-16rem)] transition-colors",
        isOver && "bg-indigo-50/60 border-indigo-300 ring-2 ring-indigo-200"
      )}
    >
      <div className="flex items-center justify-between mb-3 px-1">
        <div className="flex items-center gap-2">
          <span
            className="size-2.5 rounded-full"
            style={{ backgroundColor: color || "#6366f1" }}
          />
          <h3 className="font-semibold text-sm text-slate-800">{title}</h3>
        </div>
        <span className="text-xs font-semibold bg-white border border-slate-200 text-slate-600 px-2 py-0.5 rounded-full shadow-xs">
          {items.length}
        </span>
      </div>

      <div className="flex-1 overflow-y-auto space-y-2.5 pr-0.5">
        {items.length === 0 ? (
          <div className="flex items-center justify-center p-8 border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
            Sin items
          </div>
        ) : (
          items.map((item) => (
            <KanbanCard
              key={item.id}
              item={item}
              onClick={onCardClick}
              canDrag={canDrag}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function YourWorkPage() {
  const { currentWorkspace } = useWorkspaceStore();
  const [activeTab, setActiveTab] = useState<YourWorkTab>("assigned");
  const [items, setItems] = useState<WorkItem[]>([]);
  const [loading, setLoading] = useState<boolean>(true);

  // View Layout & Filters
  const [viewLayout, setViewLayout] = useState<"kanban" | "list" | "calendar" | "gantt">("kanban");
  const [groupBy, setGroupBy] = useState<"state" | "priority">("state");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");

  // Drag & Drop
  const [activeDragItem, setActiveDragItem] = useState<WorkItem | null>(null);

  // Work Item Detail Sheet integration
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);

  // Cache for project states, members and cycles to enable inline updates in list view
  const [projectStatesMap, setProjectStatesMap] = useState<Record<string, State[]>>({});
  const [projectMembersMap, setProjectMembersMap] = useState<Record<string, ProjectMemberOption[]>>({});
  const [projectCyclesMap, setProjectCyclesMap] = useState<Record<string, CycleOption[]>>({});

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const fetchItems = useCallback(async (tab: YourWorkTab) => {
    try {
      setLoading(true);
      const data = await yourWorkService.list(tab);
      setItems(data);

      // Pre-fetch states, members and cycles for distinct projects in data
      const projectIds = Array.from(new Set(data.map((i) => i.project?.id).filter(Boolean)));
      for (const pId of projectIds) {
        const idStr = String(pId);
        if (!projectStatesMap[idStr]) {
          projectService.getStates(pId!).then((states) => {
            setProjectStatesMap((prev) => ({ ...prev, [idStr]: states }));
          }).catch(() => { });
        }
        if (!projectMembersMap[idStr]) {
          projectMemberService.list(pId!).then((res) => {
            setProjectMembersMap((prev) => ({ ...prev, [idStr]: res.members || [] }));
          }).catch(() => { });
        }
        if (!projectCyclesMap[idStr]) {
          cycleService.list(pId!).then((cycles) => {
            setProjectCyclesMap((prev) => ({ ...prev, [idStr]: cycles || [] }));
          }).catch(() => { });
        }
      }
    } catch (err) {
      console.error("Error fetching your work:", err);
      setItems([]);
    } finally {
      setLoading(false);
    }
  }, [projectStatesMap, projectMembersMap, projectCyclesMap]);

  useEffect(() => {
    if (currentWorkspace) {
      fetchItems(activeTab);
    }
  }, [currentWorkspace, activeTab]);

  // Distinct types across items for filter
  const distinctTypes = useMemo(() => {
    const map = new Map<string, WorkItemType>();
    items.forEach((item) => {
      if (item.type && !map.has(String(item.type.id))) {
        map.set(String(item.type.id), item.type);
      }
    });
    return Array.from(map.values());
  }, [items]);

  // Distinct states across items for filter
  const distinctStates = useMemo(() => {
    const map = new Map<string, { id: string; name: string; color: string }>();
    items.forEach((item) => {
      if (item.state && !map.has(String(item.state.id))) {
        map.set(String(item.state.id), {
          id: String(item.state.id),
          name: item.state.name,
          color: item.state.color,
        });
      }
    });
    return Array.from(map.values());
  }, [items]);

  // Filtered items based on all filters
  const filteredItems = useMemo(() => {
    return items.filter((item) => {
      const q = searchQuery.toLowerCase().trim();
      const matchSearch =
        !q ||
        item.title.toLowerCase().includes(q) ||
        item.identifier.toLowerCase().includes(q) ||
        (item.project?.name && item.project.name.toLowerCase().includes(q));

      const matchPriority = priorityFilter === "ALL" || item.priority === priorityFilter;
      const matchType = typeFilter === "ALL" || String(item.type?.id) === typeFilter;
      const matchState =
        stateFilter === "ALL" ||
        String(item.state?.id) === stateFilter ||
        item.state?.group === stateFilter;

      return matchSearch && matchPriority && matchType && matchState;
    });
  }, [items, searchQuery, priorityFilter, typeFilter, stateFilter]);

  const listDisplayItems = useMemo(() => {
    if (searchQuery.trim()) return filteredItems;
    const roots = filteredItems.filter((i) => !i.parent?.data?.id && !(i as any).parent_id);
    return roots.length > 0 ? roots : filteredItems;
  }, [filteredItems, searchQuery]);

  const handleStateChange = async (item: WorkItem, newStateId: string) => {
    const pId = item.project?.id ? String(item.project.id) : "";
    const pStates = projectStatesMap[pId] || [];
    const targetState = pStates.find((s) => String(s.id) === String(newStateId));

    // Optimistic update
    setItems((prev) =>
      prev.map((i) =>
        String(i.id) === String(item.id)
          ? { ...i, state: targetState || i.state }
          : i
      )
    );

    try {
      await workItemService.update(item.id, { state_id: newStateId });
      toast.success(`Estado actualizado a "${targetState?.name || 'Nuevo estado'}"`);
    } catch {
      toast.error("Error al actualizar el estado");
      fetchItems(activeTab);
    }
  };

  const handlePriorityChange = async (item: WorkItem, newPriority: string) => {
    setItems((prev) =>
      prev.map((i) =>
        String(i.id) === String(item.id)
          ? { ...i, priority: newPriority as any }
          : i
      )
    );

    try {
      await workItemService.update(item.id, { priority: newPriority as WorkItem["priority"] });
      const pBadge = getPriorityBadge(newPriority);
      toast.success(`Prioridad cambiada a "${pBadge.label}"`);
    } catch {
      toast.error("Error al actualizar la prioridad");
      fetchItems(activeTab);
    }
  };

  const handleQuickUpdate = async (
    itemId: string | number,
    payload: Partial<WorkItem> & Record<string, any>
  ) => {
    // Optimistic UI update
    setItems((prev) =>
      prev.map((item) => {
        if (String(item.id) === String(itemId)) {
          const pId = item.project?.id ? String(item.project.id) : "";
          const pStates = projectStatesMap[pId] || [];
          const pMembers = projectMembersMap[pId] || [];
          const pCycles = projectCyclesMap[pId] || [];

          const updated = { ...item, ...payload };
          if (payload.state_id) {
            updated.state = pStates.find((s) => String(s.id) === String(payload.state_id)) || item.state;
          }
          if (payload.cycle_id !== undefined) {
            if (payload.cycle_id) {
              const c = pCycles.find((cy) => String(cy.id) === String(payload.cycle_id));
              updated.cycles = c ? [{ id: c.id, name: c.name, status: c.status || "" }] : item.cycles;
            } else {
              updated.cycles = [];
            }
          }
          if (payload.assignee_ids) {
            updated.assignees = pMembers.filter((m) =>
              payload.assignee_ids.map(String).includes(String(m.id))
            ) as any;
          }
          return updated;
        }

        if (item.sub_items && item.sub_items.length > 0) {
          const hasSub = item.sub_items.some((s) => String(s.id) === String(itemId));
          if (hasSub) {
            const pId = item.project?.id ? String(item.project.id) : "";
            const pStates = projectStatesMap[pId] || [];
            return {
              ...item,
              sub_items: item.sub_items.map((sub) => {
                if (String(sub.id) === String(itemId)) {
                  const updatedSub = { ...sub, ...payload };
                  if (payload.state_id) {
                    const st = pStates.find((s) => String(s.id) === String(payload.state_id));
                    if (st) updatedSub.state = { id: st.id, name: st.name, color: st.color, group: st.group };
                  }
                  return updatedSub;
                }
                return sub;
              }),
            };
          }
        }

        return item;
      })
    );

    try {
      await workItemService.update(itemId, payload);
      toast.success("Tarea actualizada");
    } catch {
      toast.error("Error al actualizar la tarea");
      fetchItems(activeTab);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = items.find((w) => String(w.id) === String(event.active.id));
    setActiveDragItem(item || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const itemId = String(active.id);
    const targetColumnId = String(over.id);

    const currentItem = items.find((w) => String(w.id) === itemId);
    if (!currentItem) return;

    if (groupBy === "state") {
      const pId = currentItem.project?.id ? String(currentItem.project.id) : "";
      const pStates = projectStatesMap[pId] || [];
      const targetState = pStates.find(
        (s) => s.group === targetColumnId || String(s.id) === targetColumnId
      );
      if (targetState) {
        if (String(currentItem.state?.id) === String(targetState.id)) return;
        handleStateChange(currentItem, String(targetState.id));
      } else {
        toast.info("No se encontró un estado correspondiente para esta acción en el proyecto.");
      }
    } else {
      if (currentItem.priority === targetColumnId) return;
      handlePriorityChange(currentItem, targetColumnId);
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  // Saved Views Application & Reset
  const handleApplyView = (view: SavedView) => {
    if (view.display_filters?.layout) {
      setViewLayout(view.display_filters.layout);
    }
    if (view.display_filters?.group_by) {
      setGroupBy(view.display_filters.group_by);
    }
    if (view.filters?.priority !== undefined) {
      setPriorityFilter(view.filters.priority || "ALL");
    }
    if (view.filters?.type_id !== undefined) {
      setTypeFilter(view.filters.type_id || "ALL");
    }
    if (view.filters?.state_id !== undefined) {
      setStateFilter(view.filters.state_id || "ALL");
    }
    if (view.filters?.search !== undefined) {
      setSearchQuery(view.filters.search || "");
    }
  };

  const handleResetView = () => {
    setViewLayout("kanban");
    setGroupBy("state");
    setPriorityFilter("ALL");
    setTypeFilter("ALL");
    setStateFilter("ALL");
    setSearchQuery("");
  };

  return (
    <div className="flex-1 space-y-6 w-full pb-10">
      {/* Page Header */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4 border-b border-slate-200 pb-5">
        <div>
          <div className="flex items-center gap-2">
            <UserCheck className="size-6 text-indigo-600" />
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">Tu trabajo</h1>
          </div>
          <p className="text-sm text-slate-500 mt-1">
            Centro de control personal: tareas asignadas, creadas y borradores pendientes en todo el workspace.
          </p>
        </div>

        {/* Saved Views Bar at Workspace/YourWork level */}
        <div className="flex items-center gap-2">
          <SavedViewsBar
            currentLayout={viewLayout}
            currentGroupBy={groupBy}
            currentPriority={priorityFilter}
            currentType={typeFilter}
            currentState={stateFilter}
            currentSearch={searchQuery}
            onApplyView={handleApplyView}
            onResetView={handleResetView}
          />
        </div>
      </div>

      {/* Tabs */}
      <Tabs
        value={activeTab}
        onValueChange={(val) => setActiveTab(val as YourWorkTab)}
        className="w-full space-y-4"
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-3">
          <TabsList className="bg-slate-100 p-1 border border-slate-200 rounded-lg">
            <TabsTrigger value="assigned" className="flex items-center gap-2 text-xs font-semibold px-4 py-2 cursor-pointer">
              <UserCheck className="size-4" />
              <span>Asignadas a mí</span>
            </TabsTrigger>
            <TabsTrigger value="created" className="flex items-center gap-2 text-xs font-semibold px-4 py-2 cursor-pointer">
              <FileEdit className="size-4" />
              <span>Creadas por mí</span>
            </TabsTrigger>
            <TabsTrigger value="drafts" className="flex items-center gap-2 text-xs font-semibold px-4 py-2 cursor-pointer">
              <FileQuestion className="size-4" />
              <span>Borradores</span>
            </TabsTrigger>
          </TabsList>

          {/* 4 Layouts Switcher: Kanban, Lista, Calendario, Gantt */}
          <div className="flex items-center rounded-lg border border-slate-200 bg-slate-100 p-0.5">
            <button
              type="button"
              onClick={() => setViewLayout("kanban")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                viewLayout === "kanban"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <Kanban className="size-3.5" />
              <span>Kanban</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("list")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                viewLayout === "list"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <ListIcon className="size-3.5" />
              <span>Lista</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("calendar")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                viewLayout === "calendar"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <CalendarIcon className="size-3.5" />
              <span>Calendario</span>
            </button>
            <button
              type="button"
              onClick={() => setViewLayout("gantt")}
              className={cn(
                "flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold transition-all cursor-pointer",
                viewLayout === "gantt"
                  ? "bg-white text-indigo-600 shadow-xs"
                  : "text-slate-600 hover:text-slate-900"
              )}
            >
              <GanttChart className="size-3.5" />
              <span>Gantt</span>
            </button>
          </div>
        </div>

        {/* Filter bar: Search, Type, State, Priority & Group By */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
          <div className="flex flex-wrap items-center gap-2 flex-1">
            <div className="relative flex-1 min-w-[200px] max-w-xs">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
              <Input
                placeholder="Buscar por título o ID..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="pl-9 h-9 text-sm bg-slate-50 border-slate-200"
              />
            </div>

            {/* Type Filter */}
            <Select value={typeFilter} onValueChange={setTypeFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Tipo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los tipos</SelectItem>
                {distinctTypes.map((t) => (
                  <SelectItem key={t.id} value={String(t.id)}>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: t.color || "#6366f1" }} />
                      <span>{t.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* State Filter */}
            <Select value={stateFilter} onValueChange={setStateFilter}>
              <SelectTrigger className="w-[130px] h-9 text-xs bg-slate-50 border-slate-200">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="ALL">Todos los estados</SelectItem>
                {distinctStates.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: s.color || "#6366f1" }} />
                      <span>{s.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>

            {/* Priority Filter */}
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

            {/* Group By Selector (Visible in Kanban & List) */}
            {(viewLayout === "kanban" || viewLayout === "list") && (
              <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
                <span className="text-xs text-slate-400 font-medium">Agrupar:</span>
                <Select value={groupBy} onValueChange={(val) => setGroupBy(val as "state" | "priority")}>
                  <SelectTrigger className="w-[125px] h-9 text-xs bg-slate-50 border-slate-200 font-medium">
                    <Layers className="size-3 mr-1 text-slate-400" />
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="state">Por Estado</SelectItem>
                    <SelectItem value="priority">Por Prioridad</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            )}
          </div>
        </div>

        <TabsContent value={activeTab} className="mt-2">
          {loading ? (
            <div className="flex flex-col items-center justify-center p-20 text-slate-400 space-y-2">
              <Loader2 className="animate-spin size-8 text-indigo-600" />
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
                  ? "No tienes historias de usuario asignadas que coincidan con los filtros."
                  : activeTab === "created"
                    ? "Aún no has creado historias de usuario que coincidan con los filtros."
                    : "No tienes ningún borrador guardado en este momento."}
              </p>
            </div>
          ) : (
            <>
              {/* Kanban Layout */}
              {viewLayout === "kanban" && (
                <DndContext
                  sensors={sensors}
                  collisionDetection={closestCorners}
                  onDragStart={handleDragStart}
                  onDragEnd={handleDragEnd}
                  onDragCancel={handleDragCancel}
                >
                  <div className="flex gap-4 overflow-x-auto pb-6 pt-1">
                    {groupBy === "state"
                      ? STATE_GROUPS.map((group) => {
                        const columnItems = filteredItems.filter((item) => {
                          if (item.state?.group) {
                            return item.state.group.toUpperCase() === group.id;
                          }
                          if (group.id === "UNSTARTED") return true;
                          return false;
                        });
                        return (
                          <KanbanColumn
                            key={group.id}
                            columnId={group.id}
                            title={group.name}
                            color={group.color}
                            items={columnItems}
                            onCardClick={(item) => setSelectedItemId(item.id)}
                            canDrag={true}
                          />
                        );
                      })
                      : PRIORITY_GROUPS.map((group) => {
                        const columnItems = filteredItems.filter(
                          (item) => item.priority === group.id
                        );
                        return (
                          <KanbanColumn
                            key={group.id}
                            columnId={group.id}
                            title={group.name}
                            color={group.color}
                            items={columnItems}
                            onCardClick={(item) => setSelectedItemId(item.id)}
                            canDrag={true}
                          />
                        );
                      })}
                  </div>
                  <DragOverlay dropAnimation={null}>
                    {activeDragItem ? <KanbanCardPreview item={activeDragItem} /> : null}
                  </DragOverlay>
                </DndContext>
              )}

              {/* List Layout */}
              {viewLayout === "list" && (
                <div className="bg-white rounded-xl border border-slate-200 shadow-xs overflow-hidden">
                  {listDisplayItems.length === 0 ? (
                    <div className="p-12 text-center text-sm text-slate-400">
                      No hay tareas que coincidan con los filtros aplicados.
                    </div>
                  ) : (
                    <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
                      {listDisplayItems.map((item) => {
                        const pId = item.project?.id ? String(item.project.id) : "";
                        const availableStates = projectStatesMap[pId] || (item.state ? [item.state] : []);
                        const availableMembers = projectMembersMap[pId] || [];
                        const availableCycles = projectCyclesMap[pId] || [];

                        return (
                          <WorkItemListRow
                            key={item.id}
                            item={item}
                            states={availableStates}
                            members={availableMembers}
                            cycles={availableCycles}
                            onSelect={(selected) => setSelectedItemId(selected.id)}
                            onUpdate={handleQuickUpdate}
                            isAdmin={true}
                            canModifyState={true}
                            showProjectBadge={true}
                          />
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              {/* Calendar Layout */}
              {viewLayout === "calendar" && (
                <CalendarView
                  items={filteredItems}
                  onCardClick={(item) => setSelectedItemId(item.id)}
                />
              )}

              {/* Gantt Layout */}
              {viewLayout === "gantt" && (
                <GanttView
                  items={filteredItems}
                  onCardClick={(item) => setSelectedItemId(item.id)}
                />
              )}
            </>
          )}
        </TabsContent>
      </Tabs>

      {/* Work Item Detail Sheet opened directly from Tu Trabajo */}
      {selectedItemId && (() => {
        const selectedItem = items.find((i) => String(i.id) === String(selectedItemId));
        const projectStates = selectedItem?.project?.id
          ? (projectStatesMap[String(selectedItem.project.id)] || [])
          : [];
        return (
          <WorkItemDetailSheet
            workItemId={selectedItemId}
            project={selectedItem?.project as any}
            states={projectStates}
            open={Boolean(selectedItemId)}
            onOpenChange={(isOpen) => {
              if (!isOpen) setSelectedItemId(null);
            }}
            onUpdated={() => {
              fetchItems(activeTab);
            }}
          />
        );
      })()}
    </div>
  );
}
