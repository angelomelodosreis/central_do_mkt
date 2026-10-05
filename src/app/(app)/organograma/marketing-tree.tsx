"use client";

import { useState, useRef, useEffect, useCallback, useMemo } from "react";
import {
  Minus,
  Plus,
  Maximize2,
  Minimize2,
  RotateCcw,
  Focus,
  Eye,
  EyeOff,
  Move,
  Building2,
  Users,
  Compass,
  Sparkles,
} from "lucide-react";
import type { OrgPerson, OrgUnit } from "./types";
import { Avatar } from "@/components/org/person-card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/card";
import { cn } from "@/lib/utils/cn";
import { plural, matchesSearch } from "@/lib/utils/text";

/**
 * Canvas Interativo Estilo Figma / FigJam para o Organograma do Marketing
 *
 * Funcionalidades:
 * - Arrastar livremente o canvas (Pan) em 360° com mouse ou touch
 * - Zoom in / Zoom out suave com scroll, gestos ou botões flutuantes
 * - Fundo com grid pontilhado (dot-grid) dinâmico que acompanha o movimento
 * - Centralização e ajuste automático na tela (Fit View)
 * - Modo Tela Cheia (Fullscreen)
 * - Filtro rápido por área e opção de ocultar unidades vazias
 * - Destaque em tempo real para pessoas buscadas
 */
