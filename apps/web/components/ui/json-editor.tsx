"use client";

import React, { useState, useMemo } from "react";
import CodeMirror from "@uiw/react-codemirror";
import { json } from "@codemirror/lang-json";
import { vscodeDark } from "@uiw/codemirror-theme-vscode";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, AlertCircle, Wand2, Copy } from "lucide-react";
import { useTheme } from "next-themes";

interface JsonEditorProps {
  value: string;
  onChange: (val: string) => void;
  height?: string;
  placeholder?: string;
  readOnly?: boolean;
  availableMacros?: Array<{ key: string; label: string; description?: string }>;
  showMacroToolbar?: boolean;
}

export const JsonEditor: React.FC<JsonEditorProps> = ({
  value,
  onChange,
  height = "220px",
  placeholder = "{\n  \"clave\": \"valor\"\n}",
  readOnly = false,
  availableMacros = [
    { key: "{{alert_name}}", label: "Alerta", description: "Nombre de la alerta" },
    { key: "{{report_name}}", label: "Reporte", description: "Nombre del reporte" },
    { key: "{{severity}}", label: "Severidad", description: "info, warning, critical" },
    { key: "{{threshold}}", label: "Condición", description: "Resumen de la condición" },
    { key: "{{evaluated_value}}", label: "Valor Detectado", description: "Valor o conteo" },
    { key: "{{total_rows}}", label: "Total Filas", description: "Cantidad total de filas" },
    { key: "{{timestamp}}", label: "Fecha/Hora", description: "Timestamp ISO-8601" },
    { key: "{{sample_data}}", label: "Muestra Datos", description: "Primeros registros en JSON" },
  ],
  showMacroToolbar = true,
}) => {
  const { resolvedTheme } = useTheme();
  const isDark = resolvedTheme === "dark";

  // Comprobar sintaxis JSON
  const jsonStatus = useMemo<{ isValid: boolean; error: string | null }>(() => {
    if (!value || value.trim() === "") {
      return { isValid: true, error: null };
    }

    // Si tiene macros tipo {{macro}} temporalmente reemplazamos para validar estructura
    const sanitized = value.replace(/\{\{[^}]+\}\}/g, '"__macro__"');

    try {
      JSON.parse(sanitized);
      return { isValid: true, error: null };
    } catch (e: any) {
      return { isValid: false, error: e.message };
    }
  }, [value]);

  const handleFormat = () => {
    if (!value.trim()) return;
    try {
      // Reemplazo temporal de macros para permitir formatear JSON
      const macroMap: Record<string, string> = {};
      let counter = 0;
      const placeholderStr = value.replace(/\{\{[^}]+\}\}/g, (match) => {
        const token = `__MACRO_${counter++}__`;
        macroMap[token] = match;
        return `"${token}"`;
      });

      const parsed = JSON.parse(placeholderStr);
      let formatted = JSON.stringify(parsed, null, 2);

      // Restaurar macros
      Object.entries(macroMap).forEach(([token, original]) => {
        // Restaurar sin comillas si el macro es un número o bloque
        formatted = formatted.replace(`"${token}"`, original);
        formatted = formatted.replace(token, original);
      });

      onChange(formatted);
    } catch {
      // Si no es JSON estándar, no formatear
    }
  };

  const handleInsertMacro = (macroKey: string) => {
    if (readOnly) return;
    if (!value || value.trim() === "") {
      onChange(`{\n  "mensaje": "${macroKey}"\n}`);
      return;
    }

    // Append o insertar al final si no hay cursor
    onChange(value + (value.endsWith("\n") ? "" : " ") + macroKey);
  };

  return (
    <div className="flex flex-col border border-border rounded-lg overflow-hidden bg-background">
      {/* Header Bar */}
      <div className="flex flex-wrap items-center justify-between gap-2 px-3 py-1.5 bg-muted/40 border-b border-border text-xs">
        <div className="flex items-center gap-2">
          <span className="font-semibold text-muted-foreground">Editor JSON</span>
          {value.trim() !== "" && (
            <Badge
              variant="outline"
              className={`text-[10px] px-1.5 py-0 h-4 gap-1 ${
                jsonStatus.isValid
                  ? "border-emerald-500/40 text-emerald-600 bg-emerald-500/10"
                  : "border-rose-500/40 text-rose-600 bg-rose-500/10"
              }`}
            >
              {jsonStatus.isValid ? (
                <>
                  <Check className="h-2.5 w-2.5" /> Válido
                </>
              ) : (
                <>
                  <AlertCircle className="h-2.5 w-2.5" /> Error sintaxis
                </>
              )}
            </Badge>
          )}
        </div>

        {!readOnly && (
          <div className="flex items-center gap-1.5">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleFormat}
              className="h-6 px-2 text-[11px] text-muted-foreground hover:text-foreground"
              title="Dar formato automático al JSON"
            >
              <Wand2 className="h-3 w-3 mr-1" />
              Formatear
            </Button>
          </div>
        )}
      </div>

      {/* CodeMirror Editor */}
      <div className="relative font-mono text-xs">
        <CodeMirror
          value={value}
          height={height}
          extensions={[json()]}
          theme={isDark ? vscodeDark : undefined}
          onChange={onChange}
          readOnly={readOnly}
          placeholder={placeholder}
          basicSetup={{
            lineNumbers: true,
            foldGutter: true,
            dropCursor: true,
            allowMultipleSelections: true,
            indentOnInput: true,
            bracketMatching: true,
            closeBrackets: true,
            autocompletion: true,
            highlightActiveLine: !readOnly,
          }}
          className="overflow-hidden"
        />
      </div>

      {/* Macro Toolbar */}
      {showMacroToolbar && !readOnly && availableMacros.length > 0 && (
        <div className="p-2 border-t border-border bg-muted/20 flex flex-col gap-1">
          <span className="text-[10px] font-medium text-muted-foreground uppercase tracking-wider">
            Insertar Variables Dinámicas (Macros):
          </span>
          <div className="flex flex-wrap gap-1.5">
            {availableMacros.map((macro) => (
              <button
                key={macro.key}
                type="button"
                onClick={() => handleInsertMacro(macro.key)}
                className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-muted border border-border text-foreground hover:bg-primary/10 hover:border-primary/40 hover:text-primary transition-colors cursor-pointer"
                title={macro.description || macro.key}
              >
                {macro.key}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};
