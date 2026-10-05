"use client";

import React, { useState, useEffect, useCallback, useMemo } from "react";
import Link from "next/link";
import { useParams, useRouter } from "next/navigation";
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
import { projectService } from "@/services/plane/projectService";
import { workItemService } from "@/services/plane/workItemService";
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import { cycleService } from "@/services/plane/cycleService";
import { projectMemberService } from "@/services/plane/projectMemberService";
import { WorkItemListRow, ProjectMemberOption, CycleOption } from "@/components/plane/work-items/WorkItemListRow";
import { Project, State, WorkItem, WorkItemType, SavedView } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { WorkItemDetailSheet } from "@/components/plane/WorkItemDetailSheet";
import { WorkItemCreateModal } from "@/components/plane/work-items/WorkItemCreateModal";
import { WorkItemCsvImportModal } from "@/components/plane/work-items/WorkItemCsvImportModal";
import { WorkItemViewMode } from "@/components/plane/work-items/WorkItemViewModeSwitcher";
import { CalendarView } from "@/components/plane/views/CalendarView";
import { GanttView } from "@/components/plane/views/GanttView";
import { SavedViewsBar } from "@/components/plane/views/SavedViewsBar";
import {
  Kanban,
  List as ListIcon,
  Calendar as CalendarIcon,
  GanttChart,
  Plus,
  Search,
  Filter,
  Trash2,
  Calendar,
  Layers,
  GitBranch,
  ChevronRight,
  Loader2,
  FileSpreadsheet,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { useAuth } from "@/hooks/use-auth";

const FIBONACCI_VALUES = ["0", "1", "2", "3", "5", "8", "13", "21"];
const TSHIRT_VALUES = ["XS", "S", "M", "L", "XL", "XXL"];

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

// Draggable Work Item Card
function KanbanCard({
  item,
  states,
  onStateChange,
  onDelete,
  onClick,
  isAdmin = true,
  canDrag = true,
  isAssigned = true,
}: {
  item: WorkItem;
  states: State[];
  onStateChange: (itemId: string | number, newStateId: string | number) => void;
  onDelete: (itemId: string | number) => void;
  onClick: (item: WorkItem) => void;
  isAdmin?: boolean;
  canDrag?: boolean;
  isAssigned?: boolean;
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
        className="h-28 rounded-lg border-2 border-dashed border-indigo-400 bg-indigo-50/40 opacity-40 transition-all pointer-events-none"
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
        canDrag ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
        !isAssigned ? "opacity-55 hover:opacity-100 transition-opacity bg-slate-50/40" : "opacity-100"
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
          {isAdmin && (
            <Button
              variant="ghost"
              size="icon"
              onClick={(e) => {
                e.stopPropagation();
                onDelete(item.id);
              }}
              className="size-5 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer"
            >
              <Trash2 className="size-3" />
            </Button>
          )}
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

// Droppable Kanban Column (supports State or Priority grouping)
function KanbanColumn({
  columnId,
  title,
  color,
  items,
  states,
  onStateChange,
  onDelete,
  onCardClick,
  isAdmin = true,
  canModifyItemState,
  isAssignedToMe,
}: {
  columnId: string;
  title: string;
  color: string;
  items: WorkItem[];
  states: State[];
  onStateChange: (itemId: string | number, newStateId: string | number) => void;
  onDelete: (itemId: string | number) => void;
  onCardClick: (item: WorkItem) => void;
  isAdmin?: boolean;
  canModifyItemState?: (item: WorkItem) => boolean;
  isAssignedToMe?: (item: WorkItem) => boolean;
}) {
  const { setNodeRef, isOver } = useDroppable({
    id: columnId,
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
              isAdmin={isAdmin}
              canDrag={canModifyItemState ? canModifyItemState(item) : isAdmin}
              isAssigned={isAssignedToMe ? isAssignedToMe(item) : true}
            />
          ))
        )}
      </div>
    </div>
  );
}

