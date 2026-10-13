"use client";

import React, { useRef, useState } from "react";
import { Plus, X } from "lucide-react";
import { cn } from "@/lib/utils/cn";

export const PRESET_AVATARS: { id: string; title: string; svg: React.ReactNode }[] = [
  {
    id: "preset:1",
    title: "Ilustração 1",
    svg: (
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <rect width="44" height="44" fill="#FDE7EF" />
        <path d="M8 44c0-7.2 6.3-11.4 14-11.4S36 36.8 36 44z" fill="#FFFFFF" />
        <path d="M18.2 32.8 22 38l3.8-5.2 2 .7L22 44h-.1l-5.7-10.5z" fill="#E9EDF2" />
        <rect x="19.6" y="27.4" width="4.8" height="6" rx="2.4" fill="#F2C9A8" />
        <circle cx="22" cy="20.4" r="7.6" fill="#F2C9A8" />
        <path d="M13.5 19c0-5 4-8.5 8.5-8.5S30.5 14 30.5 19c0 1-.3 1.6-.8 1.6-1.2 0-1.4-3.4-4.2-4.4-2.6-.9-4 .9-7 .6-2 0-3.3 3.8-4.3 3.8-.5 0-.7-.7-.7-1.6z" fill="#3A2A22" />
        <circle cx="19.2" cy="20.8" r="1" fill="#2B2B2B" />
        <circle cx="24.8" cy="20.8" r="1" fill="#2B2B2B" />
        <path d="M20.3 23.6c.9.7 2.5.7 3.4 0" stroke="#B36A5E" stroke-width="1" fill="none" strokeLinecap="round" />
        <path d="M17.4 35.2v4.2a4.6 4.6 0 0 0 9.2 0v-4.2" stroke="#D0D7DE" strokeWidth="1.3" fill="none" />
        <circle cx="26.6" cy="40.4" r="1.7" fill="#E01E2B" />
      </svg>
    ),
  },
  {
    id: "preset:2",
    title: "Ilustração 2",
    svg: (
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <rect width="44" height="44" fill="#E7F1FD" />
        <path d="M8 44c0-7.2 6.3-11.4 14-11.4S36 36.8 36 44z" fill="#FFFFFF" />
        <path d="M18.2 32.8 22 38l3.8-5.2 2 .7L22 44h-.1l-5.7-10.5z" fill="#E9EDF2" />
        <rect x="19.6" y="27.4" width="4.8" height="6" rx="2.4" fill="#8D5A3B" />
        <circle cx="22" cy="20.4" r="7.6" fill="#8D5A3B" />
        <circle cx="22" cy="8.6" r="2.8" fill="#1E1512" />
        <path d="M13.6 19.2c0-5.1 3.9-8.7 8.4-8.7s8.4 3.6 8.4 8.7c0 1-.3 1.5-.8 1.5-1.1 0-1.3-3.3-4.1-4.3-2.6-.9-4 .9-6.9.6-2 0-3.3 3.7-4.2 3.7-.6 0-.8-.6-.8-1.5z" fill="#1E1512" />
        <circle cx="19.2" cy="20.8" r="1" fill="#2B2B2B" />
        <circle cx="24.8" cy="20.8" r="1" fill="#2B2B2B" />
        <path d="M20.3 23.6c.9.7 2.5.7 3.4 0" stroke="#B36A5E" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M17.4 35.2v4.2a4.6 4.6 0 0 0 9.2 0v-4.2" stroke="#D0D7DE" strokeWidth="1.3" fill="none" />
        <circle cx="26.6" cy="40.4" r="1.7" fill="#E01E2B" />
      </svg>
    ),
  },
  {
    id: "preset:3",
    title: "Ilustração 3",
    svg: (
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <rect width="44" height="44" fill="#FFF2DE" />
        <path d="M8 44c0-7.2 6.3-11.4 14-11.4S36 36.8 36 44z" fill="#FFFFFF" />
        <path d="M18.2 32.8 22 38l3.8-5.2 2 .7L22 44h-.1l-5.7-10.5z" fill="#E9EDF2" />
        <rect x="19.6" y="27.4" width="4.8" height="6" rx="2.4" fill="#F7D9BE" />
        <circle cx="22" cy="20.4" r="7.6" fill="#F7D9BE" />
        <path d="M12.8 19.4c0-5.3 4.1-9 9.2-9s9.2 3.7 9.2 9c0 4-.5 7.7-1.6 7.7-.8 0-.9-3.3-1.3-5.6-.3-1.7-1.6-3-3.6-3.4-2.9-.6-4.5.8-7.4.5-1.6 0-2.3 3.3-2.6 5.6-.3 1.9-.4 2.9-1.1 2.9-1 0-.8-3.6-.8-7.7z" fill="#8A5A2B" />
        <circle cx="19.2" cy="20.8" r="1" fill="#2B2B2B" />
        <circle cx="24.8" cy="20.8" r="1" fill="#2B2B2B" />
        <path d="M20.3 23.6c.9.7 2.5.7 3.4 0" stroke="#B36A5E" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M17.4 35.2v4.2a4.6 4.6 0 0 0 9.2 0v-4.2" stroke="#D0D7DE" strokeWidth="1.3" fill="none" />
        <circle cx="26.6" cy="40.4" r="1.7" fill="#E01E2B" />
      </svg>
    ),
  },
  {
    id: "preset:4",
    title: "Ilustração 4",
    svg: (
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <rect width="44" height="44" fill="#E9F7EF" />
        <path d="M8 44c0-7.2 6.3-11.4 14-11.4S36 36.8 36 44z" fill="#FFFFFF" />
        <path d="M18.2 32.8 22 38l3.8-5.2 2 .7L22 44h-.1l-5.7-10.5z" fill="#E9EDF2" />
        <rect x="19.6" y="27.4" width="4.8" height="6" rx="2.4" fill="#C98B5E" />
        <circle cx="22" cy="20.4" r="7.6" fill="#C98B5E" />
        <path d="M13.5 19c0-5 4-8.5 8.5-8.5S30.5 14 30.5 19c0 1-.3 1.6-.8 1.6-1.2 0-1.4-3.4-4.2-4.4-2.6-.9-4 .9-7 .6-2 0-3.3 3.8-4.3 3.8-.5 0-.7-.7-.7-1.6z" fill="#241A14" />
        <circle cx="19.2" cy="20.8" r="1" fill="#2B2B2B" />
        <circle cx="24.8" cy="20.8" r="1" fill="#2B2B2B" />
        <path d="M20.3 23.6c.9.7 2.5.7 3.4 0" stroke="#B36A5E" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M17.4 35.2v4.2a4.6 4.6 0 0 0 9.2 0v-4.2" stroke="#D0D7DE" strokeWidth="1.3" fill="none" />
        <circle cx="26.6" cy="40.4" r="1.7" fill="#E01E2B" />
      </svg>
    ),
  },
  {
    id: "preset:5",
    title: "Ilustração 5",
    svg: (
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <rect width="44" height="44" fill="#F1ECFD" />
        <path d="M8 44c0-7.2 6.3-11.4 14-11.4S36 36.8 36 44z" fill="#FFFFFF" />
        <path d="M18.2 32.8 22 38l3.8-5.2 2 .7L22 44h-.1l-5.7-10.5z" fill="#E9EDF2" />
        <rect x="19.6" y="27.4" width="4.8" height="6" rx="2.4" fill="#5E3A24" />
        <circle cx="22" cy="20.4" r="7.6" fill="#5E3A24" />
        <circle cx="22" cy="8.6" r="2.8" fill="#120D0A" />
        <path d="M13.6 19.2c0-5.1 3.9-8.7 8.4-8.7s8.4 3.6 8.4 8.7c0 1-.3 1.5-.8 1.5-1.1 0-1.3-3.3-4.1-4.3-2.6-.9-4 .9-6.9.6-2 0-3.3 3.7-4.2 3.7-.6 0-.8-.6-.8-1.5z" fill="#120D0A" />
        <circle cx="19.2" cy="20.8" r="1" fill="#2B2B2B" />
        <circle cx="24.8" cy="20.8" r="1" fill="#2B2B2B" />
        <path d="M20.3 23.6c.9.7 2.5.7 3.4 0" stroke="#B36A5E" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M17.4 35.2v4.2a4.6 4.6 0 0 0 9.2 0v-4.2" stroke="#D0D7DE" strokeWidth="1.3" fill="none" />
        <circle cx="26.6" cy="40.4" r="1.7" fill="#E01E2B" />
      </svg>
    ),
  },
  {
    id: "preset:6",
    title: "Ilustração 6",
    svg: (
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <rect width="44" height="44" fill="#FDEFE7" />
        <path d="M8 44c0-7.2 6.3-11.4 14-11.4S36 36.8 36 44z" fill="#FFFFFF" />
        <path d="M18.2 32.8 22 38l3.8-5.2 2 .7L22 44h-.1l-5.7-10.5z" fill="#E9EDF2" />
        <rect x="19.6" y="27.4" width="4.8" height="6" rx="2.4" fill="#EFC9A4" />
        <circle cx="22" cy="20.4" r="7.6" fill="#EFC9A4" />
        <path d="M12.8 19.4c0-5.3 4.1-9 9.2-9s9.2 3.7 9.2 9c0 4-.5 7.7-1.6 7.7-.8 0-.9-3.3-1.3-5.6-.3-1.7-1.6-3-3.6-3.4-2.9-.6-4.5.8-7.4.5-1.6 0-2.3 3.3-2.6 5.6-.3 1.9-.4 2.9-1.1 2.9-1 0-.8-3.6-.8-7.7z" fill="#6E6A66" />
        <circle cx="19.2" cy="20.8" r="1" fill="#2B2B2B" />
        <circle cx="24.8" cy="20.8" r="1" fill="#2B2B2B" />
        <path d="M20.3 23.6c.9.7 2.5.7 3.4 0" stroke="#B36A5E" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M17.4 35.2v4.2a4.6 4.6 0 0 0 9.2 0v-4.2" stroke="#D0D7DE" strokeWidth="1.3" fill="none" />
        <circle cx="26.6" cy="40.4" r="1.7" fill="#E01E2B" />
      </svg>
    ),
  },
  {
    id: "preset:7",
    title: "Ilustração 7",
    svg: (
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <rect width="44" height="44" fill="#E7FAFB" />
        <path d="M8 44c0-7.2 6.3-11.4 14-11.4S36 36.8 36 44z" fill="#FFFFFF" />
        <path d="M18.2 32.8 22 38l3.8-5.2 2 .7L22 44h-.1l-5.7-10.5z" fill="#E9EDF2" />
        <rect x="19.6" y="27.4" width="4.8" height="6" rx="2.4" fill="#A86E45" />
        <circle cx="22" cy="20.4" r="7.6" fill="#A86E45" />
        <path d="M13.5 19c0-5 4-8.5 8.5-8.5S30.5 14 30.5 19c0 1-.3 1.6-.8 1.6-1.2 0-1.4-3.4-4.2-4.4-2.6-.9-4 .9-7 .6-2 0-3.3 3.8-4.3 3.8-.5 0-.7-.7-.7-1.6z" fill="#2B1D15" />
        <circle cx="19.2" cy="20.8" r="1" fill="#2B2B2B" />
        <circle cx="24.8" cy="20.8" r="1" fill="#2B2B2B" />
        <path d="M20.3 23.6c.9.7 2.5.7 3.4 0" stroke="#B36A5E" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M17.4 35.2v4.2a4.6 4.6 0 0 0 9.2 0v-4.2" stroke="#D0D7DE" strokeWidth="1.3" fill="none" />
        <circle cx="26.6" cy="40.4" r="1.7" fill="#E01E2B" />
      </svg>
    ),
  },
  {
    id: "preset:8",
    title: "Ilustração 8",
    svg: (
      <svg viewBox="0 0 44 44" xmlns="http://www.w3.org/2000/svg" className="size-full">
        <rect width="44" height="44" fill="#F6F2E7" />
        <path d="M8 44c0-7.2 6.3-11.4 14-11.4S36 36.8 36 44z" fill="#FFFFFF" />
        <path d="M18.2 32.8 22 38l3.8-5.2 2 .7L22 44h-.1l-5.7-10.5z" fill="#E9EDF2" />
        <rect x="19.6" y="27.4" width="4.8" height="6" rx="2.4" fill="#F6DCC4" />
        <circle cx="22" cy="20.4" r="7.6" fill="#F6DCC4" />
        <circle cx="22" cy="8.6" r="2.8" fill="#D1A04B" />
        <path d="M13.6 19.2c0-5.1 3.9-8.7 8.4-8.7s8.4 3.6 8.4 8.7c0 1-.3 1.5-.8 1.5-1.1 0-1.3-3.3-4.1-4.3-2.6-.9-4 .9-6.9.6-2 0-3.3 3.7-4.2 3.7-.6 0-.8-.6-.8-1.5z" fill="#D1A04B" />
        <circle cx="19.2" cy="20.8" r="1" fill="#2B2B2B" />
        <circle cx="24.8" cy="20.8" r="1" fill="#2B2B2B" />
        <path d="M20.3 23.6c.9.7 2.5.7 3.4 0" stroke="#B36A5E" strokeWidth="1" fill="none" strokeLinecap="round" />
        <path d="M17.4 35.2v4.2a4.6 4.6 0 0 0 9.2 0v-4.2" stroke="#D0D7DE" strokeWidth="1.3" fill="none" />
        <circle cx="26.6" cy="40.4" r="1.7" fill="#E01E2B" />
      </svg>
    ),
  },
];

