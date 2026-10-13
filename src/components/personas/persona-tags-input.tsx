"use client";

import { useState, KeyboardEvent, useId } from "react";
import { Plus, X, Tag } from "lucide-react";

interface PersonaTagsInputProps {
  name?: string;
  defaultTags?: string[];
  placeholder?: string;
}

const SUGGESTED_TAGS = [
  "Internato",
  "Plantões",
  "Residência R1",
  "Estudo por Questões",
  "ENARE",
  "Mentoria",
  "Pós-Graduação",
  "Foco em Prova Prática",
];

export function PersonaTagsInput({
  name = "tags",
  defaultTags = [],
  placeholder = "Digite uma tag e pressione Enter...",
}: PersonaTagsInputProps) {
  const [tags, setTags] = useState<string[]>(() => {
    if (Array.isArray(defaultTags)) {
      return defaultTags.filter((t): t is string => typeof t === "string" && t.trim().length > 0);
    }
    return [];
  });
  const [inputValue, setInputValue] = useState("");
  const inputId = useId();

  function addTag(raw: string) {
    const trimmed = raw.trim().replace(/^#/, "");
    if (!trimmed) return;
    if (tags.some((t) => t.toLowerCase() === trimmed.toLowerCase())) {
      setInputValue("");
      return;
    }
    setTags((prev) => [...prev, trimmed]);
    setInputValue("");
  }

  function removeTag(tagToRemove: string) {
    setTags((prev) => prev.filter((t) => t !== tagToRemove));
  }

  function handleKeyDown(e: KeyboardEvent<HTMLInputElement>) {
    if (e.key === "Enter" || e.key === ",") {
      e.preventDefault();
      addTag(inputValue);
    } else if (e.key === "Backspace" && inputValue === "" && tags.length > 0) {
      e.preventDefault();
      removeTag(tags[tags.length - 1]);
    }
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name={name} value={JSON.stringify(tags)} />

      {/* Input row + active tags */}
      <div className="flex flex-wrap items-center gap-1.5 p-2 rounded-lg border border-border bg-background focus-within:ring-2 focus-within:ring-ring focus-within:border-transparent min-h-[42px] transition-all">
        <Tag className="w-3.5 h-3.5 text-muted-foreground ml-1 shrink-0" />

        {tags.map((tag) => (
          <span
            key={tag}
            className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full text-xs font-medium bg-primary/10 text-primary border border-primary/20 animate-in fade-in zoom-in-95 duration-150"
          >
            <span>#{tag}</span>
            <button
              type="button"
              onClick={() => removeTag(tag)}
              className="text-primary/70 hover:text-primary hover:bg-primary/20 rounded-full p-0.5 transition-colors focus:outline-none"
              title={`Remover tag ${tag}`}
            >
              <X className="w-3 h-3" />
            </button>
          </span>
        ))}

        <input
          id={inputId}
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          onKeyDown={handleKeyDown}
          onBlur={() => {
            if (inputValue.trim()) addTag(inputValue);
          }}
          placeholder={tags.length === 0 ? placeholder : "Adicionar outra..."}
          className="flex-1 min-w-[140px] bg-transparent text-sm border-0 focus:outline-none focus:ring-0 p-1 text-foreground placeholder:text-muted-foreground/60"
        />

        {inputValue.trim().length > 0 && (
          <button
            type="button"
            onClick={() => addTag(inputValue)}
            className="inline-flex items-center gap-1 px-2 py-0.5 rounded text-xs font-medium bg-muted hover:bg-muted/80 text-foreground transition-colors"
          >
            <Plus className="w-3 h-3" />
            Adicionar
          </button>
        )}
      </div>

      {/* Suggestions pill row */}
      <div className="flex flex-wrap items-center gap-1.5 pt-0.5">
        <span className="text-[11px] font-medium text-muted-foreground">Sugestões:</span>
        {SUGGESTED_TAGS.map((suggested) => {
          const isAdded = tags.some((t) => t.toLowerCase() === suggested.toLowerCase());
          return (
            <button
              key={suggested}
              type="button"
              onClick={() => (isAdded ? removeTag(suggested) : addTag(suggested))}
              className={`inline-flex items-center gap-1 text-[11px] px-2 py-0.5 rounded-full border transition-colors ${
                isAdded
                  ? "bg-primary/15 border-primary/30 text-primary font-medium"
                  : "bg-muted/40 border-border/60 text-muted-foreground hover:text-foreground hover:bg-muted"
              }`}
            >
              {isAdded ? "✓" : "+"} {suggested}
            </button>
          );
        })}
      </div>
    </div>
  );
}
