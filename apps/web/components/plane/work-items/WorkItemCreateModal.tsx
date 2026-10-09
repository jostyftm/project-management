"use client";

import React, { useState, useEffect, useMemo, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  Sheet,
  SheetContent,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Switch } from "@/components/ui/switch";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import {
  CircleDashed,
  CircleSlash,
  User,
  Tag,
  Calendar,
  RefreshCw,
  LayoutGrid,
  Triangle,
  GitBranch,
  Boxes,
  ChevronDown,
  Check,
  X,
  Loader2,
  Flame,
  AlertCircle,
  Clock,
  ArrowDown,
  CheckCircle2,
} from "lucide-react";
import {
  Project,
  State,
  WorkItem,
  WorkItemType,
  Cycle,
  Module,
  Label as ProjectLabel,
} from "@/types/plane-types";
import { workItemService } from "@/services/plane/workItemService";
import { projectService } from "@/services/plane/projectService";
import { cycleService } from "@/services/plane/cycleService";
import { moduleService } from "@/services/plane/moduleService";
import { projectMemberService, ProjectMemberUser } from "@/services/plane/projectMemberService";
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import {
  WorkItemViewModeSwitcher,
  WorkItemViewMode,
} from "@/components/plane/work-items/WorkItemViewModeSwitcher";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { extractPlainText } from "@/lib/rich-text-utils";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FIBONACCI_VALUES = ["0", "1", "2", "3", "5", "8", "13", "21"];
const TSHIRT_VALUES = ["XS", "S", "M", "L", "XL", "XXL"];

const PRIORITY_OPTIONS = [
  { value: "URGENT", label: "Urgente", icon: Flame, color: "text-red-500", bg: "bg-red-50 text-red-700" },
  { value: "HIGH", label: "Alta", icon: AlertCircle, color: "text-orange-500", bg: "bg-orange-50 text-orange-700" },
  { value: "MEDIUM", label: "Media", icon: Clock, color: "text-yellow-500", bg: "bg-yellow-50 text-yellow-700" },
  { value: "LOW", label: "Baja", icon: ArrowDown, color: "text-blue-500", bg: "bg-blue-50 text-blue-700" },
  { value: "NONE", label: "Ninguno", icon: CircleSlash, color: "text-slate-400", bg: "bg-slate-50 text-slate-700" },
];

interface WorkItemCreateModalProps {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  project: Project | null;
  projects?: Project[];
  states?: State[];
  types?: WorkItemType[];
  availableItems?: WorkItem[];
  onCreated?: (item: WorkItem) => void;
  onSelectProject?: (projectId: string | number) => void;
  viewMode?: WorkItemViewMode;
  onViewModeChange?: (mode: WorkItemViewMode) => void;
}

