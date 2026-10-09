"use client";

import React, { useRef, useEffect, useState, useCallback } from "react";
import { cn } from "@/lib/utils";
import {
  Bold,
  Italic,
  Underline,
  Strikethrough,
  Heading2,
  Heading3,
  List,
  ListOrdered,
  Quote,
  RemoveFormatting,
  Undo,
  Redo,
} from "lucide-react";

export interface RichTextEditorProps {
  value?: string;
  onChange?: (value: string) => void;
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  minHeight?: string;
  maxHeight?: string;
}

export const RichTextEditor: React.FC<RichTextEditorProps> = ({
  value = "",
  onChange,
  placeholder = "Escribe el cuerpo del mensaje...",
  disabled = false,
  className,
  minHeight = "150px",
  maxHeight,
}) => {
  const editorRef = useRef<HTMLDivElement>(null);
  const [isFocused, setIsFocused] = useState(false);
  const [activeStates, setActiveStates] = useState({
    bold: false,
    italic: false,
    underline: false,
    strikethrough: false,
    unorderedList: false,
    orderedList: false,
  });

  const updateActiveStates = useCallback(() => {
    if (typeof document === "undefined" || !isFocused) return;
    try {
      setActiveStates({
        bold: document.queryCommandState("bold"),
        italic: document.queryCommandState("italic"),
        underline: document.queryCommandState("underline"),
        strikethrough: document.queryCommandState("strikethrough"),
        unorderedList: document.queryCommandState("insertUnorderedList"),
        orderedList: document.queryCommandState("insertOrderedList"),
      });
    } catch {
      // Ignore if document queryCommandState fails
    }
  }, [isFocused]);

  // Sincronizar el contenido interno cuando cambia `value` desde afuera
  useEffect(() => {
    if (editorRef.current && editorRef.current.innerHTML !== value) {
      if (document.activeElement !== editorRef.current) {
        editorRef.current.innerHTML = value || "";
      }
    }
  }, [value]);

  const handleInput = () => {
    if (editorRef.current) {
      const html = editorRef.current.innerHTML;
      const text = editorRef.current.innerText.trim();
      const finalHtml = text.length === 0 && !html.includes("<img") ? "" : html;
      onChange?.(finalHtml);
      updateActiveStates();
    }
  };

  const execCmd = (cmd: string, val: string | undefined = undefined) => {
    if (disabled) return;
    if (editorRef.current) {
      editorRef.current.focus();
    }
    document.execCommand(cmd, false, val);
    handleInput();
    updateActiveStates();
  };

  const isContentEmpty =
    !value ||
    value.trim() === "" ||
    value === "<p><br></p>" ||
    value === "<br>";

  return (
    <div
      className={cn(
        "flex flex-col rounded-lg border border-input dark:border-slate-800 bg-background shadow-xs transition-colors overflow-hidden",
        isFocused && "ring-1 ring-ring border-ring dark:border-indigo-500/50 dark:ring-indigo-500/20",
        disabled && "opacity-60 cursor-not-allowed",
        className
      )}
    >
      {/* Barra de herramientas */}
      <div className="flex flex-wrap items-center gap-0.5 border-b border-slate-200 dark:border-slate-800 bg-slate-50/80 dark:bg-slate-800/80 px-2 py-1.5 text-slate-700 dark:text-slate-300">
        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("bold");
          }}
          title="Negrita (Ctrl+B)"
          className={cn(
            "p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer",
            activeStates.bold && "bg-slate-200 dark:bg-slate-700 text-primary dark:text-indigo-400 font-bold"
          )}
        >
          <Bold className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("italic");
          }}
          title="Cursiva (Ctrl+I)"
          className={cn(
            "p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer",
            activeStates.italic && "bg-slate-200 dark:bg-slate-700 text-primary dark:text-indigo-400"
          )}
        >
          <Italic className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("underline");
          }}
          title="Subrayado (Ctrl+U)"
          className={cn(
            "p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer",
            activeStates.underline && "bg-slate-200 dark:bg-slate-700 text-primary dark:text-indigo-400"
          )}
        >
          <Underline className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("strikethrough");
          }}
          title="Tachado"
          className={cn(
            "p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer",
            activeStates.strikethrough && "bg-slate-200 dark:bg-slate-700 text-primary dark:text-indigo-400"
          )}
        >
          <Strikethrough className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("formatBlock", "<h2>");
          }}
          title="Título H2"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          <Heading2 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("formatBlock", "<h3>");
          }}
          title="Título H3"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-bold text-slate-700 dark:text-slate-300"
        >
          <Heading3 className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("formatBlock", "<p>");
          }}
          title="Texto normal / Párrafo"
          className="px-1.5 py-0.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-xs font-medium text-slate-600 dark:text-slate-400"
        >
          Normal
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("insertUnorderedList");
          }}
          title="Lista con viñetas"
          className={cn(
            "p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer",
            activeStates.unorderedList && "bg-slate-200 dark:bg-slate-700 text-primary dark:text-indigo-400"
          )}
        >
          <List className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("insertOrderedList");
          }}
          title="Lista numerada"
          className={cn(
            "p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer",
            activeStates.orderedList && "bg-slate-200 dark:bg-slate-700 text-primary dark:text-indigo-400"
          )}
        >
          <ListOrdered className="w-4 h-4" />
        </button>

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("formatBlock", "<blockquote>");
          }}
          title="Cita"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <Quote className="w-4 h-4" />
        </button>

        <div className="h-4 w-px bg-slate-300 dark:bg-slate-700 mx-1" />

        <button
          type="button"
          disabled={disabled}
          onMouseDown={(e) => {
            e.preventDefault();
            execCmd("removeFormat");
          }}
          title="Limpiar formato"
          className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-700 dark:text-slate-300"
        >
          <RemoveFormatting className="w-4 h-4" />
        </button>

        <div className="ml-auto flex items-center gap-0.5">
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd("undo");
            }}
            title="Deshacer (Ctrl+Z)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Undo className="w-3.5 h-3.5" />
          </button>
          <button
            type="button"
            disabled={disabled}
            onMouseDown={(e) => {
              e.preventDefault();
              execCmd("redo");
            }}
            title="Rehacer (Ctrl+Y)"
            className="p-1.5 rounded hover:bg-slate-200 dark:hover:bg-slate-700 transition-colors cursor-pointer text-slate-500 hover:text-slate-700 dark:text-slate-400 dark:hover:text-slate-200"
          >
            <Redo className="w-3.5 h-3.5" />
          </button>
        </div>
      </div>

      {/* Área editable con contenedor relativo para placeholder */}
      <div className="relative flex-1 bg-white dark:bg-slate-900 transition-colors">
        {isContentEmpty && !isFocused && (
          <span className="pointer-events-none absolute left-3 top-3 text-xs text-slate-400 dark:text-slate-500 select-none">
            {placeholder}
          </span>
        )}
        <div
          ref={editorRef}
          contentEditable={!disabled}
          onFocus={() => {
            setIsFocused(true);
            updateActiveStates();
          }}
          onBlur={() => {
            setIsFocused(false);
            handleInput();
          }}
          onInput={handleInput}
          onKeyUp={updateActiveStates}
          onMouseUp={updateActiveStates}
          style={{ minHeight, maxHeight: maxHeight ?? "220px" }}
          className="w-full p-3 text-xs sm:text-sm text-slate-800 dark:text-slate-100 focus:outline-none overflow-y-auto leading-relaxed [&_h2]:text-base [&_h2]:font-bold [&_h2]:mt-2 [&_h2]:mb-1 [&_h2]:text-slate-900 dark:[&_h2]:text-white [&_h3]:text-sm [&_h3]:font-semibold [&_h3]:mt-1.5 [&_h3]:mb-0.5 [&_h3]:text-slate-800 dark:[&_h3]:text-slate-200 [&_ul]:list-disc [&_ul]:pl-5 [&_ul]:my-1.5 [&_ol]:list-decimal [&_ol]:pl-5 [&_ol]:my-1.5 [&_blockquote]:border-l-2 [&_blockquote]:border-indigo-400 dark:[&_blockquote]:border-indigo-500 [&_blockquote]:pl-3 [&_blockquote]:my-1.5 [&_blockquote]:italic [&_blockquote]:text-slate-600 dark:[&_blockquote]:text-slate-400 [&_p]:my-1"
        />
      </div>
    </div>
  );
};

export default RichTextEditor;
