"use client";

import React, { useState } from "react";
import { WorkItem, State, User as UserType } from "@/types/plane-types";
import { cn } from "@/lib/utils";
import {
  ChevronRight,
  GitBranch,
  Calendar,
  Repeat,
  Trash2,
  FolderKanban,
  Check,
  UserPlus,
  AlertOctagon,
  SignalHigh,
  SignalMedium,
  SignalLow,
  CircleSlash,
  ChevronDown,
} from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

export interface ProjectMemberOption {
  id: string | number;
  name: string;
  email?: string;
  avatar?: string;
}

export interface CycleOption {
  id: string | number;
  name: string;
  status?: string;
}

interface WorkItemListRowProps {
  item: WorkItem;
  states: State[];
  members?: ProjectMemberOption[];
  cycles?: CycleOption[];
  onSelect: (item: WorkItem) => void;
  onUpdate: (itemId: string | number, payload: Partial<WorkItem> & Record<string, any>) => Promise<void> | void;
  onDelete?: (itemId: string | number) => void;
  isAdmin?: boolean;
  canModifyState?: boolean;
  showProjectBadge?: boolean;
  isSubtask?: boolean;
}

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgente", icon: AlertOctagon, color: "text-red-600", bg: "bg-red-50 text-red-700 border-red-200" },
  { value: "HIGH", label: "Alta", icon: SignalHigh, color: "text-orange-500", bg: "bg-orange-50 text-orange-700 border-orange-200" },
  { value: "MEDIUM", label: "Media", icon: SignalMedium, color: "text-amber-500", bg: "bg-amber-50 text-amber-700 border-amber-200" },
  { value: "LOW", label: "Baja", icon: SignalLow, color: "text-blue-500", bg: "bg-blue-50 text-blue-700 border-blue-200" },
  { value: "NONE", label: "Ninguna", icon: CircleSlash, color: "text-slate-400", bg: "bg-slate-50 text-slate-600 border-slate-200" },
];

function getPriorityInfo(priority?: string) {
  return PRIORITY_OPTIONS.find((p) => p.value === priority) || PRIORITY_OPTIONS[4];
}

// User Avatar helper with deterministic initials & color
function MemberAvatar({ name, email, size = "sm" }: { name?: string; email?: string; size?: "sm" | "xs" }) {
  const displayName = name || email || "?";
  const initial = displayName.trim().charAt(0).toUpperCase();
  const colors = [
    "bg-indigo-100 text-indigo-700 dark:bg-indigo-950 dark:text-indigo-300",
    "bg-emerald-100 text-emerald-700 dark:bg-emerald-950 dark:text-emerald-300",
    "bg-amber-100 text-amber-700 dark:bg-amber-950 dark:text-amber-300",
    "bg-rose-100 text-rose-700 dark:bg-rose-950 dark:text-rose-300",
    "bg-blue-100 text-blue-700 dark:bg-blue-950 dark:text-blue-300",
    "bg-purple-100 text-purple-700 dark:bg-purple-950 dark:text-purple-300",
  ];
  const charCode = displayName.charCodeAt(0) || 0;
  const colorClass = colors[(charCode + displayName.length) % colors.length];

  return (
    <span
      title={displayName}
      className={cn(
        "rounded-full flex items-center justify-center font-bold ring-2 ring-white dark:ring-slate-900 shrink-0 select-none",
        size === "xs" ? "size-5 text-[9px]" : "size-6 text-[10px]",
        colorClass
      )}
    >
      {initial}
    </span>
  );
}