export function PersonaAvatar({
  avatar,
  name,
  className,
}: {
  avatar?: string | null;
  name?: string;
  className?: string;
}) {
  if (!avatar) {
    const initials = name
      ? name
          .split(" ")
          .map((n) => n[0])
          .filter(Boolean)
          .slice(0, 2)
          .join("")
          .toUpperCase()
      : "Dr";

    return (
      <div
        className={cn(
          "size-10 shrink-0 rounded-full bg-rose-50 text-[#e2263c] flex items-center justify-center font-bold text-xs border border-rose-200",
          className,
        )}
      >
        {initials}
      </div>
    );
  }

  if (avatar.startsWith("preset:")) {
    const found = PRESET_AVATARS.find((p) => p.id === avatar);
    if (found) {
      return (
        <div
          className={cn(
            "size-10 shrink-0 rounded-full overflow-hidden border border-slate-200 bg-white",
            className,
          )}
        >
          {found.svg}
        </div>
      );
    }
  }

  // Foto / URL / Data URL
  return (
    <div
      className={cn(
        "size-10 shrink-0 rounded-full overflow-hidden border border-rose-200 bg-white",
        className,
      )}
    >
      <img src={avatar} alt="Avatar da persona" className="size-full object-cover" />
    </div>
  );
}

export function PersonaAvatarPicker({
  initialValue,
  onChange,
}: {
  initialValue?: string | null;
  onChange?: (val: string) => void;
}) {
  const [selected, setSelected] = useState<string>(initialValue ?? "");
  const [customPhotoUrl, setCustomPhotoUrl] = useState<string | null>(
    initialValue && !initialValue.startsWith("preset:") ? initialValue : null,
  );
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleSelectPreset(id: string) {
    const next = selected === id ? "" : id;
    setSelected(next);
    onChange?.(next);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    // Redimensionar para thumbnail leve em canvas (256x256 max)
    const reader = new FileReader();
    reader.onload = (ev) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement("canvas");
        const size = Math.min(img.width, img.height);
        canvas.width = 200;
        canvas.height = 200;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          const sx = (img.width - size) / 2;
          const sy = (img.height - size) / 2;
          ctx.drawImage(img, sx, sy, size, size, 0, 0, 200, 200);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.85);
          setCustomPhotoUrl(dataUrl);
          setSelected(dataUrl);
          onChange?.(dataUrl);
        }
      };
      img.src = ev.target?.result as string;
    };
    reader.readAsDataURL(file);
  }

  function handleClear() {
    setSelected("");
    setCustomPhotoUrl(null);
    if (fileInputRef.current) fileInputRef.current.value = "";
    onChange?.("");
  }

  return (
    <div className="space-y-2">
      <input type="hidden" name="avatar" value={selected} />

      <div className="flex flex-wrap items-center gap-2">
        {PRESET_AVATARS.map((p) => {
          const isPressed = selected === p.id;
          return (
            <button
              key={p.id}
              type="button"
              title={p.title}
              onClick={() => handleSelectPreset(p.id)}
              className={cn(
                "size-11 shrink-0 rounded-full border-2 overflow-hidden transition-all duration-150 cursor-pointer shadow-2xs",
                isPressed
                  ? "border-[#e2263c] ring-3 ring-rose-200/80 scale-105"
                  : "border-transparent hover:border-slate-300 hover:scale-102",
              )}
            >
              {p.svg}
            </button>
          );
        })}

        {/* Botão de Upload de Foto Própria */}
        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          title="Subir foto da persona"
          className={cn(
            "size-11 shrink-0 rounded-full border-2 transition-all flex items-center justify-center cursor-pointer shadow-2xs overflow-hidden",
            customPhotoUrl && selected === customPhotoUrl
              ? "border-[#e2263c] ring-3 ring-rose-200/80"
              : "border-dashed border-slate-300 bg-white hover:border-[#e2263c] hover:text-[#e2263c] text-slate-400",
          )}
        >
          {customPhotoUrl ? (
            <img src={customPhotoUrl} alt="Foto enviada" className="size-full object-cover" />
          ) : (
            <Plus className="size-5" />
          )}
        </button>

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          className="hidden"
          onChange={handleFileChange}
        />

        {selected ? (
          <button
            type="button"
            onClick={handleClear}
            className="text-xs font-semibold text-slate-400 hover:text-rose-600 transition underline ml-1 cursor-pointer"
          >
            limpar
          </button>
        ) : null}
      </div>
      <p className="text-[11px] text-slate-500">
        8 ilustrações médicas prontas ou clique no <strong>+</strong> para subir uma foto própria (PNG/JPG).
      </p>
    </div>
  );
}
