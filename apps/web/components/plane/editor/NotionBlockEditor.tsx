"use client";

import React, { useState, useRef, useEffect, useCallback } from "react";
import { DocBlock, DocBlockType } from "@/types/plane-types";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import {
  Heading1,
  Heading2,
  Heading3,
  Type,
  List,
  ListOrdered,
  CheckSquare,
  AlertCircle,
  Code2,
  Table as TableIcon,
  Quote,
  Minus,
  GripVertical,
  Plus,
  Trash2,
  Copy,
  Check,
  ChevronUp,
  ChevronDown,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { copyToClipboard } from "@/lib/clipboard";

interface NotionBlockEditorProps {
  blocks: DocBlock[];
  onChange: (blocks: DocBlock[]) => void;
  isLocked?: boolean;
}

interface SlashCommandItem {
  type: DocBlockType;
  label: string;
  description: string;
  icon: React.ReactNode;
  keywords: string[];
}

const COMMAND_ITEMS: SlashCommandItem[] = [
  {
    type: "paragraph",
    label: "Texto",
    description: "Texto normal de párrafo",
    icon: <Type className="size-4 text-slate-600" />,
    keywords: ["texto", "parrafo", "p", "text", "paragraph"],
  },
  {
    type: "heading_1",
    label: "Encabezado 1",
    description: "Título de sección principal",
    icon: <Heading1 className="size-4 text-indigo-600" />,
    keywords: ["h1", "encabezado1", "titulo1", "heading1", "header1"],
  },
  {
    type: "heading_2",
    label: "Encabezado 2",
    description: "Subtítulo de sección",
    icon: <Heading2 className="size-4 text-indigo-500" />,
    keywords: ["h2", "encabezado2", "titulo2", "heading2", "header2"],
  },
  {
    type: "heading_3",
    label: "Encabezado 3",
    description: "Encabezado menor o acápite",
    icon: <Heading3 className="size-4 text-indigo-400" />,
    keywords: ["h3", "encabezado3", "titulo3", "heading3", "header3"],
  },
  {
    type: "todo",
    label: "Lista de Tareas (To-Do)",
    description: "Casilla de verificación interactiva",
    icon: <CheckSquare className="size-4 text-emerald-600" />,
    keywords: ["todo", "tarea", "checklist", "check", "task"],
  },
  {
    type: "bullet_list",
    label: "Lista con Viñetas",
    description: "Lista desordenada de puntos",
    icon: <List className="size-4 text-slate-600" />,
    keywords: ["lista", "puntos", "bullet", "ul"],
  },
  {
    type: "numbered_list",
    label: "Lista Numerada",
    description: "Lista ordenada secuencial",
    icon: <ListOrdered className="size-4 text-slate-600" />,
    keywords: ["numerada", "ordenada", "ol", "numbers"],
  },
  {
    type: "callout",
    label: "Nota Destacada (Callout)",
    description: "Caja de alerta o nota resaltada",
    icon: <AlertCircle className="size-4 text-amber-500" />,
    keywords: ["callout", "nota", "alerta", "aviso", "tip", "info"],
  },
  {
    type: "code",
    label: "Bloque de Código",
    description: "Bloque monoespaciado con resaltado",
    icon: <Code2 className="size-4 text-purple-600" />,
    keywords: ["codigo", "code", "snippet", "pre"],
  },
  {
    type: "table",
    label: "Tabla",
    description: "Estructura de filas y columnas",
    icon: <TableIcon className="size-4 text-blue-600" />,
    keywords: ["tabla", "table", "grid", "matriz"],
  },
  {
    type: "quote",
    label: "Cita",
    description: "Cita textual resaltada",
    icon: <Quote className="size-4 text-slate-500" />,
    keywords: ["cita", "quote", "blockquote"],
  },
  {
    type: "divider",
    label: "Separador",
    description: "Línea horizontal divisoria",
    icon: <Minus className="size-4 text-slate-400" />,
    keywords: ["separador", "divider", "linea", "hr"],
  },
];

const sanitizeBlocks = (blks?: DocBlock[]): DocBlock[] => {
  if (!blks || blks.length === 0) {
    return [{ id: "b-init", type: "paragraph", content: "" }];
  }
  return blks.map((b) => ({
    ...b,
    content: b?.content ?? "",
  }));
};

export function NotionBlockEditor({ blocks, onChange, isLocked = false }: NotionBlockEditorProps) {
  const [internalBlocks, setInternalBlocks] = useState<DocBlock[]>(() => {
    return sanitizeBlocks(blocks);
  });

  // Slash menu state
  const [activeSlashIndex, setActiveSlashIndex] = useState<number | null>(null);
  const [slashSearch, setSlashSearch] = useState<string>("");
  const [selectedSlashItemIndex, setSelectedSlashItemIndex] = useState<number>(0);
  const slashMenuRef = useRef<HTMLDivElement>(null);

  // Sync internal state with external blocks prop
  useEffect(() => {
    if (blocks && blocks.length > 0) {
      setInternalBlocks(sanitizeBlocks(blocks));
    }
  }, [blocks]);

  const updateBlocks = useCallback(
    (newBlocks: DocBlock[]) => {
      setInternalBlocks(newBlocks);
      onChange(newBlocks);
    },
    [onChange]
  );

  const handleContentChange = (index: number, content: string) => {
    const updated = [...internalBlocks];
    updated[index] = { ...updated[index], content };
    updateBlocks(updated);

    // Check if user just typed slash
    if (content === "/" || content.endsWith(" /")) {
      setActiveSlashIndex(index);
      setSlashSearch("");
      setSelectedSlashItemIndex(0);
    } else if (activeSlashIndex === index) {
      const match = content.match(/\/([a-zA-Z0-9_-]*)$/);
      if (match) {
        setSlashSearch(match[1]);
      } else {
        setActiveSlashIndex(null);
      }
    }
  };

  const handleConvertBlockType = (index: number, newType: DocBlockType) => {
    const updated = [...internalBlocks];
    const current = updated[index];
    // Remove the slash query from content
    const cleanContent = current.content.replace(/\/([a-zA-Z0-9_-]*)$/, "").trim();

    let extra: Partial<DocBlock> = {};
    if (newType === "callout") {
      extra = { calloutTone: "info" };
    } else if (newType === "code") {
      extra = { language: "typescript" };
    } else if (newType === "table") {
      extra = {
        tableData: [
          ["Encabezado 1", "Encabezado 2", "Encabezado 3"],
          ["Dato 1", "Dato 2", "Dato 3"],
        ],
      };
    } else if (newType === "todo") {
      extra = { checked: false };
    }

    updated[index] = {
      ...current,
      type: newType,
      content: cleanContent,
      ...extra,
    };

    updateBlocks(updated);
    setActiveSlashIndex(null);
    setSlashSearch("");
  };

  const handleKeyDown = (e: React.KeyboardEvent, index: number) => {
    if (isLocked) return;

    // Handle Slash Menu Navigation
    if (activeSlashIndex !== null && filteredCommands.length > 0) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedSlashItemIndex((prev) => (prev + 1) % filteredCommands.length);
        return;
      }
      if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedSlashItemIndex((prev) => (prev - 1 + filteredCommands.length) % filteredCommands.length);
        return;
      }
      if (e.key === "Enter") {
        e.preventDefault();
        const selected = filteredCommands[selectedSlashItemIndex];
        if (selected) {
          handleConvertBlockType(activeSlashIndex, selected.type);
        }
        return;
      }
      if (e.key === "Escape") {
        e.preventDefault();
        setActiveSlashIndex(null);
        return;
      }
    }

    // Normal Block Keyboard Actions
    if (e.key === "Enter" && !e.shiftKey) {
      // Create new paragraph below
      if (internalBlocks[index].type !== "code" && internalBlocks[index].type !== "table") {
        e.preventDefault();
        const newBlock: DocBlock = {
          id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
          type: internalBlocks[index].type === "todo" ? "todo" : "paragraph",
          content: "",
          checked: false,
        };
        const updated = [...internalBlocks];
        updated.splice(index + 1, 0, newBlock);
        updateBlocks(updated);
        // Focus the new block after render
        setTimeout(() => {
          const nextInput = document.getElementById(`block-input-${index + 1}`);
          nextInput?.focus();
        }, 50);
      }
    } else if (e.key === "Backspace" && internalBlocks[index].content === "" && internalBlocks.length > 1) {
      e.preventDefault();
      const updated = internalBlocks.filter((_, i) => i !== index);
      updateBlocks(updated);
      setTimeout(() => {
        const prevInput = document.getElementById(`block-input-${Math.max(0, index - 1)}`);
        prevInput?.focus();
      }, 50);
    }
  };

  const handleAddBlock = (index: number) => {
    if (isLocked) return;
    const newBlock: DocBlock = {
      id: `b-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      type: "paragraph",
      content: "",
    };
    const updated = [...internalBlocks];
    updated.splice(index + 1, 0, newBlock);
    updateBlocks(updated);
  };

  const handleDeleteBlock = (index: number) => {
    if (isLocked || internalBlocks.length <= 1) return;
    const updated = internalBlocks.filter((_, i) => i !== index);
    updateBlocks(updated);
  };

  const handleMoveBlock = (index: number, direction: "up" | "down") => {
    if (isLocked) return;
    const targetIndex = direction === "up" ? index - 1 : index + 1;
    if (targetIndex < 0 || targetIndex >= internalBlocks.length) return;

    const updated = [...internalBlocks];
    const [moved] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, moved);
    updateBlocks(updated);
  };

  // Table Helpers
  const handleTableCellChange = (blockIndex: number, rowIdx: number, colIdx: number, val: string) => {
    const updated = [...internalBlocks];
    const block = updated[blockIndex];
    if (!block.tableData) return;
    const newTable = block.tableData.map((row) => [...row]);
    newTable[rowIdx][colIdx] = val;
    updated[blockIndex] = { ...block, tableData: newTable };
    updateBlocks(updated);
  };

  const handleAddTableRow = (blockIndex: number) => {
    const updated = [...internalBlocks];
    const block = updated[blockIndex];
    if (!block.tableData) return;
    const colCount = block.tableData[0]?.length || 3;
    const newRow = new Array(colCount).fill("");
    updated[blockIndex] = { ...block, tableData: [...block.tableData, newRow] };
    updateBlocks(updated);
  };

  const handleAddTableCol = (blockIndex: number) => {
    const updated = [...internalBlocks];
    const block = updated[blockIndex];
    if (!block.tableData) return;
    const newTable = block.tableData.map((row) => [...row, ""]);
    updated[blockIndex] = { ...block, tableData: newTable };
    updateBlocks(updated);
  };

  // Filter slash commands
  const filteredCommands = COMMAND_ITEMS.filter((item) => {
    if (!slashSearch) return true;
    const q = slashSearch.toLowerCase();
    return (
      item.label.toLowerCase().includes(q) ||
      item.keywords.some((k) => k.toLowerCase().includes(q))
    );
  });

  return (
    <div className="relative w-full space-y-2 py-4">
      {internalBlocks.map((block, index) => {
        const isCurrentSlash = activeSlashIndex === index;

        return (
          <div
            key={block.id}
            className="group relative flex items-start gap-2 rounded-lg hover:bg-slate-50/70 p-1 transition-colors"
          >
            {/* Block Controls (Hover Grips) */}
            {!isLocked && (
              <div className="flex items-center gap-0.5 opacity-0 group-hover:opacity-100 transition-opacity pt-1 select-none shrink-0">
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleAddBlock(index)}
                  className="size-5 text-slate-400 hover:text-indigo-600"
                  title="Insertar bloque debajo"
                >
                  <Plus className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveBlock(index, "up")}
                  disabled={index === 0}
                  className="size-5 text-slate-400 hover:text-slate-700"
                  title="Mover arriba"
                >
                  <ChevronUp className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleMoveBlock(index, "down")}
                  disabled={index === internalBlocks.length - 1}
                  className="size-5 text-slate-400 hover:text-slate-700"
                  title="Mover abajo"
                >
                  <ChevronDown className="size-3" />
                </Button>
                <Button
                  variant="ghost"
                  size="icon"
                  onClick={() => handleDeleteBlock(index)}
                  disabled={internalBlocks.length <= 1}
                  className="size-5 text-slate-400 hover:text-red-600"
                  title="Eliminar bloque"
                >
                  <Trash2 className="size-3" />
                </Button>
              </div>
            )}

            {/* Block Content by Type */}
            <div className="flex-1 min-w-0 relative">
              {block.type === "paragraph" && (
                <Textarea
                  id={`block-input-${index}`}
                  value={block.content ?? ""}
                  disabled={isLocked}
                  placeholder={index === 0 ? "Escribe algo o pulsa '/' para comandos..." : "Escribe o usa '/'..."}
                  onChange={(e) => handleContentChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  rows={1}
                  className="min-h-[36px] resize-none border-0 shadow-none focus-visible:ring-0 text-slate-800 text-sm leading-relaxed p-1 bg-transparent"
                />
              )}

              {block.type === "heading_1" && (
                <Input
                  id={`block-input-${index}`}
                  value={block.content ?? ""}
                  disabled={isLocked}
                  placeholder="Encabezado 1..."
                  onChange={(e) => handleContentChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="border-0 shadow-none focus-visible:ring-0 text-2xl font-bold text-slate-900 p-1 bg-transparent h-auto"
                />
              )}

              {block.type === "heading_2" && (
                <Input
                  id={`block-input-${index}`}
                  value={block.content ?? ""}
                  disabled={isLocked}
                  placeholder="Encabezado 2..."
                  onChange={(e) => handleContentChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="border-0 shadow-none focus-visible:ring-0 text-xl font-bold text-slate-800 p-1 bg-transparent h-auto"
                />
              )}

              {block.type === "heading_3" && (
                <Input
                  id={`block-input-${index}`}
                  value={block.content ?? ""}
                  disabled={isLocked}
                  placeholder="Encabezado 3..."
                  onChange={(e) => handleContentChange(index, e.target.value)}
                  onKeyDown={(e) => handleKeyDown(e, index)}
                  className="border-0 shadow-none focus-visible:ring-0 text-base font-bold text-slate-700 p-1 bg-transparent h-auto"
                />
              )}

              {block.type === "todo" && (
                <div className="flex items-start gap-2 p-1">
                  <input
                    type="checkbox"
                    checked={block.checked || false}
                    disabled={isLocked}
                    onChange={(e) => {
                      const updated = [...internalBlocks];
                      updated[index] = { ...block, checked: e.target.checked };
                      updateBlocks(updated);
                    }}
                    className="mt-1 size-4 rounded border-slate-300 text-indigo-600 focus:ring-indigo-500 cursor-pointer"
                  />
                  <Input
                    id={`block-input-${index}`}
                    value={block.content ?? ""}
                    disabled={isLocked}
                    placeholder="Tarea pendiente..."
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className={cn(
                      "flex-1 border-0 shadow-none focus-visible:ring-0 text-sm p-0 bg-transparent h-auto",
                      block.checked && "line-through text-slate-400"
                    )}
                  />
                </div>
              )}

              {block.type === "bullet_list" && (
                <div className="flex items-start gap-2 p-1">
                  <span className="size-1.5 rounded-full bg-slate-400 mt-2 shrink-0" />
                  <Input
                    id={`block-input-${index}`}
                    value={block.content ?? ""}
                    disabled={isLocked}
                    placeholder="Elemento de lista..."
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm p-0 bg-transparent h-auto"
                  />
                </div>
              )}

              {block.type === "numbered_list" && (
                <div className="flex items-start gap-2 p-1">
                  <span className="font-mono text-xs font-semibold text-slate-400 mt-1 shrink-0">
                    {index + 1}.
                  </span>
                  <Input
                    id={`block-input-${index}`}
                    value={block.content ?? ""}
                    disabled={isLocked}
                    placeholder="Elemento numerado..."
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    className="flex-1 border-0 shadow-none focus-visible:ring-0 text-sm p-0 bg-transparent h-auto"
                  />
                </div>
              )}

              {block.type === "callout" && (
                <div
                  className={cn(
                    "flex items-start gap-3 p-3.5 rounded-xl border",
                    block.calloutTone === "warning"
                      ? "bg-amber-50/70 border-amber-200 text-amber-900"
                      : block.calloutTone === "success"
                      ? "bg-emerald-50/70 border-emerald-200 text-emerald-900"
                      : "bg-indigo-50/70 border-indigo-200 text-indigo-900"
                  )}
                >
                  <AlertCircle className="size-5 shrink-0 mt-0.5 text-indigo-600" />
                  <Textarea
                    id={`block-input-${index}`}
                    value={block.content ?? ""}
                    disabled={isLocked}
                    placeholder="Escribe una nota importante o alerta..."
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    rows={2}
                    className="flex-1 resize-none border-0 shadow-none focus-visible:ring-0 text-sm p-0 bg-transparent leading-relaxed"
                  />
                </div>
              )}

              {block.type === "code" && (
                <div className="rounded-xl border border-slate-800 bg-slate-900 p-3 text-slate-100 font-mono text-xs">
                  <div className="flex items-center justify-between pb-2 mb-2 border-b border-slate-800">
                    <span className="text-[11px] text-slate-400 font-sans uppercase font-semibold">
                      {block.language || "Code"}
                    </span>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={async () => {
                        const ok = await copyToClipboard(block.content ?? "");
                        if (ok) {
                          toast.success("Código copiado al portapapeles");
                        } else {
                          toast.error("No se pudo copiar el código");
                        }
                      }}
                      className="h-6 text-[10px] text-slate-400 hover:text-white"
                    >
                      <Copy className="size-3 mr-1" />
                      Copiar
                    </Button>
                  </div>
                  <Textarea
                    id={`block-input-${index}`}
                    value={block.content ?? ""}
                    disabled={isLocked}
                    placeholder="// Código fuente..."
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    rows={4}
                    className="w-full resize-none border-0 shadow-none focus-visible:ring-0 bg-transparent text-emerald-400 font-mono text-xs p-0"
                  />
                </div>
              )}

              {block.type === "table" && (
                <div className="rounded-xl border border-slate-200 overflow-hidden shadow-xs bg-white">
                  <div className="overflow-x-auto">
                    <table className="w-full text-xs">
                      <tbody>
                        {(block.tableData || [["", ""]]).map((row, rIdx) => (
                          <tr key={rIdx} className={cn("border-b border-slate-100", rIdx === 0 && "bg-slate-50 font-semibold")}>
                            {row.map((cell, cIdx) => (
                              <td key={cIdx} className="p-2 border-r border-slate-100">
                                <input
                                  type="text"
                                  value={cell ?? ""}
                                  disabled={isLocked}
                                  onChange={(e) => handleTableCellChange(index, rIdx, cIdx, e.target.value)}
                                  className="w-full bg-transparent border-0 focus:outline-none focus:ring-1 focus:ring-indigo-500 rounded px-1"
                                />
                              </td>
                            ))}
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                  {!isLocked && (
                    <div className="flex items-center gap-2 p-2 bg-slate-50 border-t border-slate-100 text-[11px]">
                      <Button variant="ghost" size="sm" onClick={() => handleAddTableRow(index)} className="h-7 text-xs">
                        <Plus className="size-3 mr-1" /> Fila
                      </Button>
                      <Button variant="ghost" size="sm" onClick={() => handleAddTableCol(index)} className="h-7 text-xs">
                        <Plus className="size-3 mr-1" /> Columna
                      </Button>
                    </div>
                  )}
                </div>
              )}

              {block.type === "quote" && (
                <div className="border-l-4 border-indigo-500 pl-3 py-1 my-1">
                  <Textarea
                    id={`block-input-${index}`}
                    value={block.content ?? ""}
                    disabled={isLocked}
                    placeholder="Escribe una cita textual..."
                    onChange={(e) => handleContentChange(index, e.target.value)}
                    onKeyDown={(e) => handleKeyDown(e, index)}
                    rows={2}
                    className="w-full resize-none border-0 shadow-none focus-visible:ring-0 text-sm italic text-slate-700 bg-transparent p-0"
                  />
                </div>
              )}

              {block.type === "divider" && (
                <div className="py-3">
                  <hr className="border-slate-200" />
                </div>
              )}

              {/* Floating Notion Slash (/) Command Menu */}
              {isCurrentSlash && !isLocked && (
                <div
                  ref={slashMenuRef}
                  className="absolute z-50 top-full left-0 mt-1 w-72 bg-white rounded-xl border border-slate-200 shadow-xl overflow-hidden animate-in fade-in slide-in-from-top-2 duration-150"
                >
                  <div className="p-2 border-b border-slate-100 bg-slate-50/50">
                    <p className="text-[11px] font-semibold text-slate-400 uppercase tracking-wider">
                      Insertar bloque
                    </p>
                  </div>
                  <div className="max-h-64 overflow-y-auto p-1 space-y-0.5">
                    {filteredCommands.length === 0 ? (
                      <div className="p-3 text-center text-xs text-slate-400">
                        No se encontraron bloques
                      </div>
                    ) : (
                      filteredCommands.map((cmd, cmdIdx) => (
                        <div
                          key={cmd.type}
                          onClick={() => handleConvertBlockType(index, cmd.type)}
                          onMouseEnter={() => setSelectedSlashItemIndex(cmdIdx)}
                          className={cn(
                            "flex items-center gap-2.5 px-2.5 py-2 rounded-lg text-left cursor-pointer transition-colors",
                            cmdIdx === selectedSlashItemIndex
                              ? "bg-indigo-50 text-indigo-900"
                              : "hover:bg-slate-50 text-slate-700"
                          )}
                        >
                          <div className="flex size-7 items-center justify-center rounded-md bg-white border border-slate-200 shadow-xs shrink-0">
                            {cmd.icon}
                          </div>
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-semibold">{cmd.label}</p>
                            <p className="text-[10px] text-slate-400 truncate">{cmd.description}</p>
                          </div>
                        </div>
                      ))
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