export default function ProjectWorkItemsPage() {
  const params = useParams();
  const router = useRouter();
  const projectId = String(params.projectId);

  const [project, setProject] = useState<Project | null>(null);
  const [states, setStates] = useState<State[]>([]);
  const [types, setTypes] = useState<WorkItemType[]>([]);
  const [workItems, setWorkItems] = useState<WorkItem[]>([]);
  const [members, setMembers] = useState<ProjectMemberOption[]>([]);
  const [cycles, setCycles] = useState<CycleOption[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  // View Layout & Display Options
  const [viewLayout, setViewLayout] = useState<"kanban" | "list" | "calendar" | "gantt">("kanban");
  const [groupBy, setGroupBy] = useState<"state" | "priority">("state");
  const [search, setSearch] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<string>("ALL");
  const [typeFilter, setTypeFilter] = useState<string>("ALL");
  const [stateFilter, setStateFilter] = useState<string>("ALL");

  const { user } = useAuth();
  const isAdmin = project?.current_user_role === "ADMIN";

  const canModifyItemState = useCallback(
    (item: WorkItem) => {
      if (isAdmin) return true;
      if (!user) return false;
      const isLead = String(item.lead_id) === String(user.id);
      const isAssignee = item.assignees?.some((a) => String(a.id) === String(user.id));
      return Boolean(isLead || isAssignee);
    },
    [isAdmin, user]
  );

  const isAssignedToMe = useCallback(
    (item: WorkItem) => {
      if (!user) return false;
      const isLead = String(item.lead_id) === String(user.id);
      const isAssignee = item.assignees?.some((a) => String(a.id) === String(user.id));
      return Boolean(isLead || isAssignee);
    },
    [user]
  );

  // Create Modal & View Mode
  const [openCreateModal, setOpenCreateModal] = useState(false);
  const [importCsvModalOpen, setImportCsvModalOpen] = useState(false);
  const [createViewMode, setCreateViewMode] = useState<WorkItemViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("plane_work_item_create_view_mode") as WorkItemViewMode;
      if (saved === "modal" || saved === "sheet" || saved === "page") return saved;
    }
    return "modal";
  });

  // Active Drag Item for DragOverlay
  const [activeDragItem, setActiveDragItem] = useState<WorkItem | null>(null);

  // Work Item Detail Sheet & View Mode
  const [selectedItemId, setSelectedItemId] = useState<string | number | null>(null);
  const [detailSheetOpen, setDetailSheetOpen] = useState(false);
  const [detailViewMode, setDetailViewMode] = useState<WorkItemViewMode>(() => {
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("plane_work_item_detail_view_mode") as WorkItemViewMode;
      if (saved === "sheet" || saved === "modal" || saved === "page") return saved;
    }
    return "sheet";
  });

  // Check URL parameters for deep-linking
  useEffect(() => {
    if (typeof window !== "undefined") {
      const sp = new URLSearchParams(window.location.search);
      const openItemId = sp.get("openItem");
      const dMode = sp.get("detailMode") as WorkItemViewMode;
      if (openItemId) {
        setSelectedItemId(openItemId);
        if (dMode === "sheet" || dMode === "modal") {
          setDetailViewMode(dMode);
        }
        setDetailSheetOpen(true);
      }
      const openCreate = sp.get("openCreate");
      const cMode = sp.get("createMode") as WorkItemViewMode;
      if (openCreate === "true") {
        if (cMode === "modal" || cMode === "sheet") {
          setCreateViewMode(cMode);
        }
        setOpenCreateModal(true);
      }
    }
  }, []);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  );

  const loadData = useCallback(async (silent = false) => {
    if (!projectId) return;
    if (!silent) setIsLoading(true);
    try {
      const [projData, statesData, itemsData, typesData, membersRes, cyclesData] = await Promise.all([
        projectService.get(projectId),
        projectService.getStates(projectId),
        workItemService.list(projectId),
        workItemTypeService.list(projectId),
        projectMemberService.list(projectId).catch(() => ({ members: [] })),
        cycleService.list(projectId).catch(() => []),
      ]);
      setProject(projData);
      setStates(statesData);
      setWorkItems(itemsData);
      setTypes(typesData);
      setMembers(membersRes?.members || []);
      setCycles(cyclesData || []);
    } catch (err: any) {
      toast.error("Error al cargar la información del proyecto");
    } finally {
      if (!silent) setIsLoading(false);
    }
  }, [projectId]);

  useEffect(() => {
    loadData();
  }, [loadData]);

  const handleStateChange = async (itemId: string | number, nextStateId: string | number) => {
    const targetItem = workItems.find((w) => String(w.id) === String(itemId));
    if (!targetItem || !canModifyItemState(targetItem)) return;

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
      loadData(true);
    }
  };

  const handlePriorityChange = async (itemId: string | number, nextPriority: string) => {
    if (!isAdmin) return;
    setWorkItems((prev) =>
      prev.map((item) => {
        if (String(item.id) === String(itemId)) {
          return { ...item, priority: nextPriority as any };
        }
        return item;
      })
    );

    try {
      await workItemService.update(itemId, { priority: nextPriority as WorkItem["priority"] });
      toast.success(`Prioridad cambiada a "${nextPriority}"`);
    } catch (err: any) {
      toast.error("No se pudo actualizar la prioridad");
      loadData(true);
    }
  };

  const handleDeleteItem = async (itemId: string | number) => {
    if (!isAdmin) return;
    try {
      await workItemService.delete(itemId);
      setWorkItems((prev) => prev.filter((i) => String(i.id) !== String(itemId)));
      toast.success("Work item eliminado");
    } catch (err: any) {
      toast.error("Error al eliminar el work item");
    }
  };

  const handleQuickUpdate = async (
    itemId: string | number,
    payload: Partial<WorkItem> & Record<string, any>
  ) => {
    // Optimistic UI update
    setWorkItems((prev) =>
      prev.map((item) => {
        if (String(item.id) === String(itemId)) {
          const updated = { ...item, ...payload };
          if (payload.state_id) {
            updated.state = states.find((s) => String(s.id) === String(payload.state_id)) || item.state;
          }
          if (payload.cycle_id !== undefined) {
            if (payload.cycle_id) {
              const c = cycles.find((cy) => String(cy.id) === String(payload.cycle_id));
              updated.cycles = c ? [{ id: c.id, name: c.name, status: c.status || "" }] : item.cycles;
            } else {
              updated.cycles = [];
            }
          }
          if (payload.assignee_ids) {
            updated.assignees = members.filter((m) =>
              payload.assignee_ids.map(String).includes(String(m.id))
            ) as any;
          }
          return updated;
        }

        if (item.sub_items && item.sub_items.length > 0) {
          const hasSub = item.sub_items.some((s) => String(s.id) === String(itemId));
          if (hasSub) {
            return {
              ...item,
              sub_items: item.sub_items.map((sub) => {
                if (String(sub.id) === String(itemId)) {
                  const updatedSub = { ...sub, ...payload };
                  if (payload.state_id) {
                    const st = states.find((s) => String(s.id) === String(payload.state_id));
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
    } catch (err: any) {
      toast.error(err?.response?.data?.message || "Error al actualizar la tarea");
      loadData(true);
    }
  };

  const handleDragStart = (event: DragStartEvent) => {
    const item = workItems.find((w) => String(w.id) === String(event.active.id));
    setActiveDragItem(item || null);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragItem(null);
    const { active, over } = event;
    if (!over) return;

    const itemId = String(active.id);
    const targetColumnId = String(over.id);

    const currentItem = workItems.find((w) => String(w.id) === itemId);
    if (!currentItem) return;

    if (groupBy === "state") {
      if (!canModifyItemState(currentItem)) return;
      if (String(currentItem.state?.id) === targetColumnId) return;
      handleStateChange(itemId, targetColumnId);
    } else {
      if (!isAdmin) return;
      if (currentItem.priority === targetColumnId) return;
      handlePriorityChange(itemId, targetColumnId);
    }
  };

  const handleDragCancel = () => {
    setActiveDragItem(null);
  };

  const handleOpenDetail = (item: WorkItem) => {
    let preferredMode: WorkItemViewMode = "sheet";
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("plane_work_item_detail_view_mode") as WorkItemViewMode;
      if (saved === "sheet" || saved === "modal" || saved === "page") {
        preferredMode = saved;
      }
    }

    if (preferredMode === "page" && project) {
      router.push(`/projects/${project.id}/work-items/${item.id}`);
      return;
    }

    setDetailViewMode(preferredMode);
    setSelectedItemId(item.id);
    setDetailSheetOpen(true);
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
      setSearch(view.filters.search || "");
    }
  };

  const handleResetView = () => {
    setViewLayout("kanban");
    setGroupBy("state");
    setPriorityFilter("ALL");
    setTypeFilter("ALL");
    setStateFilter("ALL");
    setSearch("");
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
      const matchState = stateFilter === "ALL" || String(item.state?.id) === stateFilter;
      return matchSearch && matchPriority && matchType && matchState;
    });
  }, [workItems, search, priorityFilter, typeFilter, stateFilter]);

  const listDisplayItems = useMemo(() => {
    if (search.trim()) return filteredItems;
    const roots = filteredItems.filter((i) => !i.parent?.data?.id && !(i as any).parent_id);
    return roots.length > 0 ? roots : filteredItems;
  }, [filteredItems, search]);

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
            <Link href={`/projects/${project?.id}`} className="hover:text-indigo-600 transition-colors">
              {project?.name}
            </Link>
            <ChevronRight className="size-3 text-slate-300" />
            <span className="font-semibold text-slate-800">Work Items</span>
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
          {/* Saved Views Bar */}
          <SavedViewsBar
            projectId={projectId}
            currentLayout={viewLayout}
            currentGroupBy={groupBy}
            currentPriority={priorityFilter}
            currentType={typeFilter}
            currentState={stateFilter}
            currentSearch={search}
            onApplyView={handleApplyView}
            onResetView={handleResetView}
          />

          {isAdmin && (
            <>
              <Button
                variant="outline"
                size="sm"
                onClick={() => setImportCsvModalOpen(true)}
                className="border-slate-200 text-slate-700 hover:bg-slate-50 shadow-2xs gap-1.5 text-xs h-9 cursor-pointer"
              >
                <FileSpreadsheet className="size-3.5 text-emerald-600" />
                Importar CSV
              </Button>

              <Button
                onClick={() => {
                  let preferredMode: WorkItemViewMode = "modal";
                  if (typeof window !== "undefined") {
                    const saved = localStorage.getItem("plane_work_item_create_view_mode") as WorkItemViewMode;
                    if (saved === "modal" || saved === "sheet" || saved === "page") {
                      preferredMode = saved;
                    }
                  }
                  if (preferredMode === "page" && project) {
                    router.push(`/projects/${project.id}/work-items/new`);
                    return;
                  }
                  setCreateViewMode(preferredMode);
                  setOpenCreateModal(true);
                }}
                className="bg-indigo-600 hover:bg-indigo-500 text-white shadow-sm cursor-pointer"
              >
                <Plus className="mr-2 size-4" />
                Crear Work Item
              </Button>
            </>
          )}
        </div>
      </div>

      {/* Control bar: Search, Filter, Display Options & Layout Switcher */}
      <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-3 bg-white p-3 rounded-xl border border-slate-200 shadow-xs">
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

          <Select value={stateFilter} onValueChange={setStateFilter}>
            <SelectTrigger className="w-[130px] h-9 text-xs bg-slate-50 border-slate-200">
              <SelectValue placeholder="Estado" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="ALL">Todos los estados</SelectItem>
              {states.map((s) => (
                <SelectItem key={s.id} value={String(s.id)}>
                  <div className="flex items-center gap-1.5">
                    <span
                      className="size-2 rounded-full"
                      style={{ backgroundColor: s.color || "#6366f1" }}
                    />
                    <span>{s.name}</span>
                  </div>
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

          {/* Group By Selector (Visible in Kanban & List) */}
          {(viewLayout === "kanban" || viewLayout === "list") && (
            <div className="flex items-center gap-1.5 ml-2 border-l border-slate-200 pl-3">
              <span className="text-xs text-slate-400 font-medium">Agrupar:</span>
              <Select value={groupBy} onValueChange={(val) => setGroupBy(val as "state" | "priority")}>
                <SelectTrigger className="w-[115px] h-9 text-xs bg-slate-50 border-slate-200 font-medium">
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

      {/* Main Work Items Container: Render according to viewLayout */}
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
              ? states.map((state) => {
                  const columnItems = filteredItems.filter(
                    (item) => String(item.state?.id) === String(state.id)
                  );
                  return (
                    <KanbanColumn
                      key={state.id}
                      columnId={String(state.id)}
                      title={state.name}
                      color={state.color}
                      items={columnItems}
                      states={states}
                      onStateChange={handleStateChange}
                      onDelete={handleDeleteItem}
                      onCardClick={handleOpenDetail}
                      isAdmin={isAdmin}
                      canModifyItemState={canModifyItemState}
                      isAssignedToMe={isAssignedToMe}
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
                      states={states}
                      onStateChange={handleStateChange}
                      onDelete={handleDeleteItem}
                      onCardClick={handleOpenDetail}
                      isAdmin={isAdmin}
                      canModifyItemState={canModifyItemState}
                      isAssignedToMe={isAssignedToMe}
                    />
                  );
                })}
          </div>
          <DragOverlay dropAnimation={null}>
            {activeDragItem ? <KanbanCardPreview item={activeDragItem} /> : null}
          </DragOverlay>
        </DndContext>
      )}

      {viewLayout === "list" && (
        /* Modern Two-Column List View with Expandable Subtasks and Interactive Pills */
        <div className="bg-white dark:bg-slate-900 rounded-xl border border-slate-200 dark:border-slate-800 shadow-xs overflow-hidden">
          {listDisplayItems.length === 0 ? (
            <div className="p-12 text-center text-sm text-slate-400">
              No hay work items que coincidan con los filtros.
            </div>
          ) : (
            <div className="divide-y divide-slate-100 dark:divide-slate-800/80">
              {listDisplayItems.map((item) => (
                <WorkItemListRow
                  key={item.id}
                  item={item}
                  states={states}
                  members={members}
                  cycles={cycles}
                  onSelect={handleOpenDetail}
                  onUpdate={handleQuickUpdate}
                  onDelete={handleDeleteItem}
                  isAdmin={isAdmin}
                  canModifyState={canModifyItemState(item)}
                  showProjectBadge={false}
                />
              ))}
            </div>
          )}
        </div>
      )}

      {viewLayout === "calendar" && (
        <CalendarView items={filteredItems} onCardClick={handleOpenDetail} />
      )}

      {viewLayout === "gantt" && (
        <GanttView items={filteredItems} onCardClick={handleOpenDetail} />
      )}

      {/* Modal Crear Work Item */}
      <WorkItemCreateModal
        open={openCreateModal}
        onOpenChange={setOpenCreateModal}
        project={project}
        states={states}
        types={types}
        availableItems={workItems}
        viewMode={createViewMode}
        onViewModeChange={setCreateViewMode}
        onCreated={(created) => {
          setWorkItems((prev) => [created, ...prev]);
          loadData(true);
        }}
      />

      {/* Modal Importar CSV */}
      <WorkItemCsvImportModal
        projectId={projectId}
        open={importCsvModalOpen}
        onOpenChange={setImportCsvModalOpen}
        onImportSuccess={() => loadData(true)}
      />

      {/* Work Item Detail Sheet / Modal */}
      <WorkItemDetailSheet
        workItemId={selectedItemId}
        project={project}
        states={states}
        availableItems={workItems}
        open={detailSheetOpen}
        onOpenChange={setDetailSheetOpen}
        viewMode={detailViewMode}
        onViewModeChange={setDetailViewMode}
        onUpdated={(updatedItem?: WorkItem) => {
          if (updatedItem) {
            setWorkItems((prev) =>
              prev.map((item) => (String(item.id) === String(updatedItem.id) ? updatedItem : item))
            );
          }
          loadData(true);
        }}
      />
    </div>
  );
}