export function MarketingTree({
  people,
  units,
  onOpenPerson,
  searchTerm = "",
}: {
  people: OrgPerson[];
  units: OrgUnit[];
  onOpenPerson: (userId: string) => void;
  searchTerm?: string;
}) {
  const containerRef = useRef<HTMLDivElement>(null);
  const contentRef = useRef<HTMLDivElement>(null);

  // Estados de transformação do canvas (Pan e Zoom)
  const [pan, setPan] = useState({ x: 0, y: 40 });
  const [zoom, setZoom] = useState(0.9);
  const [isDragging, setIsDragging] = useState(false);
  const [dragStart, setDragStart] = useState({ x: 0, y: 0 });
  const [panStart, setPanStart] = useState({ x: 0, y: 40 });
  const [hasDragged, setHasDragged] = useState(false);

  // Estados de visualização
  const [isFullscreen, setIsFullscreen] = useState(false);
  const [hideEmpty, setHideEmpty] = useState(false);
  const [selectedAreaId, setSelectedAreaId] = useState<string | null>(null);

  // Contagem de pessoas por time e área (incluindo subtimes)
  const teamMemberCounts = useMemo(() => {
    const counts = new Map<string, number>();
    for (const unit of units) {
      const count = people.filter((p) =>
        p.positions.some((pos) => pos.teamId === unit.id),
      ).length;
      counts.set(unit.id, count);
    }
    return counts;
  }, [people, units]);

  // Contagem recursiva de membros sob uma área raiz
  const getSubtreeCount = useCallback(
    (rootId: string): number => {
      let total = teamMemberCounts.get(rootId) ?? 0;
      const children = units.filter((u) => u.parentOrgUnitId === rootId);
      for (const child of children) {
        total += getSubtreeCount(child.id);
      }
      return total;
    },
    [teamMemberCounts, units],
  );

  // Unidades raiz
  const raizes = useMemo(() => {
    return units.filter((unit) => !unit.parentOrgUnitId);
  }, [units]);

  // Raízes filtradas conforme seleção de área ou opção de ocultar vazios
  const raizesVisiveis = useMemo(() => {
    return raizes.filter((raiz) => {
      if (selectedAreaId && raiz.id !== selectedAreaId) return false;
      if (hideEmpty && getSubtreeCount(raiz.id) === 0) return false;
      return true;
    });
  }, [raizes, selectedAreaId, hideEmpty, getSubtreeCount]);

  // Função para centralizar o organograma na tela (Fit View)
  const fitView = useCallback(() => {
    if (!containerRef.current || !contentRef.current) return;
    const container = containerRef.current;
    const content = contentRef.current;

    const containerWidth = container.clientWidth;
    const containerHeight = container.clientHeight;
    const contentWidth = content.scrollWidth;
    const contentHeight = content.scrollHeight;

    if (contentWidth === 0 || contentHeight === 0) return;

    // Calcula escala ideal com folga
    const scaleX = (containerWidth - 80) / contentWidth;
    const scaleY = (containerHeight - 120) / contentHeight;
    const targetZoom = Math.min(Math.max(Math.min(scaleX, scaleY), 0.45), 1.1);

    const targetX = Math.round((containerWidth - contentWidth * targetZoom) / 2);
    const targetY = 50;

    setZoom(targetZoom);
    setPan({ x: targetX, y: targetY });
  }, []);

  // Centralização inicial automática após renderização
  useEffect(() => {
    const timer = setTimeout(() => {
      fitView();
    }, 150);
    return () => clearTimeout(timer);
  }, [fitView, raizesVisiveis.length]);

  // Controle de Pan por Mouse (Arrastar o Canvas)
  const handleMouseDown = (e: React.MouseEvent) => {
    // Se clicou com botão direito ou em elemento que não permite arrasto, ignora
    if (e.button !== 0) return;

    setIsDragging(true);
    setHasDragged(false);
    setDragStart({ x: e.clientX, y: e.clientY });
    setPanStart({ ...pan });
  };

  const handleMouseMove = useCallback(
    (e: MouseEvent) => {
      if (!isDragging) return;
      const dx = e.clientX - dragStart.x;
      const dy = e.clientY - dragStart.y;

      if (Math.hypot(dx, dy) > 5) {
        setHasDragged(true);
      }

      setPan({
        x: panStart.x + dx,
        y: panStart.y + dy,
      });
    },
    [isDragging, dragStart, panStart],
  );

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    // Pequeno atraso para não acionar clique se houve arrasto
    setTimeout(() => setHasDragged(false), 50);
  }, []);

  useEffect(() => {
    if (isDragging) {
      window.addEventListener("mousemove", handleMouseMove);
      window.addEventListener("mouseup", handleMouseUp);
      return () => {
        window.removeEventListener("mousemove", handleMouseMove);
        window.removeEventListener("mouseup", handleMouseUp);
      };
    }
  }, [isDragging, handleMouseMove, handleMouseUp]);

  // Controle de Zoom por Roda do Mouse (Padrão Figma: wheel pan / ctrl+wheel zoom)
  const handleWheel = (e: React.WheelEvent) => {
    e.preventDefault();
    if (!containerRef.current) return;

    if (e.ctrlKey || e.metaKey) {
      // Zoom focalizado na posição do cursor
      const rect = containerRef.current.getBoundingClientRect();
      const mouseX = e.clientX - rect.left;
      const mouseY = e.clientY - rect.top;

      const zoomFactor = e.deltaY < 0 ? 1.1 : 0.9;
      const nextZoom = Math.min(Math.max(zoom * zoomFactor, 0.3), 2.2);

      // Compensa o pan para manter o ponto sob o mouse estático
      const newX = mouseX - (mouseX - pan.x) * (nextZoom / zoom);
      const newY = mouseY - (mouseY - pan.y) * (nextZoom / zoom);

      setZoom(nextZoom);
      setPan({ x: Math.round(newX), y: Math.round(newY) });
    } else {
      // Pan livre com roda / trackpad
      setPan((prev) => ({
        x: Math.round(prev.x - e.deltaX * 0.9),
        y: Math.round(prev.y - e.deltaY * 0.9),
      }));
    }
  };

  // Controles manuais de zoom
  const handleZoomIn = () => setZoom((z) => Math.min(Number((z + 0.15).toFixed(2)), 2.2));
  const handleZoomOut = () => setZoom((z) => Math.max(Number((z - 0.15).toFixed(2)), 0.3));
  const handleZoomReset = () => {
    setZoom(1);
    fitView();
  };

  if (units.length === 0) {
    return (
      <EmptyState
        title="Nenhuma área ou time cadastrado"
        description="A estrutura é montada a partir de áreas, subáreas e times. Cadastre-os em Administração › Organização."
      />
    );
  }

  return (
    <div
      className={cn(
        "relative flex flex-col rounded-2xl border border-slate-200/90 bg-slate-50/50 shadow-xs overflow-hidden transition-all duration-300",
        isFullscreen
          ? "fixed inset-0 z-50 rounded-none border-0 h-screen w-screen bg-slate-100"
          : "h-[calc(100vh-280px)] min-h-[620px]",
      )}
    >
      {/* Barra Superior do Canvas: Filtros de Área & Dicas Figma */}
      <div className="z-20 flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/80 bg-white/90 px-4 py-2.5 backdrop-blur-md">
        {/* Filtros Rápidos de Áreas Raiz */}
        <div className="flex flex-wrap items-center gap-1.5">
          <span className="mr-1 flex items-center gap-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">
            <Compass className="size-3.5 text-brand-600" />
            <span>Foco:</span>
          </span>
          <button
            type="button"
            onClick={() => setSelectedAreaId(null)}
            className={cn(
              "rounded-lg px-2.5 py-1 text-xs font-semibold transition shadow-2xs border",
              selectedAreaId === null
                ? "bg-brand-600 text-white border-brand-600 shadow-brand-100"
                : "bg-white text-slate-700 border-slate-200 hover:bg-slate-50",
            )}
          >
            Todas as Áreas ({people.length})
          </button>
          {raizes.map((raiz) => {
            const count = getSubtreeCount(raiz.id);
            return (
              <button
                key={raiz.id}
                type="button"
                onClick={() => setSelectedAreaId(raiz.id)}
                className={cn(
                  "rounded-lg px-2.5 py-1 text-xs font-medium transition shadow-2xs border",
                  selectedAreaId === raiz.id
                    ? "bg-brand-600 text-white border-brand-600"
                    : count > 0
                      ? "bg-white text-slate-800 border-slate-200 hover:bg-slate-50 font-semibold"
                      : "bg-slate-100/70 text-slate-400 border-slate-200/60 hover:bg-slate-100",
                )}
              >
                {raiz.name}
                <span className="ml-1 opacity-70">({count})</span>
              </button>
            );
          })}
        </div>

        {/* Dica Figma & Alternador de Vazios */}
        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => setHideEmpty((v) => !v)}
            className={cn(
              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-medium transition border shadow-2xs",
              hideEmpty
                ? "border-amber-200 bg-amber-50 text-amber-900"
                : "border-slate-200 bg-white text-slate-600 hover:bg-slate-50",
            )}
            title={hideEmpty ? "Exibindo apenas áreas com pessoas" : "Ocultar áreas sem membros cadastrados"}
          >
            {hideEmpty ? <EyeOff className="size-3.5 text-amber-600" /> : <Eye className="size-3.5 text-slate-400" />}
            <span>{hideEmpty ? "Ocultando Vazios" : "Ocultar Vazios"}</span>
          </button>

          <div className="hidden items-center gap-1 text-[11px] font-medium text-slate-400 lg:flex">
            <Move className="size-3 text-slate-400" />
            <span>Arraste o fundo para mover • Scroll para zoom</span>
          </div>
        </div>
      </div>

      {/* ÁREA DO CANVAS (Navegável, com background dot-grid dinâmico) */}
      <div
        ref={containerRef}
        onMouseDown={handleMouseDown}
        onWheel={handleWheel}
        className={cn(
          "relative flex-1 select-none overflow-hidden touch-none",
          isDragging ? "cursor-grabbing" : "cursor-grab",
        )}
        style={{
          backgroundColor: "#f8fafc",
          backgroundImage: "radial-gradient(circle, #cbd5e1 1.25px, transparent 1.25px)",
          backgroundSize: `${Math.round(24 * zoom)}px ${Math.round(24 * zoom)}px`,
          backgroundPosition: `${pan.x}px ${pan.y}px`,
        }}
      >
        {/* Conteúdo Transformado do Organograma */}
        <div
          ref={contentRef}
          className="absolute left-0 top-0 origin-top-left transition-transform duration-75 will-change-transform"
          style={{
            transform: `translate3d(${pan.x}px, ${pan.y}px, 0) scale(${zoom})`,
          }}
        >
          <div className="flex w-max items-start justify-center gap-14 p-12">
            {raizesVisiveis.map((raiz) => (
              <TeamNode
                key={raiz.id}
                team={raiz}
                units={units}
                people={people}
                onOpenPerson={onOpenPerson}
                nivel={0}
                hasDragged={hasDragged}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        </div>
      </div>

      {/* Barra de Ferramentas Flutuante Estilo Figma (Zoom, Centralizar, Tela Cheia) */}
      <div className="absolute bottom-5 right-5 z-30 flex items-center gap-1 rounded-2xl border border-slate-200/90 bg-white/95 p-1.5 shadow-xl backdrop-blur-md">
        <button
          type="button"
          onClick={handleZoomOut}
          className="flex size-7.5 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          title="Diminuir Zoom (-)"
        >
          <Minus className="size-4" />
        </button>

        <button
          type="button"
          onClick={handleZoomReset}
          className="min-w-13 px-2 py-1 text-center font-mono text-xs font-bold text-slate-700 hover:bg-slate-100 rounded-lg transition"
          title="Clique para redefinir para 100%"
        >
          {Math.round(zoom * 100)}%
        </button>

        <button
          type="button"
          onClick={handleZoomIn}
          className="flex size-7.5 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          title="Aumentar Zoom (+)"
        >
          <Plus className="size-4" />
        </button>

        <div className="mx-1 h-4 w-px bg-slate-200" />

        <button
          type="button"
          onClick={fitView}
          className="flex items-center gap-1 rounded-xl px-2.5 py-1 text-xs font-semibold text-slate-700 hover:bg-slate-100 transition"
          title="Centralizar e ajustar organograma na tela (Fit View)"
        >
          <Focus className="size-3.5 text-brand-600" />
          <span>Ajustar</span>
        </button>

        <button
          type="button"
          onClick={() => setIsFullscreen((f) => !f)}
          className="flex size-7.5 items-center justify-center rounded-xl text-slate-600 hover:bg-slate-100 hover:text-slate-900 transition"
          title={isFullscreen ? "Sair da Tela Cheia" : "Modo Tela Cheia (Figma)"}
        >
          {isFullscreen ? <Minimize2 className="size-4 text-brand-600" /> : <Maximize2 className="size-4" />}
        </button>
      </div>

      {/* Indicador Flutuante no Canto Inferior Esquerdo */}
      <div className="absolute bottom-5 left-5 z-20 hidden sm:flex items-center gap-2 rounded-xl border border-slate-200/80 bg-white/90 px-3 py-1.5 text-xs text-slate-600 shadow-sm backdrop-blur-md">
        <span className="size-2 rounded-full bg-emerald-500 animate-pulse" />
        <span className="font-semibold text-slate-800">Organograma Interativo</span>
        <span className="text-slate-400">•</span>
        <span className="text-slate-500">{people.length} colaboradores ativos</span>
      </div>
    </div>
  );
}

function TeamNode({
  team,
  units,
  people,
  onOpenPerson,
  nivel,
  hasDragged,
  searchTerm,
}: {
  team: OrgUnit;
  units: OrgUnit[];
  people: OrgPerson[];
  onOpenPerson: (userId: string) => void;
  nivel: number;
  hasDragged: boolean;
  searchTerm?: string;
}) {
  const filhos = units.filter((item) => item.parentOrgUnitId === team.id);

  const doTime = people
    .filter((person) =>
      person.positions.some((position) => position.teamId === team.id),
    )
    .sort((a, b) => {
      const pa = a.positions.find((p) => p.teamId === team.id)!;
      const pb = b.positions.find((p) => p.teamId === team.id)!;
      return (
        Number(pb.isLead) - Number(pa.isLead) ||
        a.jobTitleOrder - b.jobTitleOrder ||
        a.name.localeCompare(b.name, "pt-BR")
      );
    });

  const lider = doTime.find((person) =>
    person.positions.some(
      (position) => position.teamId === team.id && position.isLead,
    ),
  );
  const equipe = doTime.filter((person) => person.userId !== lider?.userId);

  const isRoot = nivel === 0;
  const isSubArea = nivel === 1;

  // Destaque se o time tem membros correspondentes à busca
  const hasSearchMatch =
    Boolean(searchTerm?.trim()) &&
    doTime.some((p) => matchesSearch(searchTerm!, p.name, p.jobTitleName ?? ""));

  return (
    <div className="flex flex-col items-center">
      {/* Cartão da Unidade / Time */}
      <div
        className={cn(
          "min-w-64 max-w-72 rounded-2xl border p-4 text-center transition-all duration-200 shadow-sm",
          isRoot
            ? "border-brand-500/70 bg-gradient-to-b from-brand-50/80 to-white ring-4 ring-brand-100/60 shadow-md"
            : isSubArea
              ? "border-blue-300 bg-white ring-2 ring-blue-50 shadow-sm"
              : "border-slate-200/90 bg-white hover:border-slate-300",
          hasSearchMatch && "ring-4 ring-amber-400/80 border-amber-500",
        )}
      >
        {/* Tag de Nível Hierárquico */}
        <div className="mb-1 flex items-center justify-between">
          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-bold tracking-wider uppercase",
              isRoot
                ? "bg-brand-600 text-white"
                : isSubArea
                  ? "bg-blue-100 text-blue-800"
                  : "bg-slate-100 text-slate-600",
            )}
          >
            {isRoot ? "Área Executiva" : isSubArea ? "Subárea" : "Time"}
          </span>

          <span
            className={cn(
              "rounded-full px-2 py-0.5 text-[10px] font-semibold",
              doTime.length > 0
                ? "bg-emerald-50 text-emerald-700 font-bold"
                : "bg-slate-100 text-slate-400",
            )}
          >
            {doTime.length === 0 ? "Sem equipe" : plural(doTime.length, "pessoa")}
          </span>
        </div>

        <h4 className="font-display text-base font-bold text-slate-900 truncate">
          {team.name}
        </h4>
      </div>

      {/* Líder da Unidade */}
      {lider ? (
        <>
          <Conector />
          <PersonNode
            person={lider}
            teamId={team.id}
            onOpen={onOpenPerson}
            destaque
            hasDragged={hasDragged}
            searchTerm={searchTerm}
          />
        </>
      ) : null}

      {/* Membros da Equipe */}
      {equipe.length > 0 ? (
        <>
          <Conector />
          <div className="flex flex-col gap-2">
            {equipe.map((person) => (
              <PersonNode
                key={person.userId}
                person={person}
                teamId={team.id}
                onOpen={onOpenPerson}
                hasDragged={hasDragged}
                searchTerm={searchTerm}
              />
            ))}
          </div>
        </>
      ) : null}

      {/* Subtimes e ramificações filhas */}
      {filhos.length > 0 ? (
        <>
          <Conector />
          <div className="relative flex gap-8 pt-5">
            {/* Linha horizontal conectando as ramificações filhas */}
            {filhos.length > 1 ? (
              <span
                aria-hidden
                className="absolute left-0 right-0 top-0 h-0.5 bg-slate-300 rounded-full"
                style={{
                  left: `calc(100% / ${filhos.length * 2})`,
                  right: `calc(100% / ${filhos.length * 2})`,
                }}
              />
            ) : null}
            {filhos.map((filho) => (
              <div key={filho.id} className="relative flex flex-col items-center">
                {filhos.length > 1 ? (
                  <span
                    aria-hidden
                    className="absolute -top-5 h-5 w-0.5 bg-slate-300 rounded-full"
                  />
                ) : null}
                <TeamNode
                  team={filho}
                  units={units}
                  people={people}
                  onOpenPerson={onOpenPerson}
                  nivel={nivel + 1}
                  hasDragged={hasDragged}
                  searchTerm={searchTerm}
                />
              </div>
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}

function PersonNode({
  person,
  teamId,
  onOpen,
  destaque = false,
  hasDragged,
  searchTerm,
}: {
  person: OrgPerson;
  teamId: string;
  onOpen: (userId: string) => void;
  destaque?: boolean;
  hasDragged: boolean;
  searchTerm?: string;
}) {
  const outros = person.positions.filter((item) => item.teamId !== teamId);
  const isMatch = Boolean(searchTerm?.trim()) && matchesSearch(searchTerm!, person.name, person.jobTitleName ?? "");

  const handleClick = (e: React.MouseEvent) => {
    // Evita abrir a gaveta se o usuário estava arrastando o canvas
    if (hasDragged) {
      e.stopPropagation();
      return;
    }
    onOpen(person.userId);
  };

  return (
    <button
      type="button"
      onClick={handleClick}
      className={cn(
        "group flex w-60 items-center gap-2.5 rounded-xl border bg-white px-3 py-2 text-left shadow-2xs transition-all hover:scale-[1.02] hover:shadow-md cursor-pointer",
        destaque
          ? "border-brand-400 bg-brand-50/40 border-l-4 border-l-brand-600 font-medium shadow-brand-50"
          : "border-slate-200 hover:border-brand-300 hover:bg-slate-50/60",
        isMatch && "ring-3 ring-amber-400 border-amber-500 bg-amber-50/40",
      )}
    >
      <Avatar name={person.name} size="sm" />
      <span className="min-w-0 flex-1">
        <span className="flex items-center gap-1">
          <span className="block truncate text-xs font-bold text-slate-900 group-hover:text-brand-700 transition-colors">
            {person.name}
          </span>
          {destaque ? (
            <span className="rounded bg-brand-100 px-1 py-0.2 text-[9px] font-bold text-brand-800 uppercase">
              Líder
            </span>
          ) : null}
        </span>
        <span className="block truncate text-[11px] text-slate-500 font-medium">
          {person.jobTitleName ?? "Sem cargo oficial"}
        </span>
      </span>
      {outros.length > 0 ? (
        <Badge tone="neutral" className="text-[10px] font-semibold">
          +{outros.length}
        </Badge>
      ) : null}
    </button>
  );
}

function Conector() {
  return <span aria-hidden className="h-5 w-0.5 bg-slate-300 rounded-full" />;
}
