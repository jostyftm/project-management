"use client";
import React, { useState } from "react";
import { cn } from "@/lib/utils";
import BaseIcon from "@/components/ui/base-icon";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Skeleton } from "@/components/ui/skeleton";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@/components/ui/collapsible";
import { useModalActionStore } from "@/hooks/zustand/use-modal-action-store";
import { ReportCategory } from "@/types/report-category-type";
import { ModalsNameCategory } from "../../constants/category-constants";
import { useListCategoryChildren } from "../../hooks/use-list-category-children";
import useDebounce from "@/hooks/use-debounce";
import CategoryTreeNodeRecursive from "./CategoryTreeNode";
import PermissionGuard from "@/components/common/permision-guard/permission-guard";

interface Props {
  category: ReportCategory;
  depth: number;
}

const CategoryTreeNodeView = ({ category, depth }: Props) => {
  const [open, setOpen] = useState(depth === 0);
  const [childSearch, setChildSearch] = useState("");
  const [childPage, setChildPage] = useState(1);
  const debouncedChildSearch = useDebounce(childSearch, 300);
  const openModal = useModalActionStore((state) => state.openModal);

  const hasChildren = category.relationships.children_count > 0;

  const {
    data: children,
    meta,
    isLoading,
  } = useListCategoryChildren(
    category.id,
    open,
    {
      filter: debouncedChildSearch ? { name: debouncedChildSearch } : {},
      page: childPage,
    }
  );

  const goToPage = (page: number) => {
    if (page >= 1 && page <= (meta?.last_page ?? 1)) {
      setChildPage(page);
    }
  };

  return (
    <Collapsible open={open} onOpenChange={setOpen} className="w-full">
      <div
        className="group flex items-center gap-1 rounded-md py-1.5 pr-2 pl-1 transition-colors hover:bg-slate-100"
        style={{ paddingLeft: `${depth * 20 + 4}px` }}
      >
        {hasChildren ? (
          <CollapsibleTrigger asChild>
            <Button
              variant="ghost"
              className="h-6 w-6 p-0 cursor-pointer"
              type="button"
            >
              <BaseIcon
                name="ChevronDown"
                size={16}
                className={cn(
                  "transition-transform duration-200",
                  open ? "rotate-180" : "rotate-0"
                )}
              />
            </Button>
          </CollapsibleTrigger>
        ) : (
          <span className="inline-block h-6 w-6" />
        )}

        <BaseIcon
          name={hasChildren ? "Folder" : "FileText"}
          size={16}
          className="shrink-0 text-slate-400"
        />

        <span className="flex-1 truncate text-sm font-medium">
          {category.attributes.name}
        </span>

        {hasChildren && (
          <span className="text-xs text-slate-400">
            {category.relationships.children_count}
          </span>
        )}

        <div className="flex items-center gap-0 opacity-0 transition-opacity group-hover:opacity-100">
          <PermissionGuard action="create">
            <Button
              variant="ghost"
              className="h-7 w-7 p-0 cursor-pointer"
              type="button"
              onClick={() =>
                openModal("create", ModalsNameCategory.createCategory, {
                  parent: category,
                })
              }
              title="Agregar subcategoría"
            >
              <BaseIcon name="FolderPlus" size={15} />
            </Button>
          </PermissionGuard>

          <PermissionGuard action="update">
            <Button
              variant="ghost"
              className="h-7 w-7 p-0 cursor-pointer"
              type="button"
              onClick={() =>
                openModal("update", ModalsNameCategory.updateCategory, category)
              }
              title="Editar"
            >
              <BaseIcon name="Pencil" size={15} />
            </Button>
          </PermissionGuard>

          <PermissionGuard action="delete">
            <Button
              variant="ghost"
              className="h-7 w-7 p-0 cursor-pointer text-red-500 hover:text-red-600"
              type="button"
              onClick={() =>
                openModal("delete", ModalsNameCategory.deleteCategory, category)
              }
              title="Eliminar"
            >
              <BaseIcon name="Trash2" size={15} />
            </Button>
          </PermissionGuard>
        </div>
      </div>

      {hasChildren && (
        <CollapsibleContent>
          <div className="relative ml-6 border-l border-slate-200 pl-1">
            <div className="px-2 py-1">
              <div className="relative">
                <BaseIcon
                  name="Search"
                  size={14}
                  className="pointer-events-none absolute left-2 top-1/2 -translate-y-1/2 text-slate-400"
                />
                <Input
                  value={childSearch}
                  onChange={(e) => {
                    setChildSearch(e.target.value);
                    setChildPage(1);
                  }}
                  className="h-8 pl-7 text-sm"
                  placeholder={`Buscar en "${category.attributes.name}"...`}
                />
              </div>
            </div>

            <div className="flex flex-col gap-0.5">
              {isLoading && !children.length ? (
                <div className="space-y-1 p-1">
                  {Array.from({ length: 2 }).map((_, i) => (
                    <Skeleton key={i} className="h-5 w-full" />
                  ))}
                </div>
              ) : children.length > 0 ? (
                children.map((child) => (
                  <CategoryTreeNodeRecursive
                    key={child.id}
                    category={child}
                    depth={depth + 1}
                  />
                ))
              ) : (
                <p className="py-2 px-2 text-sm text-muted-foreground">
                  No hay categorías.
                </p>
              )}
            </div>

            {meta && meta.last_page > 1 && (
              <div className="flex items-center gap-1 px-2 py-1">
                <Button
                  variant="ghost"
                  className="h-7 w-7 p-0 cursor-pointer"
                  type="button"
                  disabled={childPage <= 1 || isLoading}
                  onClick={() => goToPage(childPage - 1)}
                >
                  <BaseIcon name="ChevronLeft" size={15} />
                </Button>
                <span className="text-xs text-slate-500 px-1">
                  {childPage} / {meta.last_page}
                </span>
                <Button
                  variant="ghost"
                  className="h-7 w-7 p-0 cursor-pointer"
                  type="button"
                  disabled={childPage >= meta.last_page || isLoading}
                  onClick={() => goToPage(childPage + 1)}
                >
                  <BaseIcon name="ChevronRight" size={15} />
                </Button>
              </div>
            )}
          </div>
        </CollapsibleContent>
      )}
    </Collapsible>
  );
};

export default CategoryTreeNodeView;