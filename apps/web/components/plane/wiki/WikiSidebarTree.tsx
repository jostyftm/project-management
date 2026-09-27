"use client";

import React, { useState, useEffect } from "react";
import Link from "next/link";
import { PageTreeNode } from "@/types/plane-types";
import { pageService } from "@/services/plane/pageService";
import { Button } from "@/components/ui/button";
import {
  ChevronRight,
  ChevronDown,
  FileText,
  Plus,
  Lock,
  Globe,
  Loader2,
  FolderOpen,
} from "lucide-react";
import { cn } from "@/lib/utils";

interface WikiSidebarTreeProps {
  activePageId?: string | number;
  projectId?: string | number;
  onPageCreated?: (newPageId: string | number) => void;
}

function TreeNode({
  node,
  activePageId,
  level = 0,
  onAddSubpage,
}: {
  node: PageTreeNode;
  activePageId?: string | number;
  level?: number;
  onAddSubpage: (parentId: string | number) => void;
}) {
  const [isOpen, setIsOpen] = useState(true);
  const hasChildren = node.children && node.children.length > 0;
  const isActive = String(node.id) === String(activePageId);

  return (
    <div className="space-y-0.5">
      <div
        className={cn(
          "group flex items-center justify-between py-1.5 px-2 rounded-lg text-xs transition-colors cursor-pointer",
          isActive
            ? "bg-indigo-50 text-indigo-700 font-semibold"
            : "text-slate-600 hover:bg-slate-100/80 hover:text-slate-900"
        )}
        style={{ paddingLeft: `${Math.max(8, level * 16 + 8)}px` }}
      >
        <div className="flex items-center gap-1.5 min-w-0 flex-1">
          {hasChildren ? (
            <button
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                setIsOpen(!isOpen);
              }}
              className="p-0.5 text-slate-400 hover:text-slate-600 rounded"
            >
              {isOpen ? <ChevronDown className="size-3" /> : <ChevronRight className="size-3" />}
            </button>
          ) : (
            <span className="size-4 shrink-0 flex items-center justify-center text-slate-400">
              {node.icon || <FileText className="size-3.5" />}
            </span>
          )}

          <Link href={`/pages/${node.id}`} className="truncate flex-1">
            <span className="truncate">{node.title || "Sin título"}</span>
          </Link>
        </div>

        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity shrink-0">
          {node.is_locked && (
            <span title="Página bloqueada">
              <Lock className="size-3 text-slate-400" />
            </span>
          )}
          {node.is_published && (
            <span title="Publicada">
              <Globe className="size-3 text-emerald-500" />
            </span>
          )}
          <Button
            variant="ghost"
            size="icon"
            onClick={(e) => {
              e.stopPropagation();
              onAddSubpage(node.id);
            }}
            className="size-5 text-slate-400 hover:text-indigo-600 cursor-pointer"
            title="Añadir subpágina"
          >
            <Plus className="size-3" />
          </Button>
        </div>
      </div>

      {hasChildren && isOpen && (
        <div className="space-y-0.5">
          {node.children!.map((child) => (
            <TreeNode
              key={child.id}
              node={child}
              activePageId={activePageId}
              level={level + 1}
              onAddSubpage={onAddSubpage}
            />
          ))}
        </div>
      )}
    </div>
  );
}

export function WikiSidebarTree({ activePageId, projectId, onPageCreated }: WikiSidebarTreeProps) {
  const [tree, setTree] = useState<PageTreeNode[]>([]);
  const [loading, setLoading] = useState(true);

  const fetchTree = async () => {
    try {
      setLoading(true);
      const data = await pageService.getTree(projectId);
      setTree(data);
    } catch (err) {
      console.error("Error loading wiki tree:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchTree();
  }, [projectId]);

  const handleCreateSubpage = async (parentId?: string | number) => {
    try {
      const created = await pageService.create({
        title: "Nueva subpágina",
        parent_id: parentId || null,
        project_id: projectId || null,
      });
      await fetchTree();
      if (onPageCreated) {
        onPageCreated(created.id);
      }
    } catch (err) {
      console.error("Error creating subpage:", err);
    }
  };

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-between px-2 py-1">
        <div className="flex items-center gap-1.5 text-xs font-semibold text-slate-500 uppercase tracking-wider">
          <FolderOpen className="size-3.5 text-indigo-600" />
          <span>Árbol de Wiki</span>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={() => handleCreateSubpage()}
          className="size-5 text-slate-400 hover:text-indigo-600 cursor-pointer"
          title="Nueva página raíz"
        >
          <Plus className="size-3.5" />
        </Button>
      </div>

      {loading ? (
        <div className="flex items-center justify-center py-6 text-slate-400">
          <Loader2 className="size-4 animate-spin mr-2" />
          <span className="text-xs">Cargando árbol...</span>
        </div>
      ) : tree.length === 0 ? (
        <div className="p-3 text-center border border-dashed border-slate-200 rounded-lg text-xs text-slate-400">
          No hay páginas en esta wiki. Haz clic en "+" para crear la primera.
        </div>
      ) : (
        <div className="space-y-0.5 max-h-[calc(100vh-20rem)] overflow-y-auto">
          {tree.map((node) => (
            <TreeNode
              key={node.id}
              node={node}
              activePageId={activePageId}
              level={0}
              onAddSubpage={(pId) => handleCreateSubpage(pId)}
            />
          ))}
        </div>
      )}
    </div>
  );
}
