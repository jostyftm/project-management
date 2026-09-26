"use client";

import React, { useState, useMemo } from "react";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@/components/ui/popover";
import { Input } from "@/components/ui/input";
import { Check, ChevronsUpDown, Search, X, Loader2 } from "lucide-react";
import { cn } from "@/lib/utils";

export interface SearchableSelectOption {
  value: string;
  label: string;
  sublabel?: string;
  icon?: React.ReactNode;
}

export interface SearchableSelectProps {
  options: SearchableSelectOption[];
  value?: string;
  onChange: (value: string) => void;
  placeholder?: string;
  searchPlaceholder?: string;
  emptyText?: string;
  disabled?: boolean;
  isLoading?: boolean;
  className?: string;
  triggerClassName?: string;
  allowClear?: boolean;
}

const normalizeText = (text: string): string => {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "");
};

export const SearchableSelect: React.FC<SearchableSelectProps> = ({
  options,
  value,
  onChange,
  placeholder = "Selecciona una opción...",
  searchPlaceholder = "Buscar...",
  emptyText = "No se encontraron resultados.",
  disabled = false,
  isLoading = false,
  className,
  triggerClassName,
  allowClear = true,
}) => {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");

  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  const filteredOptions = useMemo(() => {
    if (!search.trim()) return options;
    const query = normalizeText(search.trim());
    return options.filter((opt) => {
      const matchLabel = normalizeText(opt.label).includes(query);
      const matchSublabel = opt.sublabel
        ? normalizeText(opt.sublabel).includes(query)
        : false;
      const matchValue = normalizeText(String(opt.value)).includes(query);
      return matchLabel || matchSublabel || matchValue;
    });
  }, [options, search]);

  const handleSelect = (val: string) => {
    onChange(val);
    setOpen(false);
    setSearch("");
  };

  const handleClear = (e: React.MouseEvent) => {
    e.stopPropagation();
    onChange("");
  };

  return (
    <div className={cn("relative w-full", className)}>
      <Popover open={open} onOpenChange={setOpen}>
        <PopoverTrigger asChild>
          <button
            type="button"
            disabled={disabled || isLoading}
            className={cn(
              "flex h-9 w-full items-center justify-between rounded-md border border-input bg-background px-3 py-1 text-xs shadow-xs transition-colors hover:bg-slate-50 focus:outline-hidden focus:ring-1 focus:ring-ring disabled:cursor-not-allowed disabled:opacity-50 select-none",
              !selectedOption && "text-muted-foreground",
              triggerClassName
            )}
          >
            <div className="flex items-center gap-2 truncate text-left min-w-0 flex-1">
              {isLoading ? (
                <Loader2 className="w-3.5 h-3.5 animate-spin text-primary shrink-0" />
              ) : (
                selectedOption?.icon && (
                  <span className="shrink-0">{selectedOption.icon}</span>
                )
              )}
              <span className="truncate">
                {isLoading
                  ? "Cargando opciones..."
                  : selectedOption
                  ? selectedOption.label
                  : placeholder}
              </span>
              {selectedOption?.sublabel && (
                <span className="text-[10px] text-muted-foreground truncate hidden sm:inline">
                  ({selectedOption.sublabel})
                </span>
              )}
            </div>

            <div className="flex items-center gap-1 shrink-0 ml-1.5">
              {allowClear && selectedOption && !disabled && (
                <span
                  role="button"
                  tabIndex={0}
                  onClick={handleClear}
                  className="rounded p-0.5 hover:bg-slate-200 text-slate-400 hover:text-slate-600 transition-colors cursor-pointer"
                  title="Limpiar selección"
                >
                  <X className="w-3 h-3" />
                </span>
              )}
              <ChevronsUpDown className="w-3.5 h-3.5 text-slate-400 shrink-0" />
            </div>
          </button>
        </PopoverTrigger>

        <PopoverContent
          className="w-(--radix-popover-trigger-width) min-w-[280px] p-2"
          align="start"
        >
          {/* Campo de búsqueda */}
          <div className="relative mb-2">
            <Search className="pointer-events-none absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-muted-foreground" />
            <Input
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="h-8 pl-8 pr-7 text-xs bg-slate-50/50"
              autoFocus
            />
            {search && (
              <button
                type="button"
                onClick={() => setSearch("")}
                className="absolute right-2 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground cursor-pointer"
              >
                <X className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Lista de opciones filtradas */}
          <div className="max-h-60 overflow-y-auto overflow-x-hidden space-y-0.5 pr-1">
            {isLoading ? (
              <div className="flex items-center justify-center gap-2 py-6 text-xs text-muted-foreground">
                <Loader2 className="w-4 h-4 animate-spin text-primary" />
                <span>Cargando catálogo...</span>
              </div>
            ) : filteredOptions.length === 0 ? (
              <p className="text-xs text-center py-5 text-muted-foreground italic">
                {emptyText}
              </p>
            ) : (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <button
                    key={String(opt.value)}
                    type="button"
                    onClick={() => handleSelect(String(opt.value))}
                    className={cn(
                      "w-full flex items-center justify-between gap-2 rounded-md px-2.5 py-1.5 text-xs text-left transition-colors hover:bg-slate-100 cursor-pointer select-none",
                      isSelected &&
                        "bg-primary/10 text-primary font-semibold hover:bg-primary/15"
                    )}
                  >
                    <div className="flex items-center gap-2 truncate min-w-0">
                      {opt.icon && (
                        <span className="shrink-0">{opt.icon}</span>
                      )}
                      <span className="truncate">{opt.label}</span>
                      {opt.sublabel && (
                        <span className="text-[10px] text-muted-foreground font-normal truncate">
                          {opt.sublabel}
                        </span>
                      )}
                    </div>
                    {isSelected && (
                      <Check className="w-3.5 h-3.5 text-primary shrink-0 ml-1.5" />
                    )}
                  </button>
                );
              })
            )}
          </div>
        </PopoverContent>
      </Popover>
    </div>
  );
};

export default SearchableSelect;
