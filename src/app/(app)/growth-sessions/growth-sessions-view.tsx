"use client";

import { useEffect, useMemo, useState } from "react";
import { toast } from "sonner";
import {
  ArrowUpRight,
  BookOpen,
  CheckCircle2,
  Circle,
  Copy,
  ExternalLink,
  Eye,
  EyeOff,
  FileText,
  Filter,
  GraduationCap,
  LayoutGrid,
  Link as LinkIcon,
  MonitorPlay,
  Play,
  Plus,
  Presentation,
  Search,
  Share2,
  Sparkles,
  Video,
  Wrench,
} from "lucide-react";

import { Avatar } from "@/components/org/person-card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardBody, CardHeader, EmptyState, PageHeader } from "@/components/ui/card";
import { Input } from "@/components/ui/field";
import { PillTabs } from "@/components/ui/tabs";
import type { GrowthSessionView } from "@/lib/modules/growth-sessions/queries";
import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";
import { GrowthSessionDrawer } from "./growth-session-drawer";

const WATCHED_KEY = "growth_sessions_watched_ids";

export function GrowthSessionsView({
  initialSessions,
}: {
  initialSessions: GrowthSessionView[];
}) {
  const [sessions, setSessions] = useState<GrowthSessionView[]>(initialSessions);
  const [selectedId, setSelectedId] = useState<string>(
    initialSessions[0]?.id ?? "",
  );
  const [search, setSearch] = useState("");
  const [category, setCategory] = useState<string>("all");
  const [viewMode, setViewMode] = useState<"player" | "grid">("player");
  const [watchedIds, setWatchedIds] = useState<string[]>([]);
  const [isDrawerOpen, setIsDrawerOpen] = useState(false);

  // Carrega IDs assistidos do localStorage e respeita hash deep-linking
  useEffect(() => {
    try {
      const saved = localStorage.getItem(WATCHED_KEY);
      if (saved) {
        setWatchedIds(JSON.parse(saved));
      }
    } catch {
      // ignore JSON error
    }

    if (typeof window !== "undefined") {
      const hash = window.location.hash.replace("#", "").trim();
      if (hash) {
        const found = initialSessions.find(
          (s) => s.id === hash || String(s.uploadOrder) === hash,
        );
        if (found) {
          setSelectedId(found.id);
        }
      }
    }
  }, [initialSessions]);

  // Atualiza sessions se initialSessions mudar (ex: revalidação após criar)
  useEffect(() => {
    setSessions(initialSessions);
  }, [initialSessions]);

  // Categorias disponíveis para o PillTabs
  const categoriesList = useMemo(() => {
    const counts = new Map<string, number>();
    for (const s of sessions) {
      counts.set(s.category, (counts.get(s.category) ?? 0) + 1);
    }
    const list = Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .map(([name, count]) => ({
        value: name,
        label: name,
        count,
      }));

    return [{ value: "all", label: "Todas", count: sessions.length }, ...list];
  }, [sessions]);

  // Sessões filtradas por busca e categoria
  const filteredSessions = useMemo(() => {
    return sessions.filter((s) => {
      if (category !== "all" && s.category !== category) return false;
      if (!search.trim()) return true;
      return matchesSearch(
        search,
        s.title,
        s.theme,
        s.presenter,
        s.category,
        s.description,
        s.date,
      );
    });
  }, [sessions, category, search]);

  // Sessão atualmente ativa
  const currentSession = useMemo(() => {
    return (
      filteredSessions.find((s) => s.id === selectedId) ??
      filteredSessions[0] ??
      sessions[0]
    );
  }, [filteredSessions, selectedId, sessions]);

  // Alterna o status de assistido da sessão
  function toggleWatched(id: string) {
    setWatchedIds((prev) => {
      const next = prev.includes(id)
        ? prev.filter((item) => item !== id)
        : [...prev, id];
      try {
        localStorage.setItem(WATCHED_KEY, JSON.stringify(next));
      } catch {
        // ignore
      }
      return next;
    });
  }

  // Seleciona uma sessão e atualiza a URL
  function handleSelectSession(id: string) {
    setSelectedId(id);
    if (typeof window !== "undefined") {
      window.history.replaceState(null, "", `#${id}`);
    }
    if (viewMode === "grid") {
      setViewMode("player");
    }
  }

  // Compartilha o link direto para a sessão
  function handleShare(s: GrowthSessionView) {
    if (typeof window === "undefined") return;
    const url = `${window.location.origin}${window.location.pathname}#${s.id}`;
    navigator.clipboard
      .writeText(url)
      .then(() => {
        toast.success(`Link copiado para "${s.title}"!`);
      })
      .catch(() => {
        toast.error("Não foi possível copiar o link.");
      });
  }

  // Estatísticas do módulo
  const totalSessions = sessions.length;
  const watchedCount = watchedIds.filter((id) =>
    sessions.some((s) => s.id === id),
  ).length;
  const watchedPercent =
    totalSessions > 0 ? Math.round((watchedCount / totalSessions) * 100) : 0;
  const totalCategories = categoriesList.length - 1; // desconta "all"

  return (
    <div className="space-y-6">
      {/* Cabeçalho da Página */}
      <PageHeader
        title="Growth Sessions"
        description="Treinamentos práticos, playbooks e capacitações contínuas da equipe de Growth MedCof."
        action={
          <Button
            type="button"
            variant="primary"
            onClick={() => setIsDrawerOpen(true)}
            className="shadow-sm"
          >
            <Plus className="mr-1.5 size-4" /> Subir Growth Session
          </Button>
        }
      />

      {/* Barra de Indicadores & Progresso */}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Total de Treinamentos</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">
            {totalSessions}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            sessões catalogadas no acervo
          </p>
        </Card>

        <Card className="p-4">
          <div className="flex items-center justify-between">
            <p className="text-xs font-medium text-slate-500">Você Assistiu</p>
            <span className="text-xs font-semibold text-brand-700">
              {watchedPercent}%
            </span>
          </div>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">
            {watchedCount}{" "}
            <span className="text-sm font-normal text-slate-500">
              / {totalSessions}
            </span>
          </p>
          <div className="mt-2 h-1.5 w-full overflow-hidden rounded-full bg-slate-100">
            <div
              className="h-full rounded-full bg-brand-600 transition-all duration-500"
              style={{ width: `${watchedPercent}%` }}
            />
          </div>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Áreas de Conhecimento</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">
            {totalCategories}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            mídia, estratégia, analytics, CRM...
          </p>
        </Card>

        <Card className="p-4">
          <p className="text-xs font-medium text-slate-500">Materiais & Atas</p>
          <p className="mt-1 font-display text-2xl font-bold text-slate-900">
            {sessions.reduce(
              (acc, s) =>
                acc +
                (s.summaryUrl ? 1 : 0) +
                (s.presentationUrl ? 1 : 0) +
                (s.toolUrl ? 1 : 0) +
                s.parsedLinks.length,
              0,
            )}
          </p>
          <p className="mt-0.5 text-[11px] text-slate-500">
            slides, atas e playbooks anexos
          </p>
        </Card>
      </div>

      {/* Controles de Busca, Filtro e Visualização */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <div className="min-w-64 flex-1">
            <div className="relative">
              <Search className="pointer-events-none absolute left-3 top-2.5 size-4 text-slate-400" />
              <Input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Buscar por tema, apresentador, categoria ou palavra-chave..."
                className="pl-9"
              />
            </div>
          </div>

          {/* Toggle de Modo de Visualização */}
          <div className="flex items-center gap-1 rounded-xl bg-slate-100 p-1">
            <button
              type="button"
              onClick={() => setViewMode("player")}
              aria-label="Modo Player"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "player"
                  ? "bg-white text-brand-700 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <MonitorPlay className="size-3.5" /> Modo Player
            </button>
            <button
              type="button"
              onClick={() => setViewMode("grid")}
              aria-label="Modo Grade"
              className={cn(
                "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-medium transition-colors",
                viewMode === "grid"
                  ? "bg-white text-brand-700 shadow-2xs font-semibold"
                  : "text-slate-600 hover:text-slate-900",
              )}
            >
              <LayoutGrid className="size-3.5" /> Grade ({filteredSessions.length})
            </button>
          </div>
        </div>

        {/* Abas de Categorias */}
        <PillTabs
          value={category}
          onChange={setCategory}
          items={categoriesList}
        />
      </div>

      {/* Caso vazio */}
      {filteredSessions.length === 0 ? (
        <Card>
          <CardBody>
            <EmptyState
              title="Nenhuma Growth Session encontrada"
              description="Tente ajustar os filtros de categoria ou a busca por palavras-chave."
              action={
                <Button
                  type="button"
                  variant="ghost"
                  onClick={() => {
                    setSearch("");
                    setCategory("all");
                  }}
                >
                  Limpar Filtros
                </Button>
              }
            />
          </CardBody>
        </Card>
      ) : viewMode === "player" ? (
        /* MODO PLAYER: Reprodutor em destaque + Playlist lateral */
        <div className="grid grid-cols-1 items-start gap-6 lg:grid-cols-12">
          {/* Coluna Principal: Player e Detalhes da Sessão (8 colunas) */}
          <div className="space-y-5 lg:col-span-8">
            {/* Player Container */}
            <div className="overflow-hidden rounded-2xl border border-slate-200 bg-slate-950 shadow-sm">
              {currentSession.youtubeId ? (
                <div className="relative aspect-video w-full bg-black">
                  <iframe
                    src={`https://www.youtube-nocookie.com/embed/${currentSession.youtubeId}?rel=0&modestbranding=1&color=white`}
                    title={currentSession.title}
                    allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    className="absolute inset-0 size-full border-0"
                  />
                </div>
              ) : currentSession.videoUrl ? (
                <div className="flex aspect-video w-full flex-col items-center justify-center bg-slate-900 p-6 text-center text-white">
                  <div className="rounded-full bg-brand-600/20 p-4 text-brand-400">
                    <Video className="size-10" />
                  </div>
                  <h3 className="mt-4 font-semibold text-slate-100">
                    Gravação externa disponível
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-slate-400">
                    Este treinamento está hospedado em link externo (Loom, Google Drive ou servidor de vídeo).
                  </p>
                  <a
                    href={currentSession.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="mt-4 inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-sm hover:bg-brand-700"
                  >
                    <ExternalLink className="size-4" /> Abrir Gravação
                  </a>
                </div>
              ) : (
                /* Sessão Documental sem vídeo */
                <div className="flex aspect-video w-full flex-col items-center justify-center bg-gradient-to-br from-slate-900 via-brand-950 to-slate-900 p-6 text-center text-white">
                  <div className="rounded-full bg-brand-500/20 p-4 text-brand-300">
                    <BookOpen className="size-10" />
                  </div>
                  <Badge tone="brand" className="mt-3">
                    Playbook & Sessão Documental
                  </Badge>
                  <h3 className="mt-3 text-lg font-bold text-white">
                    {currentSession.theme}
                  </h3>
                  <p className="mt-1 max-w-md text-xs text-slate-300">
                    Esta capacitação foi estruturada em documentos, atas e templates anexos logo abaixo.
                  </p>
                </div>
              )}
            </div>

            {/* Cabeçalho de Ações e Metadados da Sessão Ativa */}
            <Card className="p-5">
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0 flex-1 space-y-1.5">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-bold text-brand-700 bg-brand-50 px-2 py-0.5 rounded-md border border-brand-200/60">
                      #{currentSession.uploadOrder}
                    </span>
                    <Badge tone="neutral">{currentSession.category}</Badge>
                    <span className="text-xs text-slate-500">
                      {currentSession.date}
                      {currentSession.time ? ` · ${currentSession.time}` : ""}
                    </span>
                  </div>

                  <h2 className="font-display text-xl font-bold tracking-tight text-slate-900">
                    {currentSession.title}
                  </h2>

                  <p className="text-sm font-medium text-slate-600">
                    Tema: <span className="text-slate-900">{currentSession.theme}</span>
                  </p>
                </div>

                {/* Botões de Ação */}
                <div className="flex shrink-0 flex-wrap items-center gap-2">
                  <Button
                    type="button"
                    variant={
                      watchedIds.includes(currentSession.id) ? "primary" : "secondary"
                    }
                    size="sm"
                    onClick={() => toggleWatched(currentSession.id)}
                    className="gap-1.5"
                  >
                    <CheckCircle2
                      className={cn(
                        "size-4",
                        watchedIds.includes(currentSession.id)
                          ? "text-white"
                          : "text-slate-400",
                      )}
                    />
                    {watchedIds.includes(currentSession.id)
                      ? "Assistido"
                      : "Marcar como assistido"}
                  </Button>

                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => handleShare(currentSession)}
                    title="Copiar link desta sessão"
                  >
                    <Share2 className="size-4" />
                  </Button>
                </div>
              </div>

              {/* Apresentador */}
              <div className="mt-4 flex items-center gap-3 border-t border-slate-100 pt-3 text-xs text-slate-600">
                <Avatar name={currentSession.presenter} size="sm" />
                <div>
                  <span className="text-slate-500">Apresentado por:</span>{" "}
                  <strong className="font-semibold text-slate-900">
                    {currentSession.presenter}
                  </strong>
                </div>
              </div>
            </Card>

            {/* Materiais Complementares da Sessão */}
            <div className="space-y-3">
              <h3 className="text-sm font-semibold text-slate-900">
                Materiais da Sessão & Links Práticos
              </h3>

              <div className="grid grid-cols-1 gap-2.5 sm:grid-cols-2">
                {currentSession.summaryUrl && (
                  <a
                    href={currentSession.summaryUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-violet-100 p-2 text-violet-700 group-hover:bg-violet-200">
                        <FileText className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          Resumo de IA & Ata
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Ata da reunião e tópicos estruturados
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-slate-400 group-hover:text-brand-600" />
                  </a>
                )}

                {currentSession.presentationUrl && (
                  <a
                    href={currentSession.presentationUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-amber-100 p-2 text-amber-800 group-hover:bg-amber-200">
                        <Presentation className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          Apresentação de Slides
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Slides em PDF / Apresentação
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-slate-400 group-hover:text-brand-600" />
                  </a>
                )}

                {currentSession.toolUrl && (
                  <a
                    href={currentSession.toolUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-teal-100 p-2 text-teal-800 group-hover:bg-teal-200">
                        <Wrench className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          Ferramenta Utilizada
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Data Studio, software ou painel
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-slate-400 group-hover:text-brand-600" />
                  </a>
                )}

                {currentSession.videoUrl && (
                  <a
                    href={currentSession.videoUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-rose-100 p-2 text-rose-700 group-hover:bg-rose-200">
                        <MonitorPlay className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          Vídeo Original Externo
                        </p>
                        <p className="text-[11px] text-slate-500">
                          Abrir no YouTube ou reprodutor nativo
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-slate-400 group-hover:text-brand-600" />
                  </a>
                )}

                {/* Links adicionais */}
                {currentSession.parsedLinks.map((link, idx) => (
                  <a
                    key={idx}
                    href={link.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="group flex items-center justify-between rounded-xl border border-slate-200 bg-white p-3.5 transition-all hover:border-brand-300 hover:bg-brand-50/30 hover:shadow-2xs"
                  >
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="rounded-lg bg-sky-100 p-2 text-sky-700 group-hover:bg-sky-200">
                        <LinkIcon className="size-4" />
                      </div>
                      <div className="min-w-0">
                        <p className="truncate text-xs font-semibold text-slate-900">
                          {link.label}
                        </p>
                        <p className="truncate text-[11px] text-slate-500">
                          {link.url}
                        </p>
                      </div>
                    </div>
                    <ArrowUpRight className="size-4 shrink-0 text-slate-400 group-hover:text-brand-600" />
                  </a>
                ))}
              </div>
            </div>

            {/* Descrição & Aprendizados */}
            <Card className="p-5">
              <h3 className="text-sm font-semibold text-slate-900">
                Sobre este Treinamento
              </h3>
              <div className="mt-3 text-sm leading-relaxed text-slate-700 whitespace-pre-line">
                {currentSession.description}
              </div>
            </Card>
          </div>

          {/* Coluna Lateral: Playlist de Treinamentos (4 colunas) */}
          <div className="space-y-3 lg:col-span-4">
            <div className="flex items-center justify-between px-1">
              <h3 className="font-semibold text-slate-900 text-sm">
                Playlist de Sessões ({filteredSessions.length})
              </h3>
              <span className="text-xs text-slate-500">
                {watchedCount} assistidas
              </span>
            </div>

            <Card className="overflow-hidden">
              <div className="max-h-[820px] overflow-y-auto divide-y divide-slate-100">
                {filteredSessions.map((session) => {
                  const isSelected = session.id === currentSession.id;
                  const isWatched = watchedIds.includes(session.id);

                  return (
                    <button
                      key={session.id}
                      type="button"
                      onClick={() => handleSelectSession(session.id)}
                      className={cn(
                        "w-full text-left p-3.5 transition-colors flex items-start gap-3",
                        isSelected
                          ? "bg-brand-50/70 border-l-4 border-l-brand-600"
                          : "hover:bg-slate-50",
                      )}
                    >
                      {/* Thumbnail ou Ícone */}
                      <div className="relative shrink-0 w-20 aspect-video rounded-lg overflow-hidden bg-slate-900 border border-slate-200">
                        {session.youtubeId ? (
                          <img
                            src={`https://img.youtube.com/vi/${session.youtubeId}/mqdefault.jpg`}
                            alt={session.title}
                            className="size-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="size-full flex items-center justify-center bg-brand-900 text-brand-300">
                            <BookOpen className="size-5" />
                          </div>
                        )}
                        <span className="absolute bottom-1 right-1 rounded bg-black/80 px-1 py-0.2 text-[9px] font-bold text-white">
                          #{session.uploadOrder}
                        </span>
                      </div>

                      {/* Info da Sessão */}
                      <div className="min-w-0 flex-1">
                        <div className="flex items-center gap-1.5">
                          <span className="text-[10px] font-medium text-slate-500">
                            {session.category}
                          </span>
                          <span className="text-slate-300">·</span>
                          <span className="text-[10px] text-slate-400">
                            {session.date}
                          </span>
                        </div>

                        <p
                          className={cn(
                            "line-clamp-2 text-xs font-semibold mt-0.5",
                            isSelected ? "text-brand-950 font-bold" : "text-slate-900",
                          )}
                        >
                          {session.title}
                        </p>

                        <div className="flex items-center justify-between mt-1.5">
                          <span className="text-[11px] text-slate-500 truncate">
                            {session.presenter}
                          </span>

                          {isWatched ? (
                            <span className="inline-flex items-center gap-1 text-[10px] font-medium text-emerald-700 bg-emerald-50 px-1.5 py-0.2 rounded">
                              <CheckCircle2 className="size-3 text-emerald-600" />
                              Visto
                            </span>
                          ) : null}
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            </Card>
          </div>
        </div>
      ) : (
        /* MODO GRADE (GRID): Catálogo em Cards */
        <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
          {filteredSessions.map((session) => {
            const isWatched = watchedIds.includes(session.id);

            return (
              <Card
                key={session.id}
                className="group flex flex-col overflow-hidden transition-all hover:border-slate-300 hover:shadow-md cursor-pointer"
                onClick={() => handleSelectSession(session.id)}
              >
                {/* Capa do Card */}
                <div className="relative aspect-video w-full overflow-hidden bg-slate-900">
                  {session.youtubeId ? (
                    <img
                      src={`https://img.youtube.com/vi/${session.youtubeId}/mqdefault.jpg`}
                      alt={session.title}
                      className="size-full object-cover transition-transform duration-300 group-hover:scale-105"
                      loading="lazy"
                    />
                  ) : (
                    <div className="flex size-full items-center justify-center bg-gradient-to-br from-slate-900 to-brand-950 text-white">
                      <BookOpen className="size-10 text-brand-400" />
                    </div>
                  )}

                  {/* Play Overlay */}
                  <div className="absolute inset-0 flex items-center justify-center bg-black/30 opacity-0 transition-opacity group-hover:opacity-100">
                    <div className="flex size-12 items-center justify-center rounded-full bg-brand-600 text-white shadow-lg">
                      <Play className="ml-0.5 size-5 fill-current" />
                    </div>
                  </div>

                  {/* Ordem da Sessão */}
                  <span className="absolute bottom-2 left-2 rounded-md bg-black/80 px-2 py-0.5 font-mono text-[11px] font-bold text-white shadow-2xs">
                    #{session.uploadOrder}
                  </span>

                  {/* Badge de Assistido */}
                  {isWatched && (
                    <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-emerald-600/90 px-2 py-0.5 text-[10px] font-semibold text-white shadow-2xs">
                      <CheckCircle2 className="size-3" /> Assistido
                    </span>
                  )}
                </div>

                {/* Conteúdo do Card */}
                <div className="flex flex-1 flex-col justify-between p-4">
                  <div className="space-y-1.5">
                    <div className="flex items-center justify-between text-xs text-slate-500">
                      <Badge tone="neutral">{session.category}</Badge>
                      <span>{session.date}</span>
                    </div>

                    <h3 className="font-display font-semibold text-slate-900 group-hover:text-brand-600 transition-colors line-clamp-2">
                      {session.title}
                    </h3>

                    <p className="text-xs text-slate-500 line-clamp-2">
                      {session.theme}
                    </p>
                  </div>

                  <div className="mt-4 border-t border-slate-100 pt-3 flex items-center justify-between text-xs">
                    <span className="text-slate-600 font-medium truncate">
                      {session.presenter}
                    </span>

                    <span className="inline-flex items-center gap-1 text-brand-700 font-semibold text-[11px]">
                      Assistir <ArrowUpRight className="size-3.5" />
                    </span>
                  </div>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Drawer para Cadastrar / Subir Nova Growth Session */}
      <GrowthSessionDrawer
        open={isDrawerOpen}
        onClose={() => setIsDrawerOpen(false)}
        onCreated={(newId) => {
          setSelectedId(newId);
          setViewMode("player");
        }}
      />
    </div>
  );
}
