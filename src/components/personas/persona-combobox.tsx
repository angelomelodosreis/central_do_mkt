"use client";

import { useState, useRef, useEffect, useMemo } from "react";
import { ChevronDown, Search, Check } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export type ComboboxOption = {
  value: string;
  label: string;
  group?: string;
  tags?: string;
};

function normalizeText(text: string): string {
  return text
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .toLowerCase();
}

export function PersonaCombobox({
  name,
  label,
  placeholder = "Selecione…",
  searchPlaceholder = "Buscar…",
  options,
  initialValue = "",
  required = false,
  onChange,
}: {
  name: string;
  label?: string;
  placeholder?: string;
  searchPlaceholder?: string;
  options: ComboboxOption[];
  initialValue?: string;
  required?: boolean;
  onChange?: (val: string) => void;
}) {
  const [open, setOpen] = useState(false);
  const [search, setSearch] = useState("");
  const [selectedValue, setSelectedValue] = useState(initialValue);
  const containerRef = useRef<HTMLDivElement>(null);
  const searchInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    function handleClickOutside(e: MouseEvent) {
      if (containerRef.current && !containerRef.current.contains(e.target as Node)) {
        setOpen(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    if (open) {
      setTimeout(() => searchInputRef.current?.focus(), 50);
    } else {
      setSearch("");
    }
  }, [open]);

  const filteredOptions = useMemo(() => {
    const q = normalizeText(search.trim());
    if (!q) return options;
    return options.filter((opt) => {
      const matchLabel = normalizeText(opt.label).includes(q);
      const matchValue = normalizeText(opt.value).includes(q);
      const matchTags = opt.tags ? normalizeText(opt.tags).includes(q) : false;
      const matchGroup = opt.group ? normalizeText(opt.group).includes(q) : false;
      return matchLabel || matchValue || matchTags || matchGroup;
    });
  }, [options, search]);

  const groupedOptions = useMemo(() => {
    const groups: { [key: string]: ComboboxOption[] } = {};
    for (const opt of filteredOptions) {
      const g = opt.group || "";
      if (!groups[g]) groups[g] = [];
      groups[g].push(opt);
    }
    return groups;
  }, [filteredOptions]);

  const selectedOption = options.find((opt) => opt.value === selectedValue);

  function handleSelect(val: string) {
    setSelectedValue(val);
    setOpen(false);
    onChange?.(val);
  }

  return (
    <div className="relative" ref={containerRef}>
      <input type="hidden" name={name} value={selectedValue} required={required} />

      <button
        type="button"
        onClick={() => setOpen(!open)}
        className={cn(
          "w-full flex items-center justify-between rounded-xl border border-slate-200 bg-white px-3.5 py-2.5 text-left text-sm transition shadow-2xs cursor-pointer",
          open && "border-[#e2263c] ring-2 ring-rose-100",
          selectedOption ? "text-slate-900 font-medium" : "text-slate-400",
        )}
      >
        <span className="truncate">{selectedOption ? selectedOption.label : placeholder}</span>
        <ChevronDown className="size-4 shrink-0 text-slate-400 transition" />
      </button>

      {open && (
        <div className="absolute left-0 right-0 top-full z-40 mt-1.5 rounded-2xl border border-slate-200 bg-white p-2 shadow-xl animate-in fade-in zoom-in-95 duration-100">
          <div className="relative mb-2">
            <Search className="absolute left-3 top-2.5 size-4 text-slate-400" />
            <input
              ref={searchInputRef}
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder={searchPlaceholder}
              className="w-full rounded-lg border border-slate-200 bg-slate-50/70 pl-9 pr-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:border-[#e2263c] focus:outline-none focus:bg-white transition"
            />
          </div>

          <div className="max-h-60 overflow-y-auto space-y-2 pr-1">
            {filteredOptions.length === 0 ? (
              <div className="p-3 text-center text-xs text-slate-400">
                Nenhum resultado encontrado.
              </div>
            ) : (
              Object.entries(groupedOptions).map(([groupTitle, items]) => (
                <div key={groupTitle} className="space-y-0.5">
                  {groupTitle && (
                    <div className="px-2 py-1 text-[10px] font-bold uppercase tracking-wider text-slate-400">
                      {groupTitle}
                    </div>
                  )}
                  {items.map((opt) => {
                    const isSelected = selectedValue === opt.value;
                    return (
                      <button
                        key={opt.value}
                        type="button"
                        onClick={() => handleSelect(opt.value)}
                        className={cn(
                          "w-full flex items-center justify-between rounded-lg px-2.5 py-1.5 text-left text-xs transition cursor-pointer",
                          isSelected
                            ? "bg-[#e2263c] text-white font-semibold"
                            : "text-slate-700 hover:bg-slate-100",
                        )}
                      >
                        <span className="truncate">{opt.label}</span>
                        {isSelected && <Check className="size-3.5 shrink-0" />}
                      </button>
                    );
                  })}
                </div>
              ))
            )}
          </div>
        </div>
      )}
    </div>
  );
}
