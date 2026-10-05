"use client";

import React from "react";
import { ReportBlock } from "@/types/workspace-report-types";
import { useEditor, EditorContent } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Link from "@tiptap/extension-link";
import Placeholder from "@tiptap/extension-placeholder";
import { Bold, Italic, List, ListOrdered, Heading2, Heading3 } from "lucide-react";

interface NarrativeBlockProps {
  block: ReportBlock;
  isEditing?: boolean;
  onUpdateConfig?: (cfg: Record<string, any>) => void;
}

export function NarrativeBlock({ block, isEditing, onUpdateConfig }: NarrativeBlockProps) {
  const content = block.config?.content || "<p>Escribe aquí tu análisis o resumen ejecutivo...</p>";

  const editor = useEditor({
    extensions: [
      StarterKit,
      Link.configure({ openOnClick: false }),
      Placeholder.configure({
        placeholder: "Escribe tu análisis ejecutivo...",
      }),
    ],
    content,
    editable: !!isEditing,
    immediatelyRender: false,
    onUpdate: ({ editor }) => {
      if (onUpdateConfig) {
        onUpdateConfig({ ...block.config, content: editor.getHTML() });
      }
    },
  });

  if (!isEditing) {
    return (
      <div className="w-full">
        {block.title && (
          <h4 className="text-sm font-semibold text-neutral-800 dark:text-neutral-200 mb-2">
            {block.title}
          </h4>
        )}
        <div
          className="prose prose-sm dark:prose-invert max-w-none text-neutral-700 dark:text-neutral-300 leading-relaxed"
          dangerouslySetInnerHTML={{ __html: content }}
        />
      </div>
    );
  }

  return (
    <div className="w-full bg-white dark:bg-neutral-900 border border-neutral-200 dark:border-neutral-800 rounded-xl overflow-hidden shadow-xs">
      {block.title && (
        <div className="px-4 pt-3 text-xs font-semibold text-neutral-500 uppercase tracking-wider">
          {block.title}
        </div>
      )}
      {editor && (
        <div className="flex items-center gap-1 border-b border-neutral-200 dark:border-neutral-800 px-3 py-1.5 bg-neutral-50/70 dark:bg-neutral-800/40">
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBold().run()}
            className={`p-1 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
              editor.isActive("bold") ? "bg-neutral-200 dark:bg-neutral-700 font-bold" : ""
            }`}
            title="Negrita"
          >
            <Bold className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleItalic().run()}
            className={`p-1 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
              editor.isActive("italic") ? "bg-neutral-200 dark:bg-neutral-700 italic" : ""
            }`}
            title="Cursiva"
          >
            <Italic className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 2 }).run()}
            className={`p-1 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
              editor.isActive("heading", { level: 2 }) ? "bg-neutral-200 dark:bg-neutral-700 font-bold" : ""
            }`}
            title="Título H2"
          >
            <Heading2 className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleHeading({ level: 3 }).run()}
            className={`p-1 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
              editor.isActive("heading", { level: 3 }) ? "bg-neutral-200 dark:bg-neutral-700 font-bold" : ""
            }`}
            title="Subtítulo H3"
          >
            <Heading3 className="w-3.5 h-3.5" />
          </button>
          <div className="w-px h-4 bg-neutral-300 dark:bg-neutral-700 mx-1" />
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleBulletList().run()}
            className={`p-1 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
              editor.isActive("bulletList") ? "bg-neutral-200 dark:bg-neutral-700" : ""
            }`}
            title="Lista con viñetas"
          >
            <List className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            onClick={() => editor.chain().focus().toggleOrderedList().run()}
            className={`p-1 rounded text-neutral-600 dark:text-neutral-400 hover:bg-neutral-200 dark:hover:bg-neutral-700 ${
              editor.isActive("orderedList") ? "bg-neutral-200 dark:bg-neutral-700" : ""
            }`}
            title="Lista numerada"
          >
            <ListOrdered className="w-3.5 h-3.5" />
          </button>
        </div>
      )}
      <div className="p-4 min-h-[100px] text-sm text-neutral-800 dark:text-neutral-200 focus:outline-none">
        <EditorContent editor={editor} />
      </div>
    </div>
  );
}

export function NarrativeConfigPanel({
  config,
  onChange,
}: {
  config: Record<string, any>;
  onChange: (cfg: Record<string, any>) => void;
}) {
  return (
    <div className="space-y-4">
      <div>
        <label className="block text-xs font-semibold text-neutral-700 dark:text-neutral-300 mb-1">
          Alineación de texto
        </label>
        <select
          value={config.alignment || "left"}
          onChange={(e) => onChange({ ...config, alignment: e.target.value })}
          className="w-full text-xs rounded-lg border border-neutral-300 dark:border-neutral-700 bg-white dark:bg-neutral-800 px-2.5 py-1.5"
        >
          <option value="left">Izquierda</option>
          <option value="center">Centro</option>
          <option value="justify">Justificado</option>
        </select>
      </div>
    </div>
  );
}