export function WorkItemCreateModal({
  open = true,
  onOpenChange,
  project,
  projects = [],
  states: initialStates = [],
  types: initialTypes = [],
  availableItems: initialAvailableItems = [],
  onCreated,
  onSelectProject,
  viewMode: propViewMode,
  onViewModeChange,
}: WorkItemCreateModalProps) {
  const router = useRouter();

  // View Mode preference (default to prop, or localStorage, or 'modal')
  const [internalMode, setInternalMode] = useState<WorkItemViewMode>(() => {
    if (propViewMode) return propViewMode;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("plane_work_item_create_view_mode") as WorkItemViewMode;
      if (saved === "modal" || saved === "sheet" || saved === "page") return saved;
    }
    return "modal";
  });

  const activeMode = propViewMode || internalMode;

  const handleModeSwitch = (newMode: WorkItemViewMode) => {
    setInternalMode(newMode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("plane_work_item_create_view_mode", newMode);
      } catch {}
    }
    if (onViewModeChange) {
      onViewModeChange(newMode);
    }
    if (newMode === "page" && currentProject) {
      if (onOpenChange) onOpenChange(false);
      router.push(`/projects/${currentProject.id}/work-items/new`);
    } else if (activeMode === "page" && (newMode === "modal" || newMode === "sheet") && currentProject) {
      router.push(`/projects/${currentProject.id}?openCreate=true&createMode=${newMode}`);
    }
  };

  // Active Project Context
  const [currentProject, setCurrentProject] = useState<Project | null>(project);
  const [projectList, setProjectList] = useState<Project[]>(projects);

  // Form Fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [createMore, setCreateMore] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Property Selections
  const [selectedTypeId, setSelectedTypeId] = useState<string | number>("");
  const [selectedStateId, setSelectedStateId] = useState<string | number>("");
  const [selectedPriority, setSelectedPriority] = useState<string>("NONE");
  const [selectedLeadId, setSelectedLeadId] = useState<string | number>("");
  const [selectedAssigneeIds, setSelectedAssigneeIds] = useState<(string | number)[]>([]);
  const [selectedLabelIds, setSelectedLabelIds] = useState<(string | number)[]>([]);
  const [startDate, setStartDate] = useState<string>("");
  const [targetDate, setTargetDate] = useState<string>("");
  const [selectedCycleId, setSelectedCycleId] = useState<string | number>("");
  const [selectedModuleId, setSelectedModuleId] = useState<string | number>("");
  const [estimateValue, setEstimateValue] = useState<string>("");
  const [selectedParentId, setSelectedParentId] = useState<string | number>("");

  // Context-specific project data
  const [states, setStates] = useState<State[]>(initialStates);
  const [types, setTypes] = useState<WorkItemType[]>(initialTypes);
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [labels, setLabels] = useState<ProjectLabel[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [availableItems, setAvailableItems] = useState<WorkItem[]>(initialAvailableItems);

  // Popover state controllers
  const [statePopoverOpen, setStatePopoverOpen] = useState(false);
  const [priorityPopoverOpen, setPriorityPopoverOpen] = useState(false);
  const [assigneePopoverOpen, setAssigneePopoverOpen] = useState(false);
  const [labelPopoverOpen, setLabelPopoverOpen] = useState(false);
  const [startCalPopoverOpen, setStartCalPopoverOpen] = useState(false);
  const [dueCalPopoverOpen, setDueCalPopoverOpen] = useState(false);
  const [cyclePopoverOpen, setCyclePopoverOpen] = useState(false);
  const [modulePopoverOpen, setModulePopoverOpen] = useState(false);
  const [estimatePopoverOpen, setEstimatePopoverOpen] = useState(false);
  const [parentPopoverOpen, setParentPopoverOpen] = useState(false);

  // Search filter for parent work item selector
  const [parentSearch, setParentSearch] = useState("");

  const titleInputRef = useRef<HTMLInputElement>(null);

  // Sync current project prop
  useEffect(() => {
    if (project) {
      setCurrentProject(project);
    }
  }, [project]);

  // Load project list if not provided
  useEffect(() => {
    if (open && projectList.length === 0) {
      projectService.list().then((list) => {
        setProjectList(list);
      }).catch(() => {});
    }
  }, [open, projectList.length]);

  // Load contextual entities when active project changes or modal opens
  useEffect(() => {
    if (!open || !currentProject?.id) return;

    const projectId = currentProject.id;

    // Load states if empty
    projectService.getStates(projectId).then(setStates).catch(() => {});
    // Load types
    workItemTypeService.list(projectId).then(setTypes).catch(() => {});
    // Load members
    projectMemberService.list(projectId).then((res) => {
      setMembers(res.members || []);
    }).catch(() => {});
    // Load labels
    projectService.getLabels(projectId).then(setLabels).catch(() => {});
    // Load cycles
    cycleService.list(projectId).then(setCycles).catch(() => {});
    // Load modules
    moduleService.list(projectId).then(setModules).catch(() => {});
    // Load existing items for parent selection
    workItemService.list(projectId).then(setAvailableItems).catch(() => {});
  }, [open, currentProject?.id]);

  // Set defaults when states or types load
  useEffect(() => {
    if (states.length > 0 && !selectedStateId) {
      const defaultState = states.find((s) => s.is_default) || states[0];
      setSelectedStateId(defaultState.id);
    }
  }, [states, selectedStateId]);

  useEffect(() => {
    if (types.length > 0 && !selectedTypeId) {
      const defaultType = types.find((t) => t.is_default) || types[0];
      setSelectedTypeId(defaultType.id);
    }
  }, [types, selectedTypeId]);

  // Auto-focus title input on open
  useEffect(() => {
    if (open) {
      setTimeout(() => {
        titleInputRef.current?.focus();
      }, 100);
    }
  }, [open]);

  // Helper to reset form state
  const resetForm = () => {
    setTitle("");
    setDescription("");
    setSelectedPriority("NONE");
    setSelectedLeadId("");
    setSelectedAssigneeIds([]);
    setSelectedLabelIds([]);
    setStartDate("");
    setTargetDate("");
    setSelectedCycleId("");
    setSelectedModuleId("");
    setEstimateValue("");
    setSelectedParentId("");

    if (states.length > 0) {
      const defaultState = states.find((s) => s.is_default) || states[0];
      setSelectedStateId(defaultState.id);
    }
    if (types.length > 0) {
      const defaultType = types.find((t) => t.is_default) || types[0];
      setSelectedTypeId(defaultType.id);
    }
    setTimeout(() => {
      titleInputRef.current?.focus();
    }, 50);
  };

  const handleDiscard = () => {
    resetForm();
    if (onOpenChange) onOpenChange(false);
    if (activeMode === "page" && currentProject) {
      router.push(`/projects/${currentProject.id}`);
    }
  };

  const handleSwitchProject = (targetProject: Project) => {
    setCurrentProject(targetProject);
    setSelectedStateId("");
    setSelectedTypeId("");
    setSelectedCycleId("");
    setSelectedModuleId("");
    setSelectedAssigneeIds([]);
    setSelectedLabelIds([]);
    setSelectedParentId("");
    if (onSelectProject) {
      onSelectProject(targetProject.id);
    }
  };

  const handleSave = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!title.trim() || !currentProject?.id) {
      toast.error("Por favor ingresa un título para el elemento de trabajo");
      return;
    }

    setIsSubmitting(true);
    try {
      const trimmedDesc = description.trim();
      const isEmptyDesc =
        !trimmedDesc ||
        trimmedDesc === "<p><br></p>" ||
        trimmedDesc === "<br>";

      const descriptionJson = !isEmptyDesc
        ? {
            html: description,
            text: extractPlainText(description),
          }
        : null;

      const payload: any = {
        title: title.trim(),
        description_json: descriptionJson,
        priority: selectedPriority,
        state_id: selectedStateId || undefined,
        type_id: selectedTypeId || undefined,
        parent_id: selectedParentId || undefined,
        cycle_id: selectedCycleId || undefined,
        module_id: selectedModuleId || undefined,
        start_date: startDate || undefined,
        target_date: targetDate || undefined,
        assignee_ids: selectedAssigneeIds.length > 0 ? selectedAssigneeIds : (selectedLeadId ? [selectedLeadId] : []),
        label_ids: selectedLabelIds,
      };

      if (estimateValue) {
        if (currentProject.estimate_system === "NUMERIC") {
          payload.estimate_points = Number(estimateValue);
        } else {
          payload.estimate_value = estimateValue;
        }
      }

      const created = await workItemService.create(currentProject.id, payload);
      toast.success("Elemento de trabajo creado exitosamente");

      if (onCreated) {
        onCreated(created);
      }

      if (createMore) {
        resetForm();
      } else {
        resetForm();
        if (onOpenChange) onOpenChange(false);
        if (activeMode === "page" && currentProject) {
          router.push(`/projects/${currentProject.id}`);
        }
      }
    } catch (err: any) {
      toast.error(err?.message || "Error al crear el elemento de trabajo");
    } finally {
      setIsSubmitting(false);
    }
  };

  // Resolved dynamic labels for pills
  const activeState = useMemo(() => states.find((s) => String(s.id) === String(selectedStateId)), [states, selectedStateId]);
  const activeType = useMemo(() => types.find((t) => String(t.id) === String(selectedTypeId)), [types, selectedTypeId]);
  const activePriority = useMemo(() => PRIORITY_OPTIONS.find((p) => p.value === selectedPriority), [selectedPriority]);
  const activeLead = useMemo(() => members.find((m) => String(m.id) === String(selectedLeadId)), [members, selectedLeadId]);
  const activeCycle = useMemo(() => cycles.find((c) => String(c.id) === String(selectedCycleId)), [cycles, selectedCycleId]);
  const activeModule = useMemo(() => modules.find((m) => String(m.id) === String(selectedModuleId)), [modules, selectedModuleId]);
  const activeParent = useMemo(() => availableItems.find((i) => String(i.id) === String(selectedParentId)), [availableItems, selectedParentId]);

  const filteredParentItems = useMemo(() => {
    if (!parentSearch.trim()) return availableItems.slice(0, 15);
    const q = parentSearch.toLowerCase();
    return availableItems.filter((item) =>
      item.title.toLowerCase().includes(q) ||
      (item.identifier && item.identifier.toLowerCase().includes(q))
    ).slice(0, 15);
  }, [availableItems, parentSearch]);

  const estimateSystem = currentProject?.estimate_system || "FIBONACCI";

  const formContent = (
    <div className="space-y-4">
      {/* Header Title & View Mode Switcher */}
      <div className="flex items-center justify-between gap-2 pb-1">
        <h2 className="text-xl sm:text-2xl font-semibold tracking-tight text-slate-900 dark:text-slate-100">
          Crear nuevo elemento de trabajo
        </h2>
        <WorkItemViewModeSwitcher
          currentMode={activeMode}
          onChangeMode={handleModeSwitch}
        />
      </div>

      {/* Breadcrumbs Row with interactive project and type switchers */}
      <div className="flex flex-wrap items-center gap-1.5 pt-1 text-sm text-slate-600 dark:text-slate-400">
            {/* Project Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <span className="font-semibold">{currentProject?.name || "Seleccionar Proyecto"}</span>
                  <ChevronDown className="size-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-56 p-1 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800">
                <DropdownMenuLabel className="text-xs text-slate-400 px-2 py-1.5">Proyectos</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {projectList.map((p) => (
                  <DropdownMenuItem
                    key={p.id}
                    onClick={() => handleSwitchProject(p)}
                    className="flex items-center justify-between text-xs px-2 py-1.5 cursor-pointer rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <span className="truncate">{p.name}</span>
                    {String(p.id) === String(currentProject?.id) && (
                      <Check className="size-3.5 text-blue-600 ml-2 shrink-0" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <span className="text-muted-foreground font-semibold px-0.5">&gt;</span>

            {/* Work Item Type Switcher */}
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-md text-xs font-medium text-slate-700 dark:text-slate-200 bg-slate-100 dark:bg-slate-800 hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer"
                >
                  <Boxes className="size-3.5 text-blue-500 shrink-0" />
                  <span className="font-medium">{activeType?.name || "Task"}</span>
                  <ChevronDown className="size-3 text-slate-400" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="start" className="w-48 p-1 bg-white dark:bg-slate-900 shadow-lg border border-slate-200 dark:border-slate-800">
                <DropdownMenuLabel className="text-xs text-slate-400 px-2 py-1.5">Tipo de Elemento</DropdownMenuLabel>
                <DropdownMenuSeparator />
                {types.map((t) => (
                  <DropdownMenuItem
                    key={t.id}
                    onClick={() => setSelectedTypeId(t.id)}
                    className="flex items-center justify-between text-xs px-2 py-1.5 cursor-pointer rounded hover:bg-slate-100 dark:hover:bg-slate-800"
                  >
                    <div className="flex items-center gap-2">
                      <Boxes className="size-3 text-blue-500" />
                      <span>{t.name}</span>
                    </div>
                    {String(t.id) === String(selectedTypeId) && (
                      <Check className="size-3.5 text-blue-600 ml-2" />
                    )}
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>
          </div>

        {/* Form Body */}
        <form onSubmit={handleSave} className="space-y-4 pt-2">
          {/* Borderless Large Title Input */}
          <div>
            <input
              ref={titleInputRef}
              type="text"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="Título"
              className="w-full text-xl font-medium placeholder:text-slate-400 bg-transparent border-0 border-b border-slate-200 dark:border-slate-800 focus:outline-none focus:border-blue-600 pb-2 transition-colors"
            />
          </div>

          {/* Description Editor with Rich Text Support */}
          <div className="space-y-1">
            <RichTextEditor
              value={description}
              onChange={setDescription}
              placeholder="Escribe los requerimientos, contexto o detalles de la tarea..."
              minHeight="140px"
              maxHeight="240px"
              className="border-slate-200 dark:border-slate-800"
            />
          </div>

          {/* Action Bar: 10 Pill Buttons with Popovers */}
          <div className="flex flex-wrap items-center gap-2 pt-3 border-t border-slate-100 dark:border-slate-800">
            {/* 1. CircleDashed + Backlog (Estado) */}
            <Popover open={statePopoverOpen} onOpenChange={setStatePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                    activeState && "border-blue-200 bg-blue-50/40 text-blue-900 dark:text-blue-200"
                  )}
                >
                  <CircleDashed className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>{activeState?.name || "Backlog"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-52 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Estado</div>
                <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  {states.map((s) => (
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
                        <span className="size-2 rounded-full" style={{ backgroundColor: s.color || "#94a3b8" }} />
                        <span className="truncate">{s.name}</span>
                      </div>
                      {String(s.id) === String(selectedStateId) && <Check className="size-3.5 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* 2. CircleSlash + Ninguno (Prioridad) */}
            <Popover open={priorityPopoverOpen} onOpenChange={setPriorityPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
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
                        {selectedPriority === p.value && <Check className="size-3.5 text-blue-600 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              </PopoverContent>
            </Popover>

            {/* 3. User + Asignados (Personas involucradas) */}
            <Popover open={assigneePopoverOpen} onOpenChange={setAssigneePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                    (selectedLeadId || selectedAssigneeIds.length > 0) && "border-indigo-200 bg-indigo-50/50 text-indigo-900 dark:text-indigo-200"
                  )}
                >
                  <User className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>
                    {activeLead
                      ? activeLead.name
                      : selectedAssigneeIds.length > 0
                      ? `${selectedAssigneeIds.length} asignados`
                      : "Asignados"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Miembros del Proyecto</div>
                <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  {members.length === 0 ? (
                    <div className="text-xs text-slate-400 px-2 py-2 text-center">No hay miembros disponibles</div>
                  ) : (
                    members.map((m) => {
                      const isSelected = String(m.id) === String(selectedLeadId) || selectedAssigneeIds.map(String).includes(String(m.id));
                      return (
                        <button
                          key={m.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedLeadId("");
                              setSelectedAssigneeIds((prev) => prev.filter((id) => String(id) !== String(m.id)));
                            } else {
                              setSelectedLeadId(m.id);
                              setSelectedAssigneeIds([m.id]);
                            }
                            setAssigneePopoverOpen(false);
                          }}
                          className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="size-5 rounded-full bg-indigo-100 text-indigo-700 flex items-center justify-center font-bold text-[10px] shrink-0">
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

            {/* 4. Tag + Etiquetas */}
            <Popover open={labelPopoverOpen} onOpenChange={setLabelPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                    selectedLabelIds.length > 0 && "border-amber-200 bg-amber-50/50 text-amber-900 dark:text-amber-200"
                  )}
                >
                  <Tag className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>
                    {selectedLabelIds.length > 0
                      ? `${selectedLabelIds.length} etiquetas`
                      : "Etiquetas"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Etiquetas</div>
                <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  {labels.length === 0 ? (
                    <div className="text-xs text-slate-400 px-2 py-2 text-center">No hay etiquetas</div>
                  ) : (
                    labels.map((l) => {
                      const isSelected = selectedLabelIds.map(String).includes(String(l.id));
                      return (
                        <button
                          key={l.id}
                          type="button"
                          onClick={() => {
                            if (isSelected) {
                              setSelectedLabelIds((prev) => prev.filter((id) => String(id) !== String(l.id)));
                            } else {
                              setSelectedLabelIds((prev) => [...prev, l.id]);
                            }
                          }}
                          className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                        >
                          <div className="flex items-center gap-2 truncate">
                            <span className="size-2.5 rounded-full" style={{ backgroundColor: l.color || "#6366f1" }} />
                            <span className="truncate">{l.name}</span>
                          </div>
                          {isSelected && <Check className="size-3.5 text-blue-600 shrink-0" />}
                        </button>
                      );
                    })
                  )}
                </div>
              </PopoverContent>
            </Popover>

            {/* 5. Calendar + Fecha de inicio */}
            <Popover open={startCalPopoverOpen} onOpenChange={setStartCalPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
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
                    className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700"
                  >
                    Limpiar fecha
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* 6. Calendar + Fecha de vencimiento */}
            <Popover open={dueCalPopoverOpen} onOpenChange={setDueCalPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                    targetDate && "border-blue-200 bg-blue-50/50 text-blue-800 dark:text-blue-300"
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
                    className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700"
                  >
                    Limpiar fecha
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* 7. RefreshCw + Ciclo */}
            <Popover open={cyclePopoverOpen} onOpenChange={setCyclePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                    activeCycle && "border-emerald-200 bg-emerald-50/50 text-emerald-900 dark:text-emerald-200"
                  )}
                >
                  <RefreshCw className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>{activeCycle?.name || "Ciclo"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Ciclos del Proyecto</div>
                <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedCycleId("");
                      setCyclePopoverOpen(false);
                    }}
                    className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left text-slate-500"
                  >
                    <span>Sin ciclo</span>
                    {!selectedCycleId && <Check className="size-3.5 text-blue-600 shrink-0" />}
                  </button>
                  {cycles.map((c) => (
                    <button
                      key={c.id}
                      type="button"
                      onClick={() => {
                        setSelectedCycleId(c.id);
                        setCyclePopoverOpen(false);
                      }}
                      className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                    >
                      <span className="truncate">{c.name}</span>
                      {String(c.id) === String(selectedCycleId) && <Check className="size-3.5 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* 8. LayoutGrid + Módulos */}
            <Popover open={modulePopoverOpen} onOpenChange={setModulePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                    activeModule && "border-purple-200 bg-purple-50/50 text-purple-900 dark:text-purple-200"
                  )}
                >
                  <LayoutGrid className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>{activeModule?.name || "Módulos"}</span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-1.5 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 px-2 py-1 uppercase tracking-wider">Módulos del Proyecto</div>
                <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedModuleId("");
                      setModulePopoverOpen(false);
                    }}
                    className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left text-slate-500"
                  >
                    <span>Sin módulo</span>
                    {!selectedModuleId && <Check className="size-3.5 text-blue-600 shrink-0" />}
                  </button>
                  {modules.map((m) => (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setSelectedModuleId(m.id);
                        setModulePopoverOpen(false);
                      }}
                      className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                    >
                      <span className="truncate">{m.name}</span>
                      {String(m.id) === String(selectedModuleId) && <Check className="size-3.5 text-blue-600 shrink-0" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>

            {/* 9. Triangle + Estimación */}
            <Popover open={estimatePopoverOpen} onOpenChange={setEstimatePopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                    estimateValue && "border-amber-200 bg-amber-50/50 text-amber-900 dark:text-amber-200"
                  )}
                >
                  <Triangle className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>
                    {estimateValue
                      ? `${estimateValue} ${estimateSystem === "FIBONACCI" ? "pts" : ""}`
                      : "Estimación"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-56 p-3 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="text-xs font-semibold text-slate-700 dark:text-slate-200 mb-2">
                  Estimación ({estimateSystem === "TSHIRT" ? "Tallas" : estimateSystem === "NUMERIC" ? "Numérica" : "Fibonacci"})
                </div>
                {estimateSystem === "FIBONACCI" && (
                  <div className="flex flex-wrap gap-1.5">
                    {FIBONACCI_VALUES.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setEstimateValue(estimateValue === val ? "" : val);
                          setEstimatePopoverOpen(false);
                        }}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer",
                          estimateValue === val
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}
                {estimateSystem === "TSHIRT" && (
                  <div className="flex flex-wrap gap-1.5">
                    {TSHIRT_VALUES.map((val) => (
                      <button
                        key={val}
                        type="button"
                        onClick={() => {
                          setEstimateValue(estimateValue === val ? "" : val);
                          setEstimatePopoverOpen(false);
                        }}
                        className={cn(
                          "px-2.5 py-1 text-xs font-medium rounded border transition-colors cursor-pointer",
                          estimateValue === val
                            ? "bg-blue-600 text-white border-blue-600"
                            : "bg-slate-50 hover:bg-slate-100 border-slate-200"
                        )}
                      >
                        {val}
                      </button>
                    ))}
                  </div>
                )}
                {estimateSystem === "NUMERIC" && (
                  <div className="space-y-2">
                    <Input
                      type="number"
                      min={0}
                      placeholder="Ej. 5"
                      value={estimateValue}
                      onChange={(e) => setEstimateValue(e.target.value)}
                      className="h-8 text-xs"
                    />
                    <Button
                      type="button"
                      size="sm"
                      onClick={() => setEstimatePopoverOpen(false)}
                      className="w-full h-7 text-xs bg-blue-600 hover:bg-blue-500 text-white"
                    >
                      Aplicar
                    </Button>
                  </div>
                )}
                {estimateValue && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => {
                      setEstimateValue("");
                      setEstimatePopoverOpen(false);
                    }}
                    className="w-full mt-2 h-7 text-xs text-red-600 hover:text-red-700"
                  >
                    Borrar estimación
                  </Button>
                )}
              </PopoverContent>
            </Popover>

            {/* 10. GitBranch + Agregar padre */}
            <Popover open={parentPopoverOpen} onOpenChange={setParentPopoverOpen}>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  className={cn(
                    "rounded-full border border-slate-200 dark:border-slate-700 bg-white dark:bg-slate-800 hover:bg-slate-50 dark:hover:bg-slate-700/60 px-3 py-1 text-xs font-medium text-slate-700 dark:text-slate-200 flex items-center gap-1.5 transition-colors cursor-pointer shadow-xs",
                    activeParent && "border-blue-200 bg-blue-50/50 text-blue-900 dark:text-blue-200"
                  )}
                >
                  <GitBranch className="size-3.5 text-slate-500 dark:text-slate-400 shrink-0" />
                  <span>
                    {activeParent
                      ? `${activeParent.identifier || "#" + activeParent.id}`
                      : "Agregar padre"}
                  </span>
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-72 p-2 bg-white dark:bg-slate-900 shadow-xl border border-slate-200 dark:border-slate-800">
                <div className="text-[11px] font-semibold text-slate-400 px-1 py-1 uppercase tracking-wider">Vincular como Padre</div>
                <Input
                  placeholder="Buscar work item..."
                  value={parentSearch}
                  onChange={(e) => setParentSearch(e.target.value)}
                  className="h-8 text-xs my-1"
                />
                <div className="space-y-0.5 mt-1 max-h-48 overflow-y-auto">
                  <button
                    type="button"
                    onClick={() => {
                      setSelectedParentId("");
                      setParentPopoverOpen(false);
                    }}
                    className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left text-slate-500"
                  >
                    <span>Sin padre</span>
                    {!selectedParentId && <Check className="size-3.5 text-blue-600 shrink-0" />}
                  </button>
                  {filteredParentItems.map((item) => (
                    <button
                      key={item.id}
                      type="button"
                      onClick={() => {
                        setSelectedParentId(item.id);
                        setParentPopoverOpen(false);
                      }}
                      className="w-full flex items-center justify-between text-xs px-2 py-1.5 rounded hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer text-left"
                    >
                      <div className="truncate">
                        <span className="font-mono text-slate-400 mr-1.5">{item.identifier}</span>
                        <span>{item.title}</span>
                      </div>
                      {String(item.id) === String(selectedParentId) && <Check className="size-3.5 text-blue-600 shrink-0 ml-1.5" />}
                    </button>
                  ))}
                </div>
              </PopoverContent>
            </Popover>
          </div>

          {/* Modal Footer: Switch 'Crear más' + Descartar + Guardar */}
          <div className="flex items-center justify-end gap-3 pt-5 border-t border-slate-100 dark:border-slate-800">
            {/* Switch: Crear más */}
            <div className="flex items-center gap-2 mr-auto">
              <Switch
                id="create-more-switch"
                checked={createMore}
                onCheckedChange={setCreateMore}
              />
              <Label
                htmlFor="create-more-switch"
                className="text-xs font-medium text-slate-600 dark:text-slate-300 cursor-pointer select-none"
              >
                Crear más
              </Label>
            </div>

            {/* Botón Descartar */}
            <Button
              type="button"
              variant="outline"
              onClick={handleDiscard}
              className="text-xs h-9 px-4 border-slate-200 dark:border-slate-700 text-slate-600 dark:text-slate-300 hover:bg-slate-100 dark:hover:bg-slate-800 cursor-pointer"
            >
              Descartar
            </Button>

            {/* Botón Guardar */}
            <Button
              type="submit"
              disabled={!title.trim() || isSubmitting}
              className="text-xs h-9 px-5 bg-blue-600 hover:bg-blue-500 text-white font-medium shadow-sm transition-colors cursor-pointer"
            >
              {isSubmitting ? <Loader2 className="size-3.5 animate-spin mr-1.5" /> : null}
              Guardar
            </Button>
          </div>
        </form>
    </div>
  );

  if (activeMode === "page") {
    return (
      <div className="w-full p-4 sm:p-6 bg-white dark:bg-slate-900 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {formContent}
      </div>
    );
  }

  if (activeMode === "sheet") {
    return (
      <Sheet open={open} onOpenChange={onOpenChange}>
        <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6 space-y-6">
          <SheetTitle className="sr-only">Crear nuevo elemento de trabajo</SheetTitle>
          {formContent}
        </SheetContent>
      </Sheet>
    );
  }

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="max-w-[800px] w-full p-6 rounded-xl bg-white dark:bg-slate-900 border border-slate-200 dark:border-slate-800 shadow-2xl overflow-visible"
        showCloseButton={true}
      >
        <DialogTitle className="sr-only">Crear nuevo elemento de trabajo</DialogTitle>
        {formContent}
      </DialogContent>
    </Dialog>
  );
}
