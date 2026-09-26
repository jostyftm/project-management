"use client";

import React, { useMemo, useState, useEffect } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import BaseIcon from "@/components/ui/base-icon";
import { Input } from "@/components/ui/input";
import { cn } from "@/lib/utils";
import { ReportCategory } from "@/types/report-category-type";

export interface CategoryTreeSelectProps {
  categories: ReportCategory[];
  value?: string | number | null;
  onChange: (value: string | null) => void;
  placeholder?: string;
  disabled?: boolean;
}

interface TreeNodeProps {
  category: ReportCategory;
  depth: number;
  expandedIds: Set<number>;
  onToggle: (id: number) => void;
  onSelect: (category: ReportCategory) => void;
  selectedId: number | null;
  childrenMap: Map<number, ReportCategory[]>;
  search: string;
  matchingAncestors: Set<number>;
  matchSet: Set<number>;
}

const TreeNode = ({
  category,
  depth,
  expandedIds,
  onToggle,
  onSelect,
  selectedId,
  childrenMap,
  search,
  matchingAncestors,
  matchSet,
}: TreeNodeProps) => {
  const allChildren = childrenMap.get(category.id) ?? [];
  const hasSearch = Boolean(search.trim());

  const visibleChildren = useMemo(() => {
    if (!hasSearch) return allChildren;
    return allChildren.filter(
      (c) => matchSet.has(c.id) || matchingAncestors.has(c.id)
    );
  }, [allChildren, hasSearch, matchSet, matchingAncestors]);

  const hasChildren = (hasSearch ? visibleChildren : allChildren).length > 0;
  const isExpanded =
    expandedIds.has(category.id) ||
    (hasSearch && matchingAncestors.has(category.id));
  const isSelected = selectedId === category.id;

  return (
    <div className="w-full">
      <div
        className={cn(
          "group flex items-center gap-1.5 rounded-md px-1.5 py-1 text-xs transition-colors hover:bg-slate-100 cursor-pointer select-none",
          isSelected && "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
        )}
        style={{ paddingLeft: `${depth * 14 + 4}px` }}
        onClick={() => onSelect(category)}
      >
        {/* Toggle para desplegar/colapsar si tiene hijos */}
        {hasChildren ? (
          <button
            type="button"
            className="flex h-5 w-5 items-center justify-center rounded hover:bg-slate-200/80 text-slate-500 transition-colors shrink-0"
            onClick={(e) => {
              e.stopPropagation();
              onToggle(category.id);
            }}
            title={isExpanded ? "Colapsar" : "Desplegar"}
          >
            <BaseIcon
              name={isExpanded ? "ChevronDown" : "ChevronRight"}
              size={13}
            />
          </button>
        ) : (
          <span className="w-5 h-5 shrink-0" />
        )}

        {/* Icono de carpeta o archivo */}
        <BaseIcon
          name={hasChildren ? (isExpanded ? "FolderOpen" : "Folder") : "FileText"}
          size={14}
          className={cn(
            "shrink-0",
            hasChildren
              ? isExpanded
                ? "text-amber-500"
                : "text-amber-600/80"
              : "text-slate-400"
          )}
        />

        {/* Nombre de la categoría */}
        <span className="flex-1 truncate">{category.attributes.name}</span>

        {/* Contador de subcategorías */}
        {allChildren.length > 0 && (
          <span className="text-[10px] text-slate-400 shrink-0 font-normal px-1 py-0.2 rounded bg-slate-100">
            {allChildren.length}
          </span>
        )}

        {/* Check si está seleccionada */}
        {isSelected && (
          <BaseIcon name="Check" size={13} className="text-primary shrink-0 ml-1" />
        )}
      </div>

      {/* Renderizado recursivo de hijos */}
      {hasChildren && isExpanded && (
        <div className="relative border-l border-slate-200 ml-3 pl-0.5 space-y-0.5">
          {visibleChildren.map((child) => (
            <TreeNode
              key={child.id}
              category={child}
              depth={depth + 1}
              expandedIds={expandedIds}
              onToggle={onToggle}
              onSelect={onSelect}
              selectedId={selectedId}
              childrenMap={childrenMap}
              search={search}
              matchingAncestors={matchingAncestors}
              matchSet={matchSet}
            />
          ))}
        </div>
      )}
    </div>
  );
};

