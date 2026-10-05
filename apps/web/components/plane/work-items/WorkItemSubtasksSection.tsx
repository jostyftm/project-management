"use client";

import React, { useState } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CircleDashed,
  CircleSlash,
  User as UserIcon,
  Calendar,
  Flame,
  AlertCircle,
  Clock,
  ArrowDown,
  Check,
  Plus,
  Loader2,
  Trash2,
  ChevronDown,
  ChevronRight,
  ExternalLink,
} from "lucide-react";
import { Project, State, WorkItem } from "@/types/plane-types";
import { ProjectMemberUser } from "@/services/plane/projectMemberService";
import { workItemService } from "@/services/plane/workItemService";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgente", icon: Flame, color: "text-red-500", bg: "bg-red-50 text-red-700 dark:bg-red-950/40 dark:text-red-300" },
  { value: "HIGH", label: "Alta", icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50 text-orange-700 dark:bg-orange-950/40 dark:text-orange-300" },
  { value: "MEDIUM", label: "Media", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50 text-yellow-700 dark:bg-yellow-950/40 dark:text-yellow-300" },
  { value: "LOW", label: "Baja", icon: ArrowDown, color: "text-blue-500", bg: "bg-blue-50 text-blue-700 dark:bg-blue-950/40 dark:text-blue-300" },
  { value: "NONE", label: "Ninguno", icon: CircleSlash, color: "text-slate-400", bg: "bg-slate-50 text-slate-700 dark:bg-slate-800 dark:text-slate-300" },
];

interface WorkItemSubtasksSectionProps {
  item: WorkItem;
  project: Project | null;
  states: State[];
  members: ProjectMemberUser[];
  isAdmin: boolean;
  currentUser?: any;
  onRefreshParent: () => void;
  onOpenSubItemDetail?: (subItemId: string | number) => void;
}

export function WorkItemSubtasksSection({
  item,
  project,
  states,
  members,
  isAdmin,
  currentUser,
  onRefreshParent,
  onOpenSubItemDetail,
}: WorkItemSubtasksSectionProps) {
  // Collapsible toggle
  const [isExpanded, setIsExpanded] = useState(true);

  // New subtask state
  const [newTitle, setNewTitle] = useState("");
  const [selectedStateId, setSelectedStateId] = useState<string | number>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("NONE");
  const [selectedLeadId, setSelectedLeadId] = useState<string | number>("");
  const [startDate, setStartDate] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [isCreating, setIsCreating] = useState(false);

  // Popover open state for creation row
  const [statePopoverOpen, setStatePopoverOpen] = useState(false);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [startCalPopoverOpen, setStartCalPopoverOpen] = useState(false);
  const [dueCalPopoverOpen, setDueCalPopoverOpen] = useState(false);

  // Resolved active creation values
  const defaultState = states.find((s) => s.is_default) || states[0];
  const activeState = states.find((s) => String(s.id) === String(selectedStateId)) || defaultState;
  const activePriority = PRIORITY_OPTIONS.find((p) => p.value === selectedPriority) || PRIORITY_OPTIONS[4];
  const activeLead = members.find((m) => String(m.id) === String(selectedLeadId));

  // Subtasks completion counts
  const totalCount = item.sub_items?.length || 0;
  const completedCount =
    item.sub_items?.filter((sub) => {
      const group = sub.state?.group?.toUpperCase();
      return group === "COMPLETED";
    }).length || 0;

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !newTitle.trim() || !project || !item) return;

    setIsCreating(true);
    try {
      const stateToUse = selectedStateId || defaultState?.id;
      await workItemService.create(project.id, {
        title: newTitle.trim(),
        parent_id: item.id,
        state_id: stateToUse,
        priority: selectedPriority,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        lead_id: selectedLeadId || undefined,
        assignee_ids: selectedLeadId ? [selectedLeadId] : [],
      });
      toast.success("Subtarea agregada");
      setNewTitle("");
      setSelectedStateId("");
      setSelectedPriority("NONE");
      setSelectedLeadId("");
      setStartDate("");
      setTargetDate("");
      onRefreshParent();
    } catch {
      toast.error("Error al crear subtarea");
    } finally {
      setIsCreating(false);
    }
  };

  return (
    <div className="space-y-2.5 pt-1">
      {/* Collapsible Header with (n/m) Counter & Progress */}
      <div className="flex items-center justify-between py-1">
        <button
          type="button"
          onClick={() => setIsExpanded(!isExpanded)}
          className="flex items-center gap-2 text-xs font-semibold text-slate-700 dark:text-slate-200 uppercase tracking-wider hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors cursor-pointer select-none"
        >
          <div className="p-0.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-400 transition-colors">
            {isExpanded ? <ChevronDown className="size-4" /> : <ChevronRight className="size-4" />}
          </div>
          <span>Subtareas</span>
          <span
            className={cn(
              "text-[11px] font-semibold px-2 py-0.5 rounded-full border normal-case transition-colors",
              totalCount > 0 && completedCount === totalCount
                ? "bg-emerald-50 text-emerald-700 border-emerald-200 dark:bg-emerald-950/40 dark:text-emerald-300 dark:border-emerald-800"
                : "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800 dark:text-slate-400 dark:border-slate-700"
            )}
          >
            {completedCount}/{totalCount}
          </span>
          {totalCount > 0 && (
            <div className="hidden sm:block w-20 h-1.5 bg-slate-100 dark:bg-slate-800 rounded-full overflow-hidden border border-slate-200/60 dark:border-slate-700/60">
              <div
                className={cn(
                  "h-full transition-all duration-300",
                  completedCount === totalCount ? "bg-emerald-500" : "bg-indigo-600"
                )}
                style={{ width: `${Math.round((completedCount / totalCount) * 100)}%` }}
              />
            </div>
          )}
        </button>

        {!isExpanded && isAdmin && (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            onClick={() => setIsExpanded(true)}
            className="h-6 text-[11px] px-2 text-slate-500 hover:text-indigo-600 cursor-pointer"
          >
            <Plus className="size-3 mr-1" /> Añadir
          </Button>
        )}
      </div>

      {/* Expandable Body */}
      {isExpanded && (
        <div className="space-y-3 animate-in fade-in duration-150">
          {/* Creation Row / Box */}
          {isAdmin && (
            <form
              onSubmit={handleCreate}
              className="p-3 bg-slate-50 dark:bg-slate-900/60 rounded-xl border border-slate-200/80 dark:border-slate-800 space-y-2.5 transition-all shadow-xs"
            >
              <div className="flex gap-2 items-center">
                <Input
                  placeholder="Añadir nueva subtarea..."
                  value={newTitle}
                  onChange={(e) => setNewTitle(e.target.value)}
                  className="h-8 text-xs bg-white dark:bg-slate-800"
                />
                <Button
                  type="submit"
                  size="sm"
                  disabled={isCreating || !newTitle.trim()}
                  className="h-8 text-xs shrink-0 cursor-pointer"
                >
                  {isCreating ? <Loader2 className="size-3 animate-spin" /> : <Plus className="size-3 mr-1" />}
                  Añadir
                </Button>
              </div>

              {/* Creation Pills Bar */}
              <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
                {/* 1. Estado Pill */}
                <Popover open={statePopoverOpen} onOpenChange={setStatePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                        activeState && "border-blue-200 bg-blue-50/40 text-blue-900 dark:text-blue-200"
                      )}
                    >
                      <CircleDashed className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{activeState?.name || "Estado"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-52 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Estado</div>
                    <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                      {states.map((s) => {
                        const isSelected = String(s.id) === String(selectedStateId || defaultState?.id);
                        return (
                          <button
                            key={s.id}
                            type="button"
                            onClick={() => {
                              setSelectedStateId(s.id);
                              setStatePopoverOpen(false);
                            }}
                            className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-2 truncate">
                              <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#94a3b8" }} />
                              <span className="truncate">{s.name}</span>
                            </div>
                            {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 2. Prioridad Pill */}
                <Popover open={priorityPopoverOpen} onOpenChange={setPriorityPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                        selectedPriority !== "NONE" && activePriority?.bg
                      )}
                    >
                      {activePriority ? (
                        <activePriority.icon className={cn("size-3.5 shrink-0", activePriority.color)} />
                      ) : (
                        <CircleSlash className="size-3.5 text-slate-400 shrink-0" />
                      )}
                      <span>{activePriority?.label || "Ninguno"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-48 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Prioridad</div>
                    <div className="space-y-0.5 mt-1">
                      {PRIORITY_OPTIONS.map((p) => {
                        const Icon = p.icon;
                        const isSelected = selectedPriority === p.value;
                        return (
                          <button
                            key={p.value}
                            type="button"
                            onClick={() => {
                              setSelectedPriority(p.value);
                              setPriorityPopoverOpen(false);
                            }}
                            className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                          >
                            <div className="flex items-center gap-2">
                              <Icon className={cn("size-3.5", p.color)} />
                              <span>{p.label}</span>
                            </div>
                            {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                          </button>
                        );
                      })}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 3. Asignar Pill */}
                <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                        activeLead && "border-indigo-200 bg-indigo-50/50 text-indigo-900 dark:text-indigo-200"
                      )}
                    >
                      <UserIcon className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{activeLead ? activeLead.name : "Asignar"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Miembros del Proyecto</div>
                    <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                      {members.length === 0 ? (
                        <div className="text-xs text-slate-400 px-2 py-2 text-center">No hay miembros disponibles</div>
                      ) : (
                        members.map((m) => {
                          const isSelected = String(m.id) === String(selectedLeadId);
                          return (
                            <button
                              key={m.id}
                              type="button"
                              onClick={() => {
                                setSelectedLeadId(isSelected ? "" : m.id);
                                setAssigneePopoverOpen(false);
                              }}
                              className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                            >
                              <div className="flex items-center gap-2 truncate">
                                <span className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                                  {m.name.charAt(0).toUpperCase()}
                                </span>
                                <span className="truncate">{m.name}</span>
                              </div>
                              {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                            </button>
                          );
                        })
                      )}
                    </div>
                  </PopoverContent>
                </Popover>

                {/* 4. Fecha de inicio Pill */}
                <Popover open={startCalPopoverOpen} onOpenChange={setStartCalPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                        startDate && "border-blue-200 bg-blue-50/50 text-blue-800 dark:text-blue-300"
                      )}
                    >
                      <Calendar className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{startDate || "Fecha de inicio"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-3 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Fecha de inicio</div>
                    <Input
                      type="date"
                      value={startDate}
                      onChange={(e) => {
                        setStartDate(e.target.value);
                        setStartCalPopoverOpen(false);
                      }}
                      className="h-8 text-xs"
                    />
                    {startDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setStartDate("");
                          setStartCalPopoverOpen(false);
                        }}
                        className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Limpiar fecha
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>

                {/* 5. Fecha de vencimiento Pill */}
                <Popover open={dueCalPopoverOpen} onOpenChange={setDueCalPopoverOpen}>
                  <PopoverTrigger asChild>
                    <button
                      type="button"
                      className={cn(
                        "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2.5 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                        targetDate && "border-amber-200 bg-amber-50/50 text-amber-800 dark:text-amber-300"
                      )}
                    >
                      <Calendar className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                      <span>{targetDate || "Fecha de vencimiento"}</span>
                    </button>
                  </PopoverTrigger>
                  <PopoverContent align="start" className="w-56 p-3 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                    <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Fecha de vencimiento</div>
                    <Input
                      type="date"
                      value={targetDate}
                      onChange={(e) => {
                        setTargetDate(e.target.value);
                        setDueCalPopoverOpen(false);
                      }}
                      className="h-8 text-xs"
                    />
                    {targetDate && (
                      <Button
                        type="button"
                        variant="ghost"
                        size="sm"
                        onClick={() => {
                          setTargetDate("");
                          setDueCalPopoverOpen(false);
                        }}
                        className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700 cursor-pointer"
                      >
                        Limpiar fecha
                      </Button>
                    )}
                  </PopoverContent>
                </Popover>
              </div>
            </form>
          )}

          {/* Existing Subtasks List */}
          <div className="space-y-2 max-h-[380px] overflow-y-auto pr-1">
            {item.sub_items && item.sub_items.length > 0 ? (
              item.sub_items.map((sub) => (
                <SubtaskItemRow
                  key={sub.id}
                  sub={sub}
                  states={states}
                  members={members}
                  isAdmin={isAdmin}
                  currentUser={currentUser}
                  onUpdated={onRefreshParent}
                  onOpenDetail={onOpenSubItemDetail}
                />
              ))
            ) : (
              <p className="text-xs text-slate-400 italic py-4 text-center border border-dashed border-slate-200 dark:border-slate-800 rounded-lg">
                No hay subtareas todavía.
              </p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

interface SubtaskItemRowProps {
  sub: NonNullable<WorkItem["sub_items"]>[number];
  states: State[];
  members: ProjectMemberUser[];
  isAdmin: boolean;
  currentUser?: any;
  onUpdated: () => void;
  onOpenDetail?: (subId: string | number) => void;
}

function SubtaskItemRow({
  sub,
  states,
  members,
  isAdmin,
  currentUser,
  onUpdated,
  onOpenDetail,
}: SubtaskItemRowProps) {
  const [isUpdating, setIsUpdating] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Popovers for this subtask row
  const [stateOpen, setStateOpen] = useState(false);
  const [priorityOpen, setPriorityOpen] = useState(false);
  const [assigneeOpen, setAssigneeOpen] = useState(false);
  const [startCalOpen, setStartCalOpen] = useState(false);
  const [dueCalOpen, setDueCalOpen] = useState(false);

  // Current values
  const currentState = states.find((s) => String(s.id) === String(sub.state?.id || sub.state_id)) || sub.state;
  const currentPriority = PRIORITY_OPTIONS.find((p) => p.value === sub.priority) || PRIORITY_OPTIONS[4];
  const currentLead = members.find((m) => String(m.id) === String(sub.lead_id || sub.lead?.id)) || sub.lead;

  const isSubtaskAssignee = !!currentUser && (
    String(sub.lead_id) === String(currentUser.id) ||
    String(sub.lead?.id) === String(currentUser.id) ||
    sub.assignees?.some((a) => String(a.id) === String(currentUser.id))
  );
  const canChangeState = isAdmin || isSubtaskAssignee;

  const handleUpdateField = async (payload: Record<string, any>) => {
    const isStateOnly = Object.keys(payload).length === 1 && "state_id" in payload;
    if (!isAdmin && (!canChangeState || !isStateOnly)) return;
    setIsUpdating(true);
    try {
      await workItemService.update(sub.id, payload);
      toast.success("Subtarea actualizada");
      onUpdated();
    } catch {
      toast.error("Error al actualizar la subtarea");
    } finally {
      setIsUpdating(false);
    }
  };

  const handleDelete = async (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!isAdmin) return;
    if (!window.confirm("¿Seguro que deseas eliminar esta subtarea?")) return;
    setIsDeleting(true);
    try {
      await workItemService.delete(sub.id);
      toast.success("Subtarea eliminada");
      onUpdated();
    } catch {
      toast.error("Error al eliminar la subtarea");
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div
      className={cn(
        "flex flex-col sm:flex-row sm:items-center justify-between p-2.5 rounded-xl border border-slate-200/70 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors gap-2 text-xs",
        (isUpdating || isDeleting) && "opacity-60 pointer-events-none"
      )}
    >
      {/* Title & Identifier (Clickable to open subtask detail modal) */}
      <div
        className="flex items-center gap-2 min-w-0 pr-2 flex-1 cursor-pointer group"
        onClick={() => onOpenDetail && onOpenDetail(sub.id)}
        title="Abrir detalle de subtarea"
      >
        <span className="font-mono text-slate-400 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 font-semibold shrink-0 text-[11px] px-1.5 py-0.5 rounded bg-slate-100 dark:bg-slate-800 transition-colors">
          {sub.identifier}
        </span>
        <span
          className="font-medium text-slate-700 dark:text-slate-200 group-hover:text-indigo-600 dark:group-hover:text-indigo-400 truncate transition-colors"
          title={sub.title}
        >
          {sub.title}
        </span>
        <ExternalLink className="size-3 text-slate-400 opacity-0 group-hover:opacity-100 transition-opacity shrink-0 ml-0.5" />
      </div>

      {/* Row Pills Bar */}
      <div className="flex flex-wrap items-center gap-1.5 shrink-0">
        {/* 1. Estado Pill */}
        <Popover open={stateOpen} onOpenChange={setStateOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!canChangeState}
              className={cn(
                "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-75 disabled:cursor-not-allowed",
                currentState && "border-blue-200 bg-blue-50/30 text-blue-900 dark:text-blue-200"
              )}
            >
              <CircleDashed className="size-3 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="truncate max-w-[90px]">{currentState?.name || "Estado"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-52 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-[100]">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Estado</div>
            <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
              {states.map((s) => {
                const isSelected = String(s.id) === String(sub.state?.id || sub.state_id);
                return (
                  <button
                    key={s.id}
                    type="button"
                    onClick={() => {
                      setStateOpen(false);
                      handleUpdateField({ state_id: s.id });
                    }}
                    className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2 truncate">
                      <span className="size-2 rounded-full shrink-0" style={{ backgroundColor: s.color || "#94a3b8" }} />
                      <span className="truncate">{s.name}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* 2. Prioridad Pill */}
        <Popover open={priorityOpen} onOpenChange={setPriorityOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!isAdmin}
              className={cn(
                "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                sub.priority && sub.priority !== "NONE" && currentPriority?.bg
              )}
            >
              {currentPriority ? (
                <currentPriority.icon className={cn("size-3 shrink-0", currentPriority.color)} />
              ) : (
                <CircleSlash className="size-3 text-slate-400 shrink-0" />
              )}
              <span>{currentPriority?.label || "Ninguno"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-48 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-[100]">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Prioridad</div>
            <div className="space-y-0.5 mt-1">
              {PRIORITY_OPTIONS.map((p) => {
                const Icon = p.icon;
                const isSelected = sub.priority === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => {
                      setPriorityOpen(false);
                      handleUpdateField({ priority: p.value });
                    }}
                    className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-3.5", p.color)} />
                      <span>{p.label}</span>
                    </div>
                    {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                  </button>
                );
              })}
            </div>
          </PopoverContent>
        </Popover>

        {/* 3. Asignar Pill */}
        <Popover open={assigneeOpen} onOpenChange={setAssigneeOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!isAdmin}
              className={cn(
                "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-75 disabled:cursor-not-allowed",
                currentLead && "border-indigo-200 bg-indigo-50/50 text-indigo-900 dark:text-indigo-200"
              )}
            >
              <UserIcon className="size-3 text-slate-500 dark:text-slate-400 shrink-0" />
              <span className="truncate max-w-[80px]">{currentLead ? currentLead.name : "Asignar"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-[100]">
            <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Miembros del Proyecto</div>
            <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
              {members.length === 0 ? (
                <div className="text-xs text-slate-400 px-2 py-2 text-center">No hay miembros disponibles</div>
              ) : (
                members.map((m) => {
                  const isSelected = String(m.id) === String(sub.lead_id || sub.lead?.id);
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setAssigneeOpen(false);
                        handleUpdateField({
                          lead_id: isSelected ? null : m.id,
                          assignee_ids: isSelected ? [] : [m.id],
                        });
                      }}
                      className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                    >
                      <div className="flex items-center gap-2 truncate">
                        <span className="size-5 rounded-full bg-indigo-100 dark:bg-indigo-950 text-indigo-700 dark:text-indigo-300 flex items-center justify-center font-bold text-[10px] shrink-0">
                          {m.name.charAt(0).toUpperCase()}
                        </span>
                        <span className="truncate">{m.name}</span>
                      </div>
                      {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                    </button>
                  );
                })
              )}
            </div>
          </PopoverContent>
        </Popover>

        {/* 4. Fecha de inicio Pill */}
        <Popover open={startCalOpen} onOpenChange={setStartCalOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!isAdmin}
              className={cn(
                "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-75 disabled:cursor-not-allowed",
                sub.start_date && "border-blue-200 bg-blue-50/50 text-blue-800 dark:text-blue-300"
              )}
            >
              <Calendar className="size-3 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>{sub.start_date || "Inicio"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-[100]">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Fecha de inicio</div>
            <Input
              type="date"
              value={sub.start_date || ""}
              onChange={(e) => {
                setStartCalOpen(false);
                handleUpdateField({ start_date: e.target.value || null });
              }}
              className="h-8 text-xs"
            />
            {sub.start_date && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setStartCalOpen(false);
                  handleUpdateField({ start_date: null });
                }}
                className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700 cursor-pointer"
              >
                Limpiar fecha
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* 5. Fecha de vencimiento Pill */}
        <Popover open={dueCalOpen} onOpenChange={setDueCalOpen}>
          <PopoverTrigger asChild>
            <button
              type="button"
              disabled={!isAdmin}
              className={cn(
                "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-2 py-0.5 text-[11px] font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs disabled:opacity-75 disabled:cursor-not-allowed",
                sub.target_date && "border-amber-200 bg-amber-50/50 text-amber-800 dark:text-amber-300"
              )}
            >
              <Calendar className="size-3 text-slate-500 dark:text-slate-400 shrink-0" />
              <span>{sub.target_date || "Vence"}</span>
            </button>
          </PopoverTrigger>
          <PopoverContent align="end" className="w-56 p-3 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 z-[100]">
            <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">Fecha de vencimiento</div>
            <Input
              type="date"
              value={sub.target_date || ""}
              onChange={(e) => {
                setDueCalOpen(false);
                handleUpdateField({ target_date: e.target.value || null });
              }}
              className="h-8 text-xs"
            />
            {sub.target_date && (
              <Button
                type="button"
                variant="ghost"
                size="sm"
                onClick={() => {
                  setDueCalOpen(false);
                  handleUpdateField({ target_date: null });
                }}
                className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700 cursor-pointer"
              >
                Limpiar fecha
              </Button>
            )}
          </PopoverContent>
        </Popover>

        {/* Optional Delete subtask button */}
        {isAdmin && (
          <button
            type="button"
            onClick={handleDelete}
            title="Eliminar subtarea"
            className="p-1 rounded-full text-slate-400 hover:text-red-600 hover:bg-red-50 dark:hover:bg-red-950/30 transition-colors cursor-pointer ml-1"
          >
            <Trash2 className="size-3.5" />
          </button>
        )}
      </div>
    </div>
  );
}
