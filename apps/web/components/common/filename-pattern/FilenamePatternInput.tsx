"use client";

import React, { useMemo, useRef, useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import {
  FILENAME_PRESETS,
  FILENAME_TOKENS,
  FilenameToken,
  resolveFilenamePattern,
  DEFAULT_FILENAME_PATTERN,
} from "@/lib/filename-pattern-resolver";
import { FileText, Sparkles, Plus, RotateCcw, Info } from "lucide-react";
import { cn } from "@/lib/utils";

interface FilenamePatternInputProps {
  value: string;
  onChange: (value: string) => void;
  reportName: string;
  format?: string;
  label?: string;
  placeholder?: string;
  helperText?: string;
  disabled?: boolean;
  className?: string;
}

export function FilenamePatternInput({
  value,
  onChange,
  reportName,
  format = "xlsx",
  label = "Nombre del archivo descargado",
  placeholder = DEFAULT_FILENAME_PATTERN,
  helperText = "Puedes usar texto libre y variables dinámicas entre llaves {}",
  disabled = false,
  className,
}: FilenamePatternInputProps) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [activeCategory, setActiveCategory] = useState<string>("all");

  const previewFilename = useMemo(() => {
    return resolveFilenamePattern(value || DEFAULT_FILENAME_PATTERN, reportName, format);
  }, [value, reportName, format]);

  const insertToken = (token: string) => {
    const input = inputRef.current;
    if (!input) {
      onChange((value || "") + token);
      return;
    }

    const start = input.selectionStart ?? value.length;
    const end = input.selectionEnd ?? value.length;
    const nextVal = (value || "").slice(0, start) + token + (value || "").slice(end);
    onChange(nextVal);

    // Reubicar cursor
    setTimeout(() => {
      input.focus();
      input.setSelectionRange(start + token.length, start + token.length);
    }, 10);
  };

  const handleSelectPreset = (presetId: string) => {
    const preset = FILENAME_PRESETS.find((p) => p.id === presetId);
    if (preset) {
      onChange(preset.pattern);
    }
  };

  const handleReset = () => {
    onChange(DEFAULT_FILENAME_PATTERN);
  };

  const filteredTokens = useMemo(() => {
    if (activeCategory === "all") return FILENAME_TOKENS;
    return FILENAME_TOKENS.filter((t) => t.category === activeCategory);
  }, [activeCategory]);

  return (
    <div className={cn("space-y-2.5", className)}>
      <div className="flex items-center justify-between">
        <Label className="text-sm font-medium text-foreground flex items-center gap-1.5">
          <FileText className="w-4 h-4 text-primary" />
          {label}
        </Label>
        <div className="flex items-center gap-2">
          {value && value !== DEFAULT_FILENAME_PATTERN && (
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={handleReset}
              disabled={disabled}
              className="h-6 px-2 text-xs text-muted-foreground hover:text-foreground flex items-center gap-1"
              title="Restablecer a patrón por defecto"
            >
              <RotateCcw className="w-3 h-3" />
              Por defecto
            </Button>
          )}

          <Select onValueChange={handleSelectPreset} disabled={disabled}>
            <SelectTrigger className="h-7 text-xs w-[170px]">
              <Sparkles className="w-3 h-3 mr-1 text-amber-500" />
              <SelectValue placeholder="Plantillas / Presets" />
            </SelectTrigger>
            <SelectContent>
              {FILENAME_PRESETS.map((preset) => (
                <SelectItem key={preset.id} value={preset.id} className="text-xs">
                  <div className="flex flex-col text-left">
                    <span className="font-medium">{preset.label}</span>
                    <span className="text-[10px] text-muted-foreground font-mono">
                      {preset.pattern}
                    </span>
                  </div>
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="space-y-1.5">
        <div className="relative">
          <Input
            ref={inputRef}
            type="text"
            value={value}
            onChange={(e) => onChange(e.target.value)}
            placeholder={placeholder}
            disabled={disabled}
            className="pr-10 font-mono text-xs"
          />
          <div className="absolute right-1 top-1/2 -translate-y-1/2">
            <Popover>
              <PopoverTrigger asChild>
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  disabled={disabled}
                  className="h-7 w-7 p-0 rounded-full hover:bg-muted"
                  title="Ver todas las macros disponibles"
                >
                  <Plus className="w-3.5 h-3.5 text-primary" />
                </Button>
              </PopoverTrigger>
              <PopoverContent className="w-80 p-3 space-y-3" align="end">
                <div className="flex items-center justify-between border-b pb-2">
                  <div className="flex items-center gap-1.5">
                    <Sparkles className="w-4 h-4 text-primary" />
                    <span className="text-xs font-semibold">Variables disponibles</span>
                  </div>
                  <div className="flex gap-1 text-[10px]">
                    <button
                      type="button"
                      onClick={() => setActiveCategory("all")}
                      className={cn(
                        "px-1.5 py-0.5 rounded",
                        activeCategory === "all" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Todas
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategory("date")}
                      className={cn(
                        "px-1.5 py-0.5 rounded",
                        activeCategory === "date" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Fecha
                    </button>
                    <button
                      type="button"
                      onClick={() => setActiveCategory("time")}
                      className={cn(
                        "px-1.5 py-0.5 rounded",
                        activeCategory === "time" ? "bg-primary text-primary-foreground font-medium" : "text-muted-foreground hover:bg-muted"
                      )}
                    >
                      Hora
                    </button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-1.5 max-h-56 overflow-y-auto pr-1">
                  {filteredTokens.map((tokenItem: FilenameToken) => (
                    <button
                      key={tokenItem.token}
                      type="button"
                      onClick={() => insertToken(tokenItem.token)}
                      className="flex items-center justify-between p-1.5 rounded-md hover:bg-muted text-left transition-colors group"
                    >
                      <div className="flex flex-col">
                        <span className="font-mono text-xs font-semibold text-primary group-hover:underline">
                          {tokenItem.token}
                        </span>
                        <span className="text-[10px] text-muted-foreground">
                          {tokenItem.label}
                        </span>
                      </div>
                      <Badge variant="outline" className="text-[9px] font-mono py-0 px-1 text-muted-foreground">
                        {tokenItem.example}
                      </Badge>
                    </button>
                  ))}
                </div>

                <div className="text-[10px] text-muted-foreground flex items-center gap-1 border-t pt-2">
                  <Info className="w-3 h-3 flex-shrink-0" />
                  <span>Haz clic en una variable para insertarla en el cursor.</span>
                </div>
              </PopoverContent>
            </Popover>
          </div>
        </div>

        {/* Chips de acceso rápido */}
        <div className="flex items-center gap-1.5 flex-wrap pt-0.5">
          <span className="text-[11px] text-muted-foreground font-medium mr-1">Insertar:</span>
          {["{report_name}", "{YYYY}", "{MM}", "{DD}", "{HH}", "{mm}", "{ss}", "{timestamp}"].map((token) => (
            <button
              key={token}
              type="button"
              onClick={() => insertToken(token)}
              disabled={disabled}
              className="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] font-mono bg-muted hover:bg-primary/10 hover:text-primary transition-colors border text-muted-foreground cursor-pointer disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {token}
            </button>
          ))}
        </div>
      </div>

      {/* Vista previa en tiempo real */}
      <div className="p-2.5 rounded-md bg-muted/40 border flex items-start gap-2 text-xs">
        <Sparkles className="w-4 h-4 text-emerald-500 mt-0.5 flex-shrink-0" />
        <div className="flex flex-col gap-0.5 min-w-0 flex-1">
          <span className="text-[11px] font-medium text-muted-foreground">Vista previa del archivo:</span>
          <span className="font-mono text-xs font-medium text-foreground truncate select-all" title={previewFilename}>
            {previewFilename}
          </span>
        </div>
      </div>

      {helperText && (
        <p className="text-[11px] text-muted-foreground">{helperText}</p>
      )}
    </div>
  );
}