export const CategoryTreeSelect = ({
  categories,
  value,
  onChange,
  placeholder = "Selecciona una categoría",
  disabled = false,
}: CategoryTreeSelectProps) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [expandedIds, setExpandedIds] = useState<Set<number>>(() => new Set());

  // Mapa id -> categoría
  const categoryMap = useMemo(
    () => new Map<number, ReportCategory>(categories.map((c) => [c.id, c])),
    [categories]
  );

  // Mapa parent_id -> lista de hijos
  const childrenMap = useMemo(() => {
    const map = new Map<number, ReportCategory[]>();
    for (const cat of categories) {
      const pId = cat.relationships.parent_id;
      if (pId !== null) {
        const list = map.get(pId) ?? [];
        list.push(cat);
        map.set(pId, list);
      }
    }
    map.forEach((list) =>
      list.sort((a, b) => a.attributes.name.localeCompare(b.attributes.name))
    );
    return map;
  }, [categories]);

  // Categorías raíz (padres sin parent_id o cuyo padre no está en la lista)
  const rootCategories = useMemo(() => {
    return categories
      .filter(
        (c) =>
          c.relationships.parent_id === null ||
          !categoryMap.has(c.relationships.parent_id)
      )
      .sort((a, b) => a.attributes.name.localeCompare(b.attributes.name));
  }, [categories, categoryMap]);

  // Obtener lista de ancestros de una categoría
  const getAncestors = (catId: number): number[] => {
    const ancestors: number[] = [];
    let curr = categoryMap.get(catId);
    while (curr && curr.relationships.parent_id !== null) {
      const pId = curr.relationships.parent_id;
      ancestors.push(pId);
      curr = categoryMap.get(pId);
    }
    return ancestors;
  };

  // Categoría seleccionada actual
  const selectedId = value ? Number(value) : null;
  const selectedCategory = selectedId ? categoryMap.get(selectedId) : null;

  // Ruta completa (breadcrumb) para contexto visual
  const selectedPath = useMemo(() => {
    if (!selectedCategory) return "";
    const chain: string[] = [selectedCategory.attributes.name];
    let curr = selectedCategory;
    while (curr && curr.relationships.parent_id !== null) {
      const parent = categoryMap.get(curr.relationships.parent_id);
      if (parent) {
        chain.unshift(parent.attributes.name);
        curr = parent;
      } else {
        break;
      }
    }
    return chain.join(" > ");
  }, [selectedCategory, categoryMap]);

  // Auto-expandir los ancestros de la categoría seleccionada cuando cambie o se abra
  useEffect(() => {
    if (selectedId) {
      const ancestors = getAncestors(selectedId);
      if (ancestors.length > 0) {
        setExpandedIds((prev) => {
          const next = new Set(prev);
          ancestors.forEach((id) => next.add(id));
          return next;
        });
      }
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedId, open]);

  // Búsqueda en el árbol
  const { filteredRoots, matchingAncestors, matchSet } = useMemo(() => {
    if (!search.trim()) {
      return {
        filteredRoots: rootCategories,
        matchingAncestors: new Set<number>(),
        matchSet: new Set<number>(),
      };
    }
    const term = search.toLowerCase();
    const matches = new Set<number>();
    const ancestors = new Set<number>();

    for (const cat of categories) {
      if (cat.attributes.name.toLowerCase().includes(term)) {
        matches.add(cat.id);
        getAncestors(cat.id).forEach((aId) => ancestors.add(aId));
      }
    }

    const roots = rootCategories.filter(
      (r) => matches.has(r.id) || ancestors.has(r.id)
    );
    return {
      filteredRoots: roots,
      matchingAncestors: ancestors,
      matchSet: matches,
    };
  }, [search, categories, rootCategories, categoryMap]);

  const handleToggle = (id: number) => {
    setExpandedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const handleSelect = (cat: ReportCategory) => {
    onChange(String(cat.id));
    setOpen(false);
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange(null);
  };

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          disabled={disabled}
          className={cn(
            "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-sm shadow-xs transition-colors hover:bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50",
            !selectedCategory && "text-muted-foreground"
          )}
        >
          <div className="flex items-center gap-2 truncate text-left min-w-0">
            <BaseIcon
              name={selectedCategory ? "Folder" : "FolderTree"}
              size={15}
              className={
                selectedCategory ? "text-amber-500 shrink-0" : "text-slate-400 shrink-0"
              }
            />
            <span className="truncate">
              {selectedCategory ? selectedCategory.attributes.name : placeholder}
            </span>
            {selectedCategory && (
              <span className="text-[11px] text-muted-foreground hidden sm:inline truncate max-w-[160px]">
                ({selectedPath})
              </span>
            )}
          </div>

          <div className="flex items-center gap-1 shrink-0 ml-2">
            {selectedCategory && !disabled && (
              <span
                role="button"
                tabIndex={0}
                onClick={handleClear}
                className="rounded p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                title="Quitar categoría"
              >
                <BaseIcon name="X" size={14} />
              </span>
            )}
            <BaseIcon name="ChevronDown" size={15} className="text-slate-400" />
          </div>
        </button>
      </PopoverTrigger>

      <PopoverContent
        className="w-(--radix-popover-trigger-width) min-w-[320px] max-w-[420px] p-2"
        align="start"
      >
        {/* Campo de búsqueda */}
        <div className="relative mb-2">
          <BaseIcon
            name="Search"
            size={13}
            className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 text-muted-foreground"
          />
          <Input
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar categoría..."
            className="h-8 pl-8 pr-7 text-xs"
          />
          {search && (
            <button
              type="button"
              onClick={() => setSearch("")}
              className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
            >
              <BaseIcon name="X" size={12} />
            </button>
          )}
        </div>

        {/* Opción "Sin categoría" */}
        <button
          type="button"
          onClick={() => {
            onChange(null);
            setOpen(false);
          }}
          className={cn(
            "w-full flex items-center gap-2 rounded-md px-2 py-1.5 text-xs text-left transition-colors hover:bg-slate-100 cursor-pointer select-none",
            !selectedCategory ? "text-primary font-semibold bg-primary/5" : "text-muted-foreground"
          )}
        >
          <BaseIcon name="Ban" size={13} />
          <span>Ninguna (Sin categoría)</span>
          {!selectedCategory && (
            <BaseIcon name="Check" size={13} className="ml-auto text-primary" />
          )}
        </button>

        <div className="my-1.5 h-px bg-border" />

        {/* Lista jerárquica con scroll */}
        <div className="max-h-60 overflow-y-auto overflow-x-hidden space-y-0.5 pr-1">
          {filteredRoots.length === 0 ? (
            <p className="text-xs text-center py-4 text-muted-foreground italic">
              No se encontraron categorías
            </p>
          ) : (
            filteredRoots.map((root) => (
              <TreeNode
                key={root.id}
                category={root}
                depth={0}
                expandedIds={expandedIds}
                onToggle={handleToggle}
                onSelect={handleSelect}
                selectedId={selectedId}
                childrenMap={childrenMap}
                search={search}
                matchingAncestors={matchingAncestors}
                matchSet={matchSet}
              />
            ))
          )}
        </div>
      </PopoverContent>
    </Popover>
  );
};
