"use client";

import React, { useState, useEffect, useRef } from "react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
} from "@/components/ui/sheet";
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
import { workItemTypeService } from "@/services/plane/workItemTypeService";
import { WorkItemActivityTimeline } from "@/components/plane/comments/WorkItemActivityTimeline";
import { NotionBlockEditor } from "@/components/plane/editor/NotionBlockEditor";
import { Project, State, WorkItem, WorkItemType, Cycle, Module, Milestone, DocBlock } from "@/types/plane-types";
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
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const FIBONACCI_VALUES = ["0", "1", "2", "3", "5", "8", "13", "21"];
const TSHIRT_VALUES = ["XS", "S", "M", "L", "XL", "XXL"];

interface Props {
  workItemId: string | number | null;
  project: Project | null;
  states: State[];
  availableItems: WorkItem[];
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onUpdated: (updatedItem?: WorkItem) => void;
}

export function WorkItemDetailSheet({
  workItemId,
  project,
  states,
  availableItems,
  open,
  onOpenChange,
  onUpdated,
}: Props) {
  const [item, setItem] = useState<WorkItem | null>(null);
  const [types, setTypes] = useState<WorkItemType[]>([]);
  const [cycles, setCycles] = useState<Cycle[]>([]);
  const [modules, setModules] = useState<Module[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [members, setMembers] = useState<ProjectMemberUser[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  // Editable fields
  const [title, setTitle] = useState("");
  const [docBlocks, setDocBlocks] = useState<DocBlock[]>([]);
  const [stateId, setStateId] = useState<string>("");
  const [typeId, setTypeId] = useState<string>("");
  const [priority, setPriority] = useState<string>("NONE");
  const [estimateValue, setEstimateValue] = useState<string>("");
  const [cycleId, setCycleId] = useState<string>("");
  const [moduleId, setModuleId] = useState<string>("");
  const [milestoneId, setMilestoneId] = useState<string>("");
  const [leadId, setLeadId] = useState<string>("");

  // Sub-item quick create
  const [newSubItemTitle, setNewSubItemTitle] = useState("");
  const [isCreatingSubItem, setIsCreatingSubItem] = useState(false);

  // New relation
  const [relationTargetId, setRelationTargetId] = useState<string>("");
  const [relationType, setRelationType] = useState<string>("BLOCKS");
  const [isAddingRelation, setIsAddingRelation] = useState(false);

  const loadedItemIdRef = useRef<string | number | null>(null);

  useEffect(() => {
    if (!open) {
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
        const [itemData, typesData, cyclesData, modulesData, milestonesData, membersData] = await Promise.all([
          workItemService.get(workItemId!),
          project ? workItemTypeService.list(project.id) : Promise.resolve([]),
          project ? cycleService.list(project.id) : Promise.resolve([]),
          project ? moduleService.list(project.id) : Promise.resolve([]),
          project ? milestoneService.list(project.id) : Promise.resolve([]),
          project ? projectMemberService.list(project.id).then((r) => r.members).catch(() => []) : Promise.resolve([]),
        ]);

        setItem(itemData);
        loadedItemIdRef.current = workItemId;
        setTypes(typesData);
        setCycles(cyclesData);
        setModules(modulesData);
        setMilestones(milestonesData);
        setMembers(membersData);

        setTitle(itemData.title);

        // Normalize description into Notion doc blocks
        let initialBlocks: DocBlock[] = [];
        if (Array.isArray(itemData.description_json) && itemData.description_json.length > 0) {
          initialBlocks = itemData.description_json;
        } else if (itemData.description_json && typeof itemData.description_json === "object" && (itemData.description_json as any).text) {
          initialBlocks = [{ id: "b-init", type: "paragraph", content: (itemData.description_json as any).text }];
        } else if (typeof itemData.description_json === "string" && itemData.description_json.trim()) {
          initialBlocks = [{ id: "b-init", type: "paragraph", content: itemData.description_json }];
        } else {
          initialBlocks = [{ id: "b-init", type: "paragraph", content: "" }];
        }
        setDocBlocks(initialBlocks);

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
  }, [workItemId, open, project?.id]);

  const handleUpdateField = async (payload: Partial<WorkItem> & Record<string, any>) => {
    if (!item) return;
    try {
      const updated = await workItemService.update(item.id, payload);
      setItem(updated);
      toast.success("Tarea actualizada correctamente");
      onUpdated(updated);
    } catch {
      toast.error("Error al actualizar");
    }
  };

  const handleCreateSubItem = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!newSubItemTitle.trim() || !project || !item) return;

    setIsCreatingSubItem(true);
    try {
      await workItemService.create(project.id, {
        title: newSubItemTitle.trim(),
        parent_id: item.id,
        state_id: states[0]?.id,
      });
      toast.success("Subtarea agregada");
      setNewSubItemTitle("");
      onUpdated();
      const updated = await workItemService.get(item.id);
      setItem(updated);
    } catch {
      toast.error("Error al crear subtarea");
    } finally {
      setIsCreatingSubItem(false);
    }
  };

  const handleAddRelation = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!relationTargetId || !item) return;

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
    if (!item) return;
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

  const estimateSystem = project?.estimate_system || "FIBONACCI";

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent className="w-full sm:max-w-2xl overflow-y-auto p-6 space-y-6">
        {!item ? (
          <div className="flex flex-col items-center justify-center py-24">
            <Loader2 className="size-8 text-indigo-600 animate-spin mb-3" />
            <p className="text-sm text-slate-500">Cargando detalles...</p>
          </div>
        ) : (
          <>
            <SheetHeader className="pb-3 border-b border-slate-100">
              <div className="flex items-center justify-between gap-2">
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold bg-slate-100 text-slate-700 px-2 py-0.5 rounded">
                    {item.identifier}
                  </span>

                  {/* Work Item Type Selector */}
                  <Select
                    value={typeId}
                    onValueChange={(val) => {
                      setTypeId(val);
                      handleUpdateField({ type_id: val });
                    }}
                  >
                    <SelectTrigger className="h-7 text-xs bg-slate-50 border-slate-200">
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
              </div>

              {/* Title input */}
              <div className="pt-2">
                <Input
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  onBlur={() => {
                    if (title !== item.title) {
                      handleUpdateField({ title });
                    }
                  }}
                  className="text-lg font-bold border-transparent hover:border-slate-200 focus-visible:border-indigo-500 px-1 py-1"
                />
              </div>
            </SheetHeader>

            {/* Notion-style Block Description */}
            <div className="space-y-1.5">
              <div className="flex items-center justify-between">
                <span className="text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  Descripción (Editor en Bloque)
                </span>
                <span className="text-[11px] text-slate-400">
                  Usa &apos;/&apos; para insertar bloques
                </span>
              </div>
              <div className="rounded-xl border border-slate-200 bg-white p-3 min-h-[140px] focus-within:border-indigo-400 focus-within:ring-1 focus-within:ring-indigo-400/20 transition-all shadow-2xs">
                <NotionBlockEditor
                  blocks={docBlocks}
                  onChange={(newBlocks) => {
                    setDocBlocks(newBlocks);
                    handleUpdateField({ description_json: newBlocks });
                  }}
                />
              </div>
            </div>

            {/* Quick Properties: 1 Column of Full-Width Horizontal Rows */}
            <div className="flex flex-col gap-2 bg-slate-50/80 p-3 rounded-xl border border-slate-200/80 text-xs">
              {/* 1. Estado */}
              <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 font-medium shrink-0 w-28 flex items-center gap-1.5">
                  <CircleDashed className="size-3 text-slate-400" /> Estado:
                </span>
                <Select
                  value={stateId}
                  onValueChange={(val) => {
                    setStateId(val);
                    handleUpdateField({ state_id: val });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-slate-50/50 border-slate-200 text-xs">
                    <SelectValue placeholder="Estado" />
                  </SelectTrigger>
                  <SelectContent>
                    {states.map((s) => (
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
              <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 font-medium shrink-0 w-28 flex items-center gap-1.5">
                  <Flag className="size-3 text-slate-400" /> Hito:
                </span>
                <Select
                  value={milestoneId}
                  onValueChange={(val) => {
                    const next = val === "none" ? "" : val;
                    setMilestoneId(next);
                    handleUpdateField({ milestone_id: next || null });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-slate-50/50 border-slate-200 text-xs">
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
              <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 font-medium shrink-0 w-28 flex items-center gap-1.5">
                  <CircleSlash className="size-3 text-slate-400" /> Prioridad:
                </span>
                <Select
                  value={priority}
                  onValueChange={(val) => {
                    setPriority(val);
                    handleUpdateField({ priority: val as any });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-slate-50/50 border-slate-200 text-xs">
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
              <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 font-medium shrink-0 w-28 flex items-center gap-1.5">
                  <RefreshCw className="size-3 text-slate-400" /> Ciclo:
                </span>
                <Select
                  value={cycleId}
                  onValueChange={(val) => {
                    const next = val === "none" ? "" : val;
                    setCycleId(next);
                    handleUpdateField({ cycle_id: next || null });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-slate-50/50 border-slate-200 text-xs">
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
              <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 font-medium shrink-0 w-28 flex items-center gap-1.5">
                  <UserIcon className="size-3 text-slate-400" /> Responsable:
                </span>
                <Select
                  value={leadId}
                  onValueChange={(val) => {
                    const next = val === "none" ? "" : val;
                    setLeadId(next);
                    handleUpdateField({ lead_id: next || null });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-slate-50/50 border-slate-200 text-xs">
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
              <div className="flex items-center justify-between gap-3 p-2 bg-white rounded-lg border border-slate-200/70 shadow-2xs">
                <span className="text-slate-500 font-medium shrink-0 w-28 flex items-center gap-1.5">
                  <LayoutGrid className="size-3 text-slate-400" /> Módulo:
                </span>
                <Select
                  value={moduleId}
                  onValueChange={(val) => {
                    const next = val === "none" ? "" : val;
                    setModuleId(next);
                    handleUpdateField({ module_id: next || null });
                  }}
                >
                  <SelectTrigger className="h-8 flex-1 bg-slate-50/50 border-slate-200 text-xs">
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
                  <Label className="font-semibold text-slate-700">
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
                          onClick={() => {
                            const next = isSelected ? "" : val;
                            setEstimateValue(next);
                            handleUpdateField({
                              estimate_value: next || null,
                              estimate_points: next ? Number(next) : null,
                            });
                          }}
                          className={cn(
                            "px-3 py-1 text-xs font-semibold rounded-lg border transition-all cursor-pointer",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
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
                          onClick={() => {
                            const next = isSelected ? "" : val;
                            setEstimateValue(next);
                            handleUpdateField({ estimate_value: next || null });
                          }}
                          className={cn(
                            "px-3.5 py-1 text-xs font-bold rounded-lg border transition-all cursor-pointer",
                            isSelected
                              ? "bg-indigo-600 text-white border-indigo-600 shadow-xs"
                              : "bg-white text-slate-700 border-slate-200 hover:border-indigo-300 hover:bg-slate-50"
                          )}
                        >
                          {val}
                        </button>
                      );
                    })}
                  </div>
                )}

                {estimateSystem === "NUMERIC" && (
                  <Input
                    type="number"
                    min={0}
                    value={estimateValue}
                    onChange={(e) => {
                      setEstimateValue(e.target.value);
                      handleUpdateField({
                        estimate_points: e.target.value ? Number(e.target.value) : null,
                        estimate_value: e.target.value || null,
                      });
                    }}
                    placeholder="Valor numérico de estimación..."
                  />
                )}
              </div>
            )}

            {/* Tabs for Sub-items, Relations, and Conversation */}
            <Tabs defaultValue="subitems" className="w-full">
              <TabsList className="grid grid-cols-3 bg-slate-100">
                <TabsTrigger value="subitems" className="text-xs">
                  Subtareas ({item.sub_items?.length ?? 0})
                </TabsTrigger>
                <TabsTrigger value="relations" className="text-xs">
                  Relaciones ({(item.outward_relations?.length ?? 0) + (item.inward_relations?.length ?? 0)})
                </TabsTrigger>
                <TabsTrigger value="activity" className="text-xs">
                  Conversación & Actividad
                </TabsTrigger>
              </TabsList>

              {/* Sub-items Tab */}
              <TabsContent value="subitems" className="space-y-3 pt-3">
                <form onSubmit={handleCreateSubItem} className="flex gap-2">
                  <Input
                    placeholder="Escribe el título de una subtarea..."
                    value={newSubItemTitle}
                    onChange={(e) => setNewSubItemTitle(e.target.value)}
                    className="text-xs h-8"
                  />
                  <Button
                    type="submit"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white h-8 shrink-0"
                    disabled={isCreatingSubItem}
                  >
                    <Plus className="size-3.5 mr-1" />
                    Agregar
                  </Button>
                </form>

                <div className="space-y-1.5">
                  {!item.sub_items || item.sub_items.length === 0 ? (
                    <p className="text-xs text-slate-400 italic py-3 text-center">
                      No hay subtareas registradas.
                    </p>
                  ) : (
                    item.sub_items.map((sub) => (
                      <div
                        key={sub.id}
                        className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                      >
                        <div className="flex items-center gap-2 min-w-0">
                          <span className="font-mono text-[10px] text-slate-400 font-semibold">
                            {sub.identifier}
                          </span>
                          <span className="font-medium text-slate-800 truncate">{sub.title}</span>
                        </div>
                        {sub.state && (
                          <span
                            className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                            style={{
                              backgroundColor: `${sub.state.color}15`,
                              color: sub.state.color,
                            }}
                          >
                            {sub.state.name}
                          </span>
                        )}
                      </div>
                    ))
                  )}
                </div>
              </TabsContent>

              {/* Relations Tab */}
              <TabsContent value="relations" className="space-y-3 pt-3">
                <form onSubmit={handleAddRelation} className="grid grid-cols-1 sm:grid-cols-3 gap-2">
                  <Select value={relationType} onValueChange={setRelationType}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="BLOCKS">Bloquea a</SelectItem>
                      <SelectItem value="BLOCKED_BY">Es bloqueado por</SelectItem>
                      <SelectItem value="RELATES_TO">Relacionado con</SelectItem>
                      <SelectItem value="DUPLICATE_OF">Duplicado de</SelectItem>
                    </SelectContent>
                  </Select>

                  <Select value={relationTargetId} onValueChange={setRelationTargetId}>
                    <SelectTrigger className="h-8 text-xs bg-slate-50">
                      <SelectValue placeholder="Seleccionar item" />
                    </SelectTrigger>
                    <SelectContent>
                      {availableItems
                        .filter((i) => String(i.id) !== String(item.id))
                        .map((i) => (
                          <SelectItem key={i.id} value={String(i.id)}>
                            {i.identifier} - {i.title.substring(0, 24)}
                          </SelectItem>
                        ))}
                    </SelectContent>
                  </Select>

                  <Button
                    type="submit"
                    size="sm"
                    className="bg-indigo-600 hover:bg-indigo-500 text-white h-8"
                    disabled={isAddingRelation || !relationTargetId}
                  >
                    Vincular
                  </Button>
                </form>

                {/* List of relations */}
                <div className="space-y-1.5">
                  {item.outward_relations?.map((rel) => (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-indigo-700 bg-indigo-50 px-1.5 py-0.5 rounded text-[10px]">
                          {rel.relation_type === "BLOCKS" ? "Bloquea a" : "Relacionado con"}
                        </span>
                        <span className="font-mono text-slate-500 font-semibold">{rel.target?.identifier}</span>
                        <span className="text-slate-800 truncate">{rel.target?.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRelation(rel.id)}
                        className="size-6 text-slate-300 hover:text-red-600"
                      >
                        <Trash2 className="size-3" />
                      </Button>
                    </div>
                  ))}

                  {item.inward_relations?.map((rel) => (
                    <div
                      key={rel.id}
                      className="flex items-center justify-between p-2 rounded-lg bg-slate-50 border border-slate-100 text-xs"
                    >
                      <div className="flex items-center gap-2">
                        <span className="font-semibold text-amber-700 bg-amber-50 px-1.5 py-0.5 rounded text-[10px]">
                          {rel.relation_type === "BLOCKS" ? "Bloqueado por" : "Relacionado con"}
                        </span>
                        <span className="font-mono text-slate-500 font-semibold">{rel.source?.identifier}</span>
                        <span className="text-slate-800 truncate">{rel.source?.title}</span>
                      </div>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDeleteRelation(rel.id)}
                        className="size-6 text-slate-300 hover:text-red-600"
                      >
                        <Trash2 className="size-3" />
                      </Button>
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
                  projectId={project?.id}
                />
              </TabsContent>
            </Tabs>
          </>
        )}
      </SheetContent>
    </Sheet>
  );
}
