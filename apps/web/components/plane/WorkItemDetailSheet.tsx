"use client";

import React, { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { workItemService } from "@/services/plane/workItemService";
import { cycleService } from "@/services/plane/cycleService";
import { moduleService } from "@/services/plane/moduleService";
import { milestoneService } from "@/services/plane/milestoneService";
import { projectMemberService, ProjectMemberUser } from "@/services/plane/projectMemberService";
import { projectService } from "@/services/plane/projectService";
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import { WorkItemActivityTimeline } from "@/components/plane/comments/WorkItemActivityTimeline";
import { RichTextEditor } from "@/components/ui/rich-text-editor";
import { formatDescriptionToHtml, extractPlainText } from "@/lib/rich-text-utils";
import {
  WorkItemViewModeSwitcher,
  WorkItemViewMode,
} from "@/components/plane/work-items/WorkItemViewModeSwitcher";
import { WorkItemGitHubWidget } from "@/components/plane/work-items/WorkItemGitHubWidget";
import { WorkItemSubtasksSection } from "@/components/plane/work-items/WorkItemSubtasksSection";
import { WorkItemDeliverablesSection } from "@/components/plane/work-items/WorkItemDeliverablesSection";
import { Project, State, WorkItem, WorkItemType, Cycle, Module, Milestone } from "@/types/plane-types";
import {
  Plus,
  Trash2,
  Loader2,
  Flag,
  User as UserIcon,
  CircleDashed,
  CircleSlash,
  RefreshCw,
  LayoutGrid,
  Check,
  GitBranch,
} from "lucide-react";
import { useAuth } from "@/hooks/use-auth";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FIBONACCI_VALUES = ["0", "1", "2", "3", "5", "8", "13", "21"];
const TSHIRT_VALUES = ["XS", "S", "M", "L", "XL", "XXL"];

interface Props {
  workItemId: string | number | null;
  project?: Project | null;
  states?: State[];
  availableItems?: WorkItem[];
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  onUpdated: (updatedItem?: WorkItem) => void;
  viewMode?: WorkItemViewMode;
  onViewModeChange?: (mode: WorkItemViewMode) => void;
  isNestedModal?: boolean;
}

export function WorkItemDetailSheet({
  workItemId,
  project = null,
  states = [],
  availableItems = [],
  open = true,
  onOpenChange,
  onUpdated,
  viewMode: propViewMode,
  onViewModeChange,
  isNestedModal = false,
}: Props) {
  const router = useRouter();

  // View Mode preference (default to prop, or localStorage, or 'sheet')
  const [internalMode, setInternalMode] = useState<WorkItemViewMode>(() => {
    if (propViewMode) return propViewMode;
    if (typeof window !== "undefined") {
      const saved = localStorage.getItem("plane_work_item_detail_view_mode") as WorkItemViewMode;
      if (saved === "sheet" || saved === "modal" || saved === "page") return saved;
    }
    return "sheet";
  });

  const isOverlay = Boolean(onOpenChange);
  const activeMode = propViewMode || (isOverlay && internalMode === "page" ? "sheet" : internalMode);

  const [item, setItem] = useState<WorkItem | null>(null);
  const [internalProject, setInternalProject] = useState<Project | null>(null);
  const [internalStates, setInternalStates] = useState<State[]>([]);
  const [types, setTypes] = useState<WorkItemType[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [description, setDescription] = useState("");
  const [stateId, setStateId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [priority, setPriority] = useState<string>("NONE");
  const [estimateValue, setEstimateValue] = useState<string>("");
  const [cycleId, setCycleId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("");
  const [selectedSubItemId, setSelectedSubItemId] = useState<string | number | null>(null);


  // New relation
  const [relationTargetId, setRelationTargetId] = useState<string>("");
  const [relationType, setRelationType] = useState<string>("BLOCKS");
  const [isAddingRelation, setIsAddingRelation] = useState(false);

  // Debounce and auto-flush state for description
  const [saveStatus, setSaveStatus] = useState<"idle" | "saving" | "saved">("idle");
  const debounceTimerRef = useRef<NodeJS.Timeout | null>(null);
  const latestDescriptionRef = useRef<string>("");
  const isDirtyRef = useRef(false);
  const loadedItemIdRef = useRef<string | number | null>(null);
  const isAdminRef = useRef(false);

  // Handle switching view modes
  const handleModeSwitch = (newMode: WorkItemViewMode) => {
    setInternalMode(newMode);
    if (typeof window !== "undefined") {
      try {
        localStorage.setItem("plane_work_item_detail_view_mode", newMode);
      } catch {}
    }
    if (onViewModeChange) {
      onViewModeChange(newMode);
    }
    const targetProject = project || internalProject || item?.project;
    if (newMode === "page" && targetProject && item) {
      if (onOpenChange) onOpenChange(false);
      router.push(`/projects/${targetProject.id}/work-items/${item.id}`);
    } else if (propViewMode === "page" && (newMode === "sheet" || newMode === "modal") && targetProject) {
      router.push(`/projects/${targetProject.id}/work-items?openItem=${workItemId}&detailMode=${newMode}`);
    }
  };

  // Auto-flush pending description changes on unmount or item change
  useEffect(() => {
    return () => {
      if (debounceTimerRef.current) {
        clearTimeout(debounceTimerRef.current);
      }
      if (isAdminRef.current && isDirtyRef.current && loadedItemIdRef.current) {
        const descHtml = latestDescriptionRef.current;
        const trimmed = descHtml.trim();
        const isEmpty = !trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>" || trimmed === "<br>";
        const cleanHtml = !isEmpty ? descHtml : null;
        workItemService
          .update(loadedItemIdRef.current, {
            description_html: cleanHtml,
            description: cleanHtml,
            description_json: cleanHtml ? { html: cleanHtml, text: extractPlainText(cleanHtml) } : null,
          })
          .catch(() => {});
      }
    };
  }, []);

  useEffect(() => {
    if (!open && activeMode !== "page") {
      // Flush before clearing if dirty
      if (isAdminRef.current && isDirtyRef.current && loadedItemIdRef.current) {
        const descHtml = latestDescriptionRef.current;
        const trimmed = descHtml.trim();
        const isEmpty = !trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>" || trimmed === "<br>";
        const cleanHtml = !isEmpty ? descHtml : null;
        workItemService
          .update(loadedItemIdRef.current, {
            description_html: cleanHtml,
            description: cleanHtml,
            description_json: cleanHtml ? { html: cleanHtml, text: extractPlainText(cleanHtml) } : null,
          })
          .catch(() => {});
        isDirtyRef.current = false;
      }
      setItem(null);
      loadedItemIdRef.current = null;
      return;
    }

    if (!workItemId) return;

    const isInitialLoad = loadedItemIdRef.current !== workItemId || !item;

    async function loadItem() {
      if (isInitialLoad) {
        setIsLoading(true);
      }
      try {
        const itemData = await workItemService.get(workItemId!);
        const currentProj = project || itemData.project;
        const currentProjId = currentProj?.id;

        const [projData, typesData, cyclesData, modulesData, milestonesData, membersData, statesData] = await Promise.all([
          !project && currentProjId ? projectService.get(currentProjId).catch(() => null) : Promise.resolve(null),
          currentProjId ? workItemTypeService.list(currentProjId).catch(() => []) : Promise.resolve([]),
          currentProjId ? cycleService.list(currentProjId).catch(() => []) : Promise.resolve([]),
          currentProjId ? moduleService.list(currentProjId).catch(() => []) : Promise.resolve([]),
          currentProjId ? milestoneService.list(currentProjId).catch(() => []) : Promise.resolve([]),
          currentProjId ? projectMemberService.list(currentProjId).then((r) => r.members).catch(() => []) : Promise.resolve([]),
          (!states || states.length === 0) && currentProjId ? projectService.getStates(currentProjId).catch(() => []) : Promise.resolve([]),
        ]);

        if (projData) {
          setInternalProject(projData);
        }
        if (statesData && statesData.length > 0) {
          setInternalStates(statesData);
        }

        setItem(itemData);
        loadedItemIdRef.current = workItemId;
        setTypes(typesData);
        setCycles(cyclesData);
        setModules(modulesData);
        setMilestones(milestonesData);
        setMembers(membersData);

        setTitle(itemData.title);

        // Normalize description into HTML for RichTextEditor
        const initialHtml = itemData.description_html || formatDescriptionToHtml(itemData.description_json);
        setDescription(initialHtml);
        latestDescriptionRef.current = initialHtml;
        isDirtyRef.current = false;

        setStateId(String(itemData.state?.id || ""));
        setTypeId(itemData.type?.id ? String(itemData.type.id) : "");
        setPriority(itemData.priority || "NONE");
        setEstimateValue(itemData.estimate_value || (itemData.estimate_points ? String(itemData.estimate_points) : ""));
        setCycleId(itemData.cycles && itemData.cycles.length > 0 ? String(itemData.cycles[0].id) : "");
        setModuleId(itemData.modules && itemData.modules.length > 0 ? String(itemData.modules[0].id) : "");

        const rawMilestoneId = (itemData as any).milestone_id || (itemData as any).milestone?.id || "";
        setMilestoneId(rawMilestoneId ? String(rawMilestoneId) : "");

        const rawLeadId = (itemData as any).lead_id || (itemData as any).lead?.id || "";
        setLeadId(rawLeadId ? String(rawLeadId) : "");
      } catch {
        toast.error("Error al cargar los detalles del work item");
      } finally {
        if (isInitialLoad) {
          setIsLoading(false);
        }
      }
    }

    loadItem();
  }, [workItemId, open, project?.id, activeMode]);

  const { user } = useAuth();
  const [isGitModalOpen, setIsGitModalOpen] = useState(false);

  const effectiveProject: Project | null = project || internalProject || (item?.project as unknown as Project) || null;
  const effectiveStates = states && states.length > 0 ? states : internalStates;

  const isAdmin = Boolean(
    effectiveProject?.current_user_role?.toUpperCase() === "ADMIN" ||
    user?.is_instance_admin ||
    Boolean((effectiveProject as any)?.workspace && (effectiveProject as any).workspace.owner_id === user?.id)
  );
  isAdminRef.current = isAdmin;
  const isCreator = !!user && (
    String((item as any)?.created_by) === String(user.id) ||
    String((item as any)?.creator?.id) === String(user.id)
  );
  const isLead = !!user && (
    String(item?.lead_id) === String(user.id) ||
    String((item as any)?.lead?.id) === String(user.id)
  );
  const isAssignee = !!user && (
    isLead ||
    item?.assignees?.some((a) => String(a.id) === String(user.id))
  );
  const isProjectMember = Boolean(
    effectiveProject?.current_user_role?.toUpperCase() === "MEMBER" ||
    effectiveProject?.current_user_role?.toUpperCase() === "ADMIN"
  );

  // Allow admins, assignees, leads, creators, project members, or users in personal views (no fixed project prop) to change state
  const canChangeState = isAdmin || isAssignee || isCreator || isProjectMember || !project;

  // Quick update helper for structured properties (shows toast)
  const handleUpdateField = async (payload: Partial<WorkItem> & Record<string, any>) => {
    if (!item) return;
    const isStateOnly = Object.keys(payload).length === 1 && "state_id" in payload;
    if (!isAdmin && (!canChangeState || !isStateOnly)) return;

    try {
      const updated = await workItemService.update(item.id, payload);
      setItem((prev) => ({
        ...prev,
        ...updated,
        sub_items: updated.sub_items?.length ? updated.sub_items : (prev?.sub_items ?? []),
        cycles: updated.cycles?.length ? updated.cycles : (prev?.cycles ?? []),
        modules: updated.modules?.length ? updated.modules : (prev?.modules ?? []),
      }));
      toast.success("Tarea actualizada correctamente");
      onUpdated(updated);
    } catch {
      toast.error("Error al actualizar");
    }
  };

  // Debounced and silent description saving (NO toast on success)
  const performSaveDescription = async (descHtml: string) => {
    if (!isAdmin || !item) return;
    try {
      setSaveStatus("saving");
      const trimmed = descHtml.trim();
      const isEmpty = !trimmed || trimmed === "<p></p>" || trimmed === "<p><br></p>" || trimmed === "<br>";
      const cleanHtml = !isEmpty ? descHtml : null;
      const payloadJson = cleanHtml
        ? {
            html: cleanHtml,
            text: extractPlainText(cleanHtml),
          }
        : null;

      const updated = await workItemService.update(item.id, {
        description_html: cleanHtml,
        description: cleanHtml,
        description_json: payloadJson,
      });
      setItem((prev) => ({
        ...prev,
        ...updated,
        sub_items: updated.sub_items?.length ? updated.sub_items : (prev?.sub_items ?? []),
        cycles: updated.cycles?.length ? updated.cycles : (prev?.cycles ?? []),
        modules: updated.modules?.length ? updated.modules : (prev?.modules ?? []),
      }));
      isDirtyRef.current = false;
      setSaveStatus("saved");
      onUpdated(updated);
      setTimeout(() => {
        setSaveStatus((curr) => (curr === "saved" ? "idle" : curr));
      }, 2500);
    } catch {
      setSaveStatus("idle");
      toast.error("Error al guardar la descripción");
    }
  };

  const handleDescriptionChange = (newHtml: string) => {
    if (!isAdmin) return;
    setDescription(newHtml);
    latestDescriptionRef.current = newHtml;
    isDirtyRef.current = true;
    setSaveStatus("saving");

    if (debounceTimerRef.current) {
      clearTimeout(debounceTimerRef.current);
    }

    debounceTimerRef.current = setTimeout(() => {
      if (isDirtyRef.current && item) {
        performSaveDescription(latestDescriptionRef.current);
      }
    }, 1000);
  };

  const handleRefreshWorkItem = async () => {
    if (!item) return;
    try {
      const updated = await workItemService.get(item.id);
      setItem(updated);
      onUpdated(updated);
    } catch {}
  };

  const handleAddRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!isAdmin || !relationTargetId || !item) return;

    setIsAddingRelation(true);
    try {
      await workItemService.addRelation(item.id, {
        target_id: relationTargetId,
        relation_type: relationType,
      });
      toast.success("Relación creada");
      setRelationTargetId("");
      onUpdated();
      const updated = await workItemService.get(item.id);
      setItem(updated);
    } catch {
      toast.error("Error al agregar relación");
    } finally {
      setIsAddingRelation(false);
    }
  };

  const handleDeleteRelation = async (relId: string | number) => {
    if (!isAdmin || !item) return;
    try {
      await workItemService.deleteRelation(relId);
      toast.success("Relación eliminada");
      onUpdated();
      const updated = await workItemService.get(item.id);
      setItem(updated);
    } catch {
      toast.error("Error al eliminar relación");
    }
  };

  const estimateSystem = effectiveProject?.estimate_system || "FIBONACCI";

  // Inner form content reused across Sheet, Modal, and Page
  const renderInnerContent = () => {
    if ((!item && isLoading) || !item) {
      return (
        <div className="flex flex-col items-center justify-center py-24">
          <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
          <p className="text-sm text-slate-500">Cargando detalles...</p>
        </div>
      );
    }

    return (
      <div className="space-y-6">
        {/* Header: Identifier, Type, Switcher, Title */}
        <div className="pb-3 border-b border-slate-100 dark:border-slate-800">
          <div className={cn(
            "flex items-center justify-between gap-2 flex-wrap sm:flex-nowrap",
            activeMode !== "page" && "pr-10 sm:pr-12"
          )}>
            <div className="flex items-center gap-2">
              <span className="font-mono text-xs font-bold bg-slate-100 dark:bg-slate-800 text-slate-700 dark:text-slate-200 px-2 py-0.5 rounded">
                {item.identifier}
              </span>

              {/* Work Item Type Selector */}
              <Select
                value={typeId}
                disabled={!isAdmin}
                onValueChange={(val) => {
                  setTypeId(val);
                  handleUpdateField({ type_id: val });
                }}
              >
                <SelectTrigger className="h-7 text-xs bg-slate-50 dark:bg-slate-900 border-slate-200 dark:border-slate-800 disabled:opacity-75 disabled:cursor-not-allowed">
                  <SelectValue placeholder="Tipo" />
                </SelectTrigger>
                <SelectContent>
                  {types.map((t) => (
                    <SelectItem key={t.id} value={String(t.id)}>
                      <div className="flex items-center gap-1.5">
                        <span className="size-2 rounded-full" style={{ backgroundColor: t.color }} />
                        <span>{t.name}</span>
                      </div>
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* View Mode Switcher and Git Branch Modal Button */}
            <div className="flex items-center gap-2">
              {(canChangeState || isAdmin) && (
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setIsGitModalOpen(true)}
                  className="h-7 text-xs px-2.5 font-mono gap-1.5 text-indigo-700 dark:text-indigo-400 border-indigo-200 dark:border-indigo-900/60 hover:bg-indigo-50 dark:hover:bg-indigo-950/40"
                  title="Abrir modal para crear rama o copiar comando Git para terminal local"
                >
                  <GitBranch className="size-3 text-indigo-600 dark:text-indigo-400" />
                  <span>Rama Git</span>
                </Button>
              )}
              <WorkItemViewModeSwitcher
                currentMode={activeMode}
                onChangeMode={handleModeSwitch}
              />
            </div>
          </div>

          {/* Title input */}
          <div className="pt-2">
            <Input
              value={title}
              disabled={!isAdmin}
              onChange={(e) => setTitle(e.target.value)}
              onBlur={() => {
                if (title !== item.title) {
                  handleUpdateField({ title });
                }
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  (e.target as HTMLInputElement).blur();
                }
              }}
              className="text-lg font-bold border-transparent hover:border-slate-200 dark:hover:border-slate-700 focus-visible:border-indigo-500 px-1 py-1 disabled:opacity-90 disabled:cursor-default"
            />
          </div>
        </div>

        {/* Rich Text Description with Debounce and Micro-Indicator */}
        <div className="space-y-1.5">
          <div className="flex items-center justify-between">
            <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
              Descripción (Texto Enriquecido)
            </span>
            <div className="flex items-center gap-2">
              {!isAdmin && (
                <span className="text-[11px] text-slate-400 dark:text-slate-500 font-medium">
                  Solo lectura (Admin requerido para editar)
                </span>
              )}
              {isAdmin && saveStatus === "saving" && (
                <span className="flex items-center gap-1 text-[11px] text-amber-600 dark:text-amber-400 font-medium">
                  <Loader2 className="size-3 animate-spin" /> Guardando...
                </span>
              )}
              {isAdmin && saveStatus === "saved" && (
                <span className="flex items-center gap-1 text-[11px] text-emerald-600 dark:text-emerald-400 font-medium animate-in fade-in duration-200">
                  <Check className="size-3" /> Guardado
                </span>
              )}
            </div>
          </div>
          <RichTextEditor
            value={description}
            onChange={handleDescriptionChange}
            readOnly={!isAdmin}
            disabled={!isAdmin}
            placeholder={isAdmin ? "Escribe los detalles y requerimientos de la tarea..." : "Sin descripción."}
            minHeight="140px"
            maxHeight="320px"
            className="border-slate-200 dark:border-slate-800"
          />
        </div>

        {/* Subtareas Section (Collapsible with (n/m) counter and modal opening) */}
        <WorkItemSubtasksSection
          item={item}
          project={effectiveProject}
          states={effectiveStates}
          members={members}
          isAdmin={isAdmin}
          currentUser={user}
          onRefreshParent={handleRefreshWorkItem}
          onOpenSubItemDetail={(subId) => setSelectedSubItemId(subId)}
        />

        {/* Quick Properties: 1 Column of Full-Width Horizontal Rows */}
        <div className="flex flex-col gap-2 bg-slate-50/80 dark:bg-slate-900/60 p-3 rounded-xl border border-slate-200/80 dark:border-slate-800 text-xs">
          {/* 1. Estado */}
          <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 w-28 flex items-center gap-1.5">
              <CircleDashed className="size-3 text-slate-400" /> Estado:
            </span>
            <Select
              value={stateId}
              disabled={!canChangeState}
              onValueChange={(val) => {
                setStateId(val);
                handleUpdateField({ state_id: val });
              }}
            >
              <SelectTrigger className="h-8 flex-1 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs disabled:opacity-75 disabled:cursor-not-allowed">
                <SelectValue placeholder="Estado" />
              </SelectTrigger>
              <SelectContent>
                {effectiveStates.map((s) => (
                  <SelectItem key={s.id} value={String(s.id)}>
                    <div className="flex items-center gap-1.5">
                      <span className="size-2 rounded-full" style={{ backgroundColor: s.color }} />
                      <span>{s.name}</span>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 2. Hito */}
          <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 w-28 flex items-center gap-1.5">
              <Flag className="size-3 text-slate-400" /> Hito:
            </span>
            <Select
              value={milestoneId}
              disabled={!isAdmin}
              onValueChange={(val) => {
                const next = val === "none" ? "" : val;
                setMilestoneId(next);
                handleUpdateField({ milestone_id: next || null });
              }}
            >
              <SelectTrigger className="h-8 flex-1 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs disabled:opacity-75 disabled:cursor-not-allowed">
                <SelectValue placeholder="Sin hito" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin hito</SelectItem>
                {milestones.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.title}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 3. Prioridad */}
          <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 w-28 flex items-center gap-1.5">
              <CircleSlash className="size-3 text-slate-400" /> Prioridad:
            </span>
            <Select
              value={priority}
              disabled={!isAdmin}
              onValueChange={(val) => {
                setPriority(val);
                handleUpdateField({ priority: val as any });
              }}
            >
              <SelectTrigger className="h-8 flex-1 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs disabled:opacity-75 disabled:cursor-not-allowed">
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

          {/* 4. Ciclo */}
          <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 w-28 flex items-center gap-1.5">
              <RefreshCw className="size-3 text-slate-400" /> Ciclo:
            </span>
            <Select
              value={cycleId}
              disabled={!isAdmin}
              onValueChange={(val) => {
                const next = val === "none" ? "" : val;
                setCycleId(next);
                handleUpdateField({ cycle_id: next || null });
              }}
            >
              <SelectTrigger className="h-8 flex-1 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs disabled:opacity-75 disabled:cursor-not-allowed">
                <SelectValue placeholder="Sin ciclo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin ciclo</SelectItem>
                {cycles.map((c) => (
                  <SelectItem key={c.id} value={String(c.id)}>
                    {c.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 5. Responsable */}
          <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 w-28 flex items-center gap-1.5">
              <UserIcon className="size-3 text-slate-400" /> Responsable:
            </span>
            <Select
              value={leadId}
              disabled={!isAdmin}
              onValueChange={(val) => {
                const next = val === "none" ? "" : val;
                setLeadId(next);
                handleUpdateField({ lead_id: next || null });
              }}
            >
              <SelectTrigger className="h-8 flex-1 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs disabled:opacity-75 disabled:cursor-not-allowed">
                <SelectValue placeholder="Sin asignar" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin asignar</SelectItem>
                {members.map((u) => (
                  <SelectItem key={u.id} value={String(u.id)}>
                    {u.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* 6. Módulo */}
          <div className="flex items-center justify-between gap-3 p-2 bg-white dark:bg-slate-900 rounded-lg border border-slate-200/70 dark:border-slate-800 shadow-2xs">
            <span className="text-slate-500 dark:text-slate-400 font-medium shrink-0 w-28 flex items-center gap-1.5">
              <LayoutGrid className="size-3 text-slate-400" /> Módulo:
            </span>
            <Select
              value={moduleId}
              disabled={!isAdmin}
              onValueChange={(val) => {
                const next = val === "none" ? "" : val;
                setModuleId(next);
                handleUpdateField({ module_id: next || null });
              }}
            >
              <SelectTrigger className="h-8 flex-1 bg-slate-50/50 dark:bg-slate-800/50 border-slate-200 dark:border-slate-700 text-xs disabled:opacity-75 disabled:cursor-not-allowed">
                <SelectValue placeholder="Sin módulo" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="none">Sin módulo</SelectItem>
                {modules.map((m) => (
                  <SelectItem key={m.id} value={String(m.id)}>
                    {m.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Dynamic Estimate Selector */}
        {estimateSystem !== "NONE" && (
          <div className="space-y-2">
            <div className="flex items-center justify-between text-xs">
              <Label className="font-semibold text-slate-700 dark:text-slate-300">
                Estimación de Esfuerzo ({estimateSystem === "TSHIRT" ? "Tallas de Camiseta" : "Puntos Fibonacci"})
              </Label>
              <span className="text-slate-400">{estimateValue || "Sin estimar"}</span>
            </div>

            {estimateSystem === "FIBONACCI" && (
              <div className="flex flex-wrap gap-1.5">
                {FIBONACCI_VALUES.map((val) => {
                  const isSelected = estimateValue === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => {
                        const next = isSelected ? "" : val;
                        setEstimateValue(next);
                        handleUpdateField({
                          estimate_value: next || null,
                          estimate_points: next ? Number(next) : null,
                        });
                      }}
                      className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-lg border transition-all",
                        !isAdmin ? "cursor-not-allowed opacity-75" : "cursor-pointer",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                      )}
                    >
                      {val} pts
                    </button>
                  );
                })}
              </div>
            )}

            {estimateSystem === "TSHIRT" && (
              <div className="flex flex-wrap gap-1.5">
                {TSHIRT_VALUES.map((val) => {
                  const isSelected = estimateValue === val;
                  return (
                    <button
                      key={val}
                      type="button"
                      disabled={!isAdmin}
                      onClick={() => {
                        const next = isSelected ? "" : val;
                        setEstimateValue(next);
                        handleUpdateField({
                          estimate_value: next || null,
                          estimate_points: null,
                        });
                      }}
                      className={cn(
                        "px-3 py-1 text-xs font-semibold rounded-lg border transition-all",
                        !isAdmin ? "cursor-not-allowed opacity-75" : "cursor-pointer",
                        isSelected
                          ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                          : "bg-white dark:bg-slate-900 text-slate-700 dark:text-slate-300 border-slate-200 dark:border-slate-700 hover:border-indigo-300 hover:bg-slate-50"
                      )}
                    >
                      {val}
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* GitHub Integration Widget (Multi-Repo, Branches, PRs & Dokploy Previews) */}
        {effectiveProject && item && (
          <WorkItemGitHubWidget
            workItemId={item.id}
            identifier={item.identifier}
            title={item.title}
            projectId={effectiveProject.id}
            isAdmin={isAdmin}
            isBranchModalOpen={isGitModalOpen}
            onBranchModalOpenChange={setIsGitModalOpen}
            onWorkItemUpdated={() => {
              if (onUpdated) onUpdated();
              if (workItemId) {
                workItemService.get(workItemId).then((updated: WorkItem) => {
                  setItem(updated);
                  if (updated.state?.id) setStateId(String(updated.state.id));
                }).catch(() => {});
              }
            }}
          />
        )}

        {/* Tabs: Deliverables, Relations, Activity & Comments */}
        <Tabs defaultValue="deliverables" className="w-full">
          <TabsList className="w-full grid grid-cols-3 bg-slate-100 dark:bg-slate-800">
            <TabsTrigger value="deliverables" className="text-xs">
              Entregables
            </TabsTrigger>
            <TabsTrigger value="relations" className="text-xs">
              Relaciones ({((item.outward_relations?.length || 0) + (item.inward_relations?.length || 0))})
            </TabsTrigger>
            <TabsTrigger value="activity" className="text-xs">
              Actividad
            </TabsTrigger>
          </TabsList>

          {/* Deliverables Tab */}
          <TabsContent value="deliverables" className="pt-3">
            {effectiveProject ? (
              <WorkItemDeliverablesSection
                projectId={effectiveProject.id}
                workItemId={item.id}
                isAdmin={isAdmin}
              />
            ) : (
              <p className="text-xs text-slate-400 italic py-3 text-center">
                Proyecto no encontrado.
              </p>
            )}
          </TabsContent>

          {/* Relations Tab */}
          <TabsContent value="relations" className="space-y-3 pt-3">
            {isAdmin && (
              <form onSubmit={handleAddRelation} className="flex flex-col gap-2 p-3 bg-slate-50 dark:bg-slate-900 rounded-lg border border-slate-100 dark:border-slate-800">
                <span className="text-xs font-semibold text-slate-600 dark:text-slate-300">Añadir nueva relación</span>
                <div className="flex gap-2">
                  <Select value={relationType} onValueChange={setRelationType}>
                    <SelectTrigger className="h-8 w-32 text-xs">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLOCKS">Bloquea a</SelectItem>
                      <SelectItem value="BLOCKED_BY">Bloqueado por</SelectItem>
                      <SelectItem value="RELATION">Relacionado con</SelectItem>
                      <SelectItem value="DUPLICATE_OF">Duplicado de</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={relationTargetId} onValueChange={setRelationTargetId}>
                    <SelectTrigger className="h-8 flex-1 text-xs">
                      <SelectValue placeholder="Seleccionar tarea..." />
                    </SelectTrigger>
                    <SelectContent>
                      {availableItems
                        .filter((i) => i.id !== item.id)
                        .map((i) => (
                          <SelectItem key={i.id} value={String(i.id)}>
                            {i.identifier} - {i.title}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Button type="submit" size="sm" disabled={isAddingRelation || !relationTargetId} className="h-8 text-xs">
                    {isAddingRelation ? <Loader2 className="size-3 animate-spin" /> : "Vincular"}
                  </Button>
                </div>
              </form>
            )}

            <div className="space-y-1.5 max-h-56 overflow-y-auto">
              {item.outward_relations?.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-indigo-700 bg-indigo-50 dark:bg-indigo-950/60 dark:text-indigo-300 px-1.5 py-0.5 rounded text-[10px]">
                      {rel.relation_type === "BLOCKS" ? "Bloquea a" : "Relacionado con"}
                    </span>
                    <span className="font-mono text-slate-500 font-semibold">{rel.target?.identifier}</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate">{rel.target?.title}</span>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRelation(rel.id)}
                      className="size-6 text-slate-300 hover:text-red-600"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              ))}

              {item.inward_relations?.map((rel) => (
                <div
                  key={rel.id}
                  className="flex items-center justify-between p-2 rounded-lg border border-slate-100 dark:border-slate-800 text-xs"
                >
                  <div className="flex items-center gap-2">
                    <span className="font-semibold text-amber-700 bg-amber-50 dark:bg-amber-950/60 dark:text-amber-300 px-1.5 py-0.5 rounded text-[10px]">
                      {rel.relation_type === "BLOCKS" ? "Bloqueado por" : "Relacionado con"}
                    </span>
                    <span className="font-mono text-slate-500 font-semibold">{rel.source?.identifier}</span>
                    <span className="text-slate-800 dark:text-slate-200 truncate">{rel.source?.title}</span>
                  </div>
                  {isAdmin && (
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleDeleteRelation(rel.id)}
                      className="size-6 text-slate-300 hover:text-red-600"
                    >
                      <Trash2 className="size-3" />
                    </Button>
                  )}
                </div>
              ))}

              {(!item.outward_relations || item.outward_relations.length === 0) &&
                (!item.inward_relations || item.inward_relations.length === 0) && (
                  <p className="text-xs text-slate-400 italic py-3 text-center">
                    No hay relaciones registradas.
                  </p>
                )}
            </div>
          </TabsContent>

          {/* Activity & Comments Tab */}
          <TabsContent value="activity" className="pt-3">
            <WorkItemActivityTimeline
              workItemId={item.id}
              projectId={effectiveProject?.id}
              availableMembers={members.map((m) => ({
                id: m.id,
                name: m.name,
                email: m.email,
                avatar_url: m.avatar_url,
                role: m.role,
              }))}
            />
          </TabsContent>
        </Tabs>

        {/* Nested Subtask Detail Modal */}
        {selectedSubItemId && (
          <WorkItemDetailSheet
            workItemId={selectedSubItemId}
            project={effectiveProject}
            states={effectiveStates}
            availableItems={availableItems}
            open={!!selectedSubItemId}
            onOpenChange={(isOpen) => {
              if (!isOpen) setSelectedSubItemId(null);
            }}
            viewMode="modal"
            isNestedModal={true}
            onUpdated={() => {
              handleRefreshWorkItem();
              if (onUpdated) onUpdated();
            }}
          />
        )}
      </div>
    );
  };

  // Render according to activeMode:
  if (activeMode === "page") {
    return (
      <div className="w-full p-4 sm:p-6 bg-white dark:bg-slate-950 rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm">
        {renderInnerContent()}
      </div>
    );
  }

  if (activeMode === "modal") {
    const modalZIndex = isNestedModal ? "z-[70]" : "z-[60]";
    return (
      <Dialog open={open} onOpenChange={onOpenChange}>
        <DialogContent
          className={cn(
            "w-full sm:max-w-4xl max-h-[90vh] overflow-y-auto p-6 sm:p-7 pt-7 sm:pt-8 bg-white dark:bg-slate-950 border border-slate-200 dark:border-slate-800 shadow-2xl",
            "[&>[data-slot=dialog-close]]:top-5 sm:[&>[data-slot=dialog-close]]:top-6 [&>[data-slot=dialog-close]]:right-5 sm:[&>[data-slot=dialog-close]]:right-6 [&>[data-slot=dialog-close]]:p-1.5 [&>[data-slot=dialog-close]]:rounded-md hover:[&>[data-slot=dialog-close]]:bg-slate-100 dark:hover:[&>[data-slot=dialog-close]]:bg-slate-800",
            modalZIndex
          )}
          overlayClassName={modalZIndex}
        >
          <DialogTitle className="sr-only">Detalle de {item?.identifier || "Work Item"}</DialogTitle>
          {renderInnerContent()}
        </DialogContent>
      </Dialog>
    );
  }

  // Default: "sheet"
  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent
        side="right"
        className={cn(
          "w-full sm:max-w-2xl overflow-y-auto p-6 sm:p-7 pt-7 sm:pt-8 bg-white dark:bg-slate-950 border-l border-slate-200 dark:border-slate-800 shadow-2xl",
          "[&_button[data-slot=sheet-close]]:top-5 sm:[&_button[data-slot=sheet-close]]:top-6 [&_button[data-slot=sheet-close]]:right-5 sm:[&_button[data-slot=sheet-close]]:right-6",
          isNestedModal ? "z-[70]" : "z-[60]"
        )}
      >
        <SheetTitle className="sr-only">Detalle de {item?.identifier || "Work Item"}</SheetTitle>
        {renderInnerContent()}
      </SheetContent>
    </Sheet>
  );
}