export function WorkItemListRow({
  item,
  states,
  members = [],
  cycles = [],
  onSelect,
  onUpdate,
  onDelete,
  isAdmin = true,
  canModifyState = true,
  showProjectBadge = false,
  isSubtask = false,
}: WorkItemListRowProps) {
  const [isExpanded, setIsExpanded] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [datePopoverOpen, setDatePopoverOpen] = useState(false);
  const [selectedDate, setSelectedDate] = useState(item.target_date || "");

  const hasSubtasks = Boolean(item.sub_items && item.sub_items.length > 0);
  const priorityInfo = getPriorityInfo(item.priority);
  const PriorityIcon = priorityInfo.icon;

  // Resolve current assignees
  const itemAssignees: { id: string | number; name: string; email?: string }[] =
    item.assignees && item.assignees.length > 0
      ? item.assignees
      : item.lead
      ? [item.lead]
      : [];

  // Toggle member assignment
  const handleToggleAssignee = async (memberId: string | number) => {
    const currentIds = itemAssignees.map((a) => String(a.id));
    const targetIdStr = String(memberId);
    let nextIds: (string | number)[];

    if (currentIds.includes(targetIdStr)) {
      nextIds = currentIds.filter((id) => id !== targetIdStr);
    } else {
      nextIds = [...currentIds, memberId];
    }

    await onUpdate(item.id, {
      assignee_ids: nextIds,
      lead_id: nextIds[0] || null,
    });
  };

  // Handle cycle change
  const handleCycleChange = async (cycleId: string) => {
    const nextCycleId = cycleId === "none" ? null : cycleId;
    await onUpdate(item.id, { cycle_id: nextCycleId });
  };

  // Handle target date change
  const handleDateSave = async (newDate: string) => {
    setSelectedDate(newDate);
    setDatePopoverOpen(false);
    await onUpdate(item.id, { target_date: newDate || null });
  };

  // Active cycle if assigned
  const currentCycle = item.cycles && item.cycles.length > 0 ? item.cycles[0] : null;

  return (
    <div className="w-full">
      {/* Main Row: 2-Column Split */}
      <div
        onClick={() => onSelect(item)}
        className={cn(
          "group flex flex-col md:flex-row md:items-center justify-between gap-3 px-3.5 py-2.5 transition-all cursor-pointer border-b border-slate-100 dark:border-slate-800/80 hover:bg-slate-50/90 dark:hover:bg-slate-800/50 select-none",
          isSubtask ? "bg-slate-50/40 dark:bg-slate-900/30" : "bg-white dark:bg-slate-900"
        )}
      >
        {/* COLUMNA 1: Identificador, Nombre y Jerarquía */}
        <div className="flex items-center gap-2.5 min-w-0 flex-1">
          {/* Subtasks expand/collapse toggle */}
          {hasSubtasks ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              className="size-6 -ml-1 flex items-center justify-center rounded-md hover:bg-slate-200/70 dark:hover:bg-slate-700/60 text-slate-400 hover:text-slate-700 dark:hover:text-slate-200 transition-colors shrink-0 cursor-pointer"
              title={isExpanded ? "Contraer subtareas" : "Expandir subtareas"}
            >
              <ChevronRight
                className={cn(
                  "size-3.5 transition-transform duration-200",
                  isExpanded && "rotate-90 text-indigo-600 dark:text-indigo-400"
                )}
              />
            </button>
          ) : isSubtask ? (
            <div className="size-4 shrink-0 flex items-center justify-center text-slate-300 dark:text-slate-700">
              <span className="w-2.5 h-px bg-slate-300 dark:bg-slate-700" />
            </div>
          ) : (
            <div className="size-6 -ml-1 shrink-0" />
          )}

          {/* Identifier badge */}
          <span className="font-mono text-xs font-semibold text-slate-600 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-2 py-0.5 rounded border border-slate-200/60 dark:border-slate-700/60 shrink-0">
            {item.identifier}
          </span>

          {/* Project badge (if your-work view) */}
          {showProjectBadge && item.project && (
            <span className="text-[11px] text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800/80 px-1.5 py-0.5 rounded inline-flex items-center gap-1 shrink-0 truncate max-w-[140px]">
              <FolderKanban className="size-3 text-slate-400 shrink-0" />
              <span className="truncate">{item.project.name}</span>
            </span>
          )}

          {/* Type tag (optional) */}
          {item.type && (
            <span
              className="text-[10px] font-bold px-1.5 py-0.5 rounded shrink-0 hidden sm:inline-flex"
              style={{
                backgroundColor: `${item.type.color}15`,
                color: item.type.color,
              }}
            >
              {item.type.name}
            </span>
          )}

          {/* Work item title */}
          <span className="text-sm font-medium text-slate-900 dark:text-slate-100 truncate group-hover:text-indigo-600 dark:group-hover:text-indigo-400 transition-colors">
            {item.title}
          </span>

          {/* Subtasks count badge */}
          {hasSubtasks && (
            <span
              onClick={(e) => {
                e.stopPropagation();
                setIsExpanded((prev) => !prev);
              }}
              className="inline-flex items-center gap-1 text-[11px] font-semibold text-slate-500 dark:text-slate-400 bg-slate-100 dark:bg-slate-800 px-1.5 py-0.5 rounded shrink-0 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors"
              title={`${item.sub_items?.length} subtareas`}
            >
              <GitBranch className="size-3 text-slate-400" />
              <span>{item.sub_items?.length}</span>
            </span>
          )}
        </div>

        {/* COLUMNA 2: Pastillas / Pills Interactivas */}
        <div
          onClick={(e) => e.stopPropagation()}
          className="flex items-center gap-2 flex-wrap sm:flex-nowrap shrink-0 self-end md:self-center"
        >
          {/* PILL 1: Estado */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                disabled={!canModifyState}
                className={cn(
                  "h-7 px-2.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer",
                  "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200",
                  !canModifyState && "opacity-75 cursor-not-allowed"
                )}
              >
                <span
                  className="size-2 rounded-full shrink-0"
                  style={{ backgroundColor: item.state?.color || "#6366f1" }}
                />
                <span className="truncate max-w-[110px]">{item.state?.name || "Sin estado"}</span>
                <ChevronDown className="size-3 text-slate-400 shrink-0 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-48 p-1 text-xs">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Cambiar Estado
              </div>
              {states.map((st) => (
                <DropdownMenuItem
                  key={st.id}
                  onClick={() => onUpdate(item.id, { state_id: st.id })}
                  className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer"
                >
                  <div className="flex items-center gap-2">
                    <span className="size-2 rounded-full" style={{ backgroundColor: st.color || "#6366f1" }} />
                    <span>{st.name}</span>
                  </div>
                  {String(item.state?.id) === String(st.id) && (
                    <Check className="size-3.5 text-indigo-600" />
                  )}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* PILL 2: Prioridad */}
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-7 px-2.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer",
                  "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-700 dark:text-slate-200"
                )}
              >
                <PriorityIcon className={cn("size-3.5 shrink-0", priorityInfo.color)} />
                <span className="hidden sm:inline-block">{priorityInfo.label}</span>
                <ChevronDown className="size-3 text-slate-400 shrink-0 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end" className="w-40 p-1 text-xs">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Prioridad
              </div>
              {PRIORITY_OPTIONS.map((opt) => {
                const Icon = opt.icon;
                return (
                  <DropdownMenuItem
                    key={opt.value}
                    onClick={() => onUpdate(item.id, { priority: opt.value as any })}
                    className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer"
                  >
                    <div className="flex items-center gap-2">
                      <Icon className={cn("size-3.5", opt.color)} />
                      <span>{opt.label}</span>
                    </div>
                    {item.priority === opt.value && (
                      <Check className="size-3.5 text-indigo-600" />
                    )}
                  </DropdownMenuItem>
                );
              })}
            </DropdownMenuContent>
          </DropdownMenu>

          {/* PILL 3: Responsables (Assignees / Lead) */}
          <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-7 px-2 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer",
                  itemAssignees.length > 0
                    ? "border-indigo-200 dark:border-indigo-800 bg-indigo-50/50 dark:bg-indigo-950/40 text-indigo-900 dark:text-indigo-200"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                )}
                title={
                  itemAssignees.length > 0
                    ? itemAssignees.map((a) => a.name).join(", ")
                    : "Asignar responsables"
                }
              >
                {itemAssignees.length === 0 ? (
                  <>
                    <UserPlus className="size-3.5 text-slate-400" />
                    <span className="hidden sm:inline text-[11px]">Asignar</span>
                  </>
                ) : (
                  <div className="flex items-center -space-x-1.5 overflow-hidden">
                    {itemAssignees.slice(0, 2).map((a) => (
                      <MemberAvatar key={a.id} name={a.name} email={a.email} size="xs" />
                    ))}
                    {itemAssignees.length > 2 && (
                      <span className="size-5 rounded-full bg-slate-200 dark:bg-slate-700 text-slate-700 dark:text-slate-200 text-[9px] font-bold flex items-center justify-center ring-2 ring-white dark:ring-slate-900">
                        +{itemAssignees.length - 2}
                      </span>
                    )}
                  </div>
                )}
                <ChevronDown className="size-3 text-slate-400 shrink-0 opacity-60 ml-0.5" />
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-1.5 text-xs bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
              <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                Responsables
              </div>
              <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                {members.length === 0 ? (
                  <div className="p-2 text-center text-slate-400 text-xs">
                    No hay miembros disponibles
                  </div>
                ) : (
                  members.map((m) => {
                    const isAssigned = itemAssignees.some((a) => String(a.id) === String(m.id));
                    return (
                      <button
                        key={m.id}
                        type="button"
                        onClick={() => handleToggleAssignee(m.id)}
                        className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                      >
                        <div className="flex items-center gap-2 truncate">
                          <MemberAvatar name={m.name} email={m.email} size="xs" />
                          <span className="truncate">{m.name}</span>
                        </div>
                        {isAssigned && <Check className="size-3.5 text-indigo-600 shrink-0" />}
                      </button>
                    );
                  })
                )}
              </div>
            </PopoverContent>
          </Popover>

          {/* PILL 4: Ciclo (Sprint) - si hay ciclos disponibles en el proyecto */}
          {cycles.length > 0 && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "h-7 px-2.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer",
                    currentCycle
                      ? "border-purple-200 dark:border-purple-800 bg-purple-50/50 dark:bg-purple-950/40 text-purple-900 dark:text-purple-200"
                      : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                  )}
                  title={currentCycle ? `Ciclo: ${currentCycle.name}` : "Asignar a un ciclo"}
                >
                  <Repeat className="size-3 text-purple-600 dark:text-purple-400 shrink-0" />
                  <span className="truncate max-w-[90px] hidden sm:inline-block">
                    {currentCycle ? currentCycle.name : "Sin ciclo"}
                  </span>
                  <ChevronDown className="size-3 text-slate-400 shrink-0 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48 p-1 text-xs">
                <div className="text-[10px] font-bold text-slate-400 px-2 py-1 uppercase tracking-wider">
                  Ciclo de Trabajo
                </div>
                <DropdownMenuItem
                  onClick={() => handleCycleChange("none")}
                  className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer"
                >
                  <span className="text-slate-500">Sin ciclo</span>
                  {!currentCycle && <Check className="size-3.5 text-indigo-600" />}
                </DropdownMenuItem>
                {cycles.map((c) => (
                  <DropdownMenuItem
                    key={c.id}
                    onClick={() => handleCycleChange(String(c.id))}
                    className="flex items-center justify-between text-xs py-1.5 px-2 cursor-pointer"
                  >
                    <span className="truncate">{c.name}</span>
                    {currentCycle && String(currentCycle.id) === String(c.id) && (
                      <Check className="size-3.5 text-indigo-600" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          )}

          {/* PILL 5: Fecha Límite (Target Date) */}
          <Popover open={datePopoverOpen} onOpenChange={setDatePopoverOpen}>
            <PopoverTrigger asChild>
              <button
                type="button"
                className={cn(
                  "h-7 px-2.5 rounded-full border text-xs font-medium flex items-center gap-1.5 transition-all shadow-2xs cursor-pointer",
                  item.target_date
                    ? "border-blue-200 dark:border-blue-800 bg-blue-50/50 dark:bg-blue-950/40 text-blue-900 dark:text-blue-200"
                    : "border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-850 hover:bg-slate-50 dark:hover:bg-slate-800 text-slate-500 dark:text-slate-400"
                )}
                title={item.target_date ? `Fecha límite: ${item.target_date}` : "Fijar fecha límite"}
              >
                <Calendar className="size-3 text-slate-400 shrink-0" />
                <span className="text-[11px] hidden sm:inline-block">
                  {item.target_date || "Fecha"}
                </span>
              </button>
            </PopoverTrigger>
            <PopoverContent align="end" className="w-56 p-3 text-xs bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800 space-y-2">
              <div className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
                Fecha Límite
              </div>
              <input
                type="date"
                value={selectedDate}
                onChange={(e) => setSelectedDate(e.target.value)}
                className="w-full text-xs p-1.5 rounded border border-slate-200 dark:border-slate-700 bg-slate-50 dark:bg-slate-800"
              />
              <div className="flex items-center justify-between pt-1 gap-1">
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleDateSave("")}
                  className="h-7 text-[11px] text-slate-500"
                >
                  Quitar
                </Button>
                <Button
                  size="sm"
                  onClick={() => handleDateSave(selectedDate)}
                  className="h-7 text-[11px] bg-indigo-600 hover:bg-indigo-500 text-white"
                >
                  Guardar
                </Button>
              </div>
            </PopoverContent>
          </Popover>

          {/* Delete action button (if admin) */}
          {isAdmin && onDelete && (
            <Button
              variant="ghost"
              size="icon"
              onClick={() => onDelete(item.id)}
              className="size-7 text-slate-300 hover:text-red-600 opacity-0 group-hover:opacity-100 transition-opacity cursor-pointer shrink-0"
              title="Eliminar tarea"
            >
              <Trash2 className="size-3.5" />
            </Button>
          )}
        </div>
      </div>

      {/* Expanded Subtasks: Nested rows indented with tree connector */}
      {hasSubtasks && isExpanded && (
        <div className="relative pl-6 sm:pl-8 border-l-2 border-slate-200/80 dark:border-slate-800 ml-4 my-0.5 space-y-0.5 animate-in fade-in-50 duration-150">
          {item.sub_items?.map((sub) => {
            // Adapt subtask to WorkItem interface
            const subAsItem: WorkItem = {
              id: sub.id,
              sequence_id: Number(sub.id),
              identifier: sub.identifier,
              title: sub.title,
              priority: (sub.priority as any) || "NONE",
              target_date: sub.target_date || undefined,
              state: sub.state as State,
              state_id: sub.state_id,
              lead: (sub.lead as UserType) || null,
              assignees: (sub.assignees as UserType[]) || [],
              project: item.project,
            };

            return (
              <WorkItemListRow
                key={sub.id}
                item={subAsItem}
                states={states}
                members={members}
                cycles={cycles}
                onSelect={onSelect}
                onUpdate={onUpdate}
                onDelete={onDelete}
                isAdmin={isAdmin}
                canModifyState={canModifyState}
                showProjectBadge={false}
                isSubtask={true}
              />
            );
          })}
        </div>
      )}
    </div>
  );
}
