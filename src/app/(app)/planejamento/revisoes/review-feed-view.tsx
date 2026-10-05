"use client";

import React, { useState, useTransition } from "react";
import Link from "next/link";
import {
  MessageSquare,
  Calendar,
  User,
  Plus,
  Table as TableIcon,
  LayoutList,
  Search,
  Filter,
  CheckCircle2,
  Clock,
  AlertTriangle,
  Send,
  X,
  ChevronRight,
  ExternalLink,
  Trash2,
  Tag,
  ArrowRight,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import {
  PLANNING_REVIEW_STATUS_LABELS,
  PLANNING_REVIEW_STATUS_COLORS,
  type PlanningReviewStatus,
} from "@/lib/db/schema";
import type { PlanningReviewWithComments } from "@/lib/modules/review/feed-queries";
import {
  createPlanningReviewItemAction,
  updatePlanningReviewItemStatusAction,
  addPlanningReviewCommentAction,
  deletePlanningReviewItemAction,
} from "./actions";

interface BuOption {
  id: string;
  slug: string;
  label: string;
}

export interface AssignableUserOption {
  id: string;
  name: string;
  email?: string | null;
  jobTitleName?: string | null;
}

interface ReviewFeedViewProps {
  initialItems: PlanningReviewWithComments[];
  businessUnits: BuOption[];
  currentCoordinator?: string;
  preselectedBuSlug?: string;
  assignableUsers?: AssignableUserOption[];
}

const BU_COLORS: Record<string, { bg: string; text: string; border: string }> = {
  bu_cirurgia: { bg: "bg-rose-50", text: "text-rose-700", border: "border-rose-200" },
  bu_clinica_medica: { bg: "bg-blue-50", text: "text-blue-700", border: "border-blue-200" },
  bu_medicina_intensiva: { bg: "bg-purple-50", text: "text-purple-700", border: "border-purple-200" },
  bu_pediatria: { bg: "bg-amber-50", text: "text-amber-800", border: "border-amber-200" },
  bu_oftalmologia: { bg: "bg-teal-50", text: "text-teal-700", border: "border-teal-200" },
  bu_concursus: { bg: "bg-indigo-50", text: "text-indigo-700", border: "border-indigo-200" },
  bu_radiologia: { bg: "bg-cyan-50", text: "text-cyan-700", border: "border-cyan-200" },
  bu_urologia: { bg: "bg-emerald-50", text: "text-emerald-700", border: "border-emerald-200" },
};

function getBuBadge(buId: string, label: string) {
  const color = BU_COLORS[buId] || {
    bg: "bg-slate-100",
    text: "text-slate-800",
    border: "border-slate-200",
  };
  return (
    <span
      className={cn(
        "inline-flex items-center rounded-md px-2.5 py-1 text-xs font-semibold border",
        color.bg,
        color.text,
        color.border,
      )}
    >
      {label}
    </span>
  );
}

function formatDate(dateInput: Date | string | number | null | undefined): string {
  if (!dateInput) return "—";
  const d = new Date(dateInput);
  if (isNaN(d.getTime())) return "—";
  return d.toLocaleDateString("pt-BR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
  });
}

function isOverdue(dateInput: Date | string | number | null | undefined): boolean {
  if (!dateInput) return false;
  const d = new Date(dateInput);
  const now = new Date();
  now.setHours(0, 0, 0, 0);
  return d.getTime() < now.getTime();
}

export function ReviewFeedView({
  initialItems,
  businessUnits,
  currentCoordinator = "Ingrid Silva",
  preselectedBuSlug,
  assignableUsers = [],
}: ReviewFeedViewProps) {
  const [items, setItems] = useState<PlanningReviewWithComments[]>(initialItems);
  const [selectedBu, setSelectedBu] = useState<string>(preselectedBuSlug || "all");
  const [selectedStatus, setSelectedStatus] = useState<string>("all");
  const [searchTerm, setSearchTerm] = useState<string>("");
  const [viewMode, setViewMode] = useState<"table" | "feed">("table");

  // Thread Drawer
  const [activeThreadItem, setActiveThreadItem] =
    useState<PlanningReviewWithComments | null>(null);
  const [commentText, setCommentText] = useState("");
  const [isSubmittingComment, setIsSubmittingComment] = useState(false);

  // Modal Novo Item
  const [isCreateOpen, setIsCreateOpen] = useState(false);
  const [isPending, startTransition] = useTransition();

  // Form states
  const [newItemBuId, setNewItemBuId] = useState(
    businessUnits.find((b) => b.slug === preselectedBuSlug)?.id ||
      businessUnits[0]?.id ||
      "",
  );
  const [newItemCoordinator, setNewItemCoordinator] = useState(currentCoordinator);
  const [newItemAssignee, setNewItemAssignee] = useState(
    assignableUsers[0]?.name || "",
  );
  const [newItemAssigneeEmail, setNewItemAssigneeEmail] = useState(
    assignableUsers[0]?.email || "",
  );
  const [isCustomAssignee, setIsCustomAssignee] = useState(false);
  const [createTaskNotification, setCreateTaskNotification] = useState(true);
  const [newItemMeetingDate, setNewItemMeetingDate] = useState(
    new Date().toISOString().split("T")[0],
  );
  const [newItemFollowUpDate, setNewItemFollowUpDate] = useState(
    new Date(Date.now() + 7 * 86400000).toISOString().split("T")[0],
  );
  const [newItemStatus, setNewItemStatus] = useState<PlanningReviewStatus>("novo");
  const [newItemPriority, setNewItemPriority] = useState("normal");
  const [newItemDetails, setNewItemDetails] = useState("");
  const [newItemTag, setNewItemTag] = useState("");

  // Filtered items
  const filteredItems = items.filter((item) => {
    if (selectedBu !== "all") {
      if (item.businessUnit.slug !== selectedBu && item.businessUnitId !== selectedBu) {
        return false;
      }
    }
    if (selectedStatus !== "all" && item.status !== selectedStatus) {
      return false;
    }
    if (searchTerm.trim()) {
      const term = searchTerm.toLowerCase();
      const matchDetails = item.details.toLowerCase().includes(term);
      const matchBu = item.businessUnit.label.toLowerCase().includes(term);
      const matchAssignee = item.assigneeName.toLowerCase().includes(term);
      const matchTags = item.tags ? item.tags.toLowerCase().includes(term) : false;
      if (!matchDetails && !matchBu && !matchAssignee && !matchTags) return false;
    }
    return true;
  });

  // Metric counters
  const totalCount = items.length;
  const concluidoCount = items.filter((i) => i.status === "concluido").length;
  const emAndamentoCount = items.filter((i) => i.status === "em_andamento").length;
  const pendenteCount = items.filter(
    (i) => i.status === "pendente" || i.status === "atrasado",
  ).length;

  // Handle status update
  const handleStatusChange = async (
    itemId: string,
    newStatus: PlanningReviewStatus,
  ) => {
    // Optimistic update
    setItems((prev) =>
      prev.map((it) => (it.id === itemId ? { ...it, status: newStatus } : it)),
    );
    if (activeThreadItem?.id === itemId) {
      setActiveThreadItem((prev) => (prev ? { ...prev, status: newStatus } : null));
    }

    try {
      await updatePlanningReviewItemStatusAction(itemId, newStatus);
      toast.success(
        `Status alterado para "${PLANNING_REVIEW_STATUS_LABELS[newStatus]}"`,
      );
    } catch {
      toast.error("Erro ao atualizar status.");
    }
  };

  // Handle send comment
  const handleSendComment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!activeThreadItem || !commentText.trim()) return;

    const content = commentText.trim();
    setCommentText("");
    setIsSubmittingComment(true);

    const tempComment = {
      id: `temp_${Date.now()}`,
      reviewItemId: activeThreadItem.id,
      authorName: currentCoordinator || "Você",
      authorEmail: null,
      authorAvatar: null,
      authorRole: "Coordenação",
      content,
      createdAt: new Date(),
    };

    // Optimistic UI
    setItems((prev) =>
      prev.map((it) =>
        it.id === activeThreadItem.id
          ? { ...it, comments: [...it.comments, tempComment] }
          : it,
      ),
    );
    setActiveThreadItem((prev) =>
      prev ? { ...prev, comments: [...prev.comments, tempComment] } : null,
    );

    try {
      await addPlanningReviewCommentAction(activeThreadItem.id, content);
      toast.success("Comentário adicionado ao thread.");
    } catch {
      toast.error("Não foi possível enviar o comentário.");
    } finally {
      setIsSubmittingComment(false);
    }
  };

  // Handle create item
  const handleCreateSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!newItemDetails.trim() || !newItemAssignee.trim()) {
      toast.error("Preencha os detalhes e o destinatário/responsável.");
      return;
    }

    startTransition(async () => {
      try {
        const tags = newItemTag
          ? newItemTag
              .split(",")
              .map((t) => t.trim())
              .filter(Boolean)
          : [];

        const res = await createPlanningReviewItemAction({
          businessUnitId: newItemBuId,
          coordinatorName: newItemCoordinator,
          assigneeName: newItemAssignee,
          assigneeEmail: newItemAssigneeEmail,
          meetingDate: newItemMeetingDate,
          followUpDate: newItemFollowUpDate,
          status: newItemStatus,
          priority: newItemPriority,
          details: newItemDetails,
          tags,
          createTaskNotification,
        });

        const selectedUnit = businessUnits.find((b) => b.id === newItemBuId);

        const createdItem: PlanningReviewWithComments = {
          id: res.id,
          businessUnitId: newItemBuId,
          coordinatorName: newItemCoordinator,
          coordinatorEmail: null,
          meetingDate: new Date(`${newItemMeetingDate}T12:00:00Z`),
          followUpDate: new Date(`${newItemFollowUpDate}T12:00:00Z`),
          details: newItemDetails,
          assigneeName: newItemAssignee,
          assigneeEmail: newItemAssigneeEmail || null,
          assigneeAvatar: null,
          status: newItemStatus,
          priority: newItemPriority,
          tags: tags.length > 0 ? JSON.stringify(tags) : null,
          createdBy: "user",
          updatedBy: "user",
          createdAt: new Date(),
          updatedAt: new Date(),
          businessUnit: {
            id: newItemBuId,
            slug: selectedUnit?.slug || "",
            label: selectedUnit?.label || "",
            code: "",
          },
          comments: [],
        };

        setItems((prev) => [createdItem, ...prev]);
        setIsCreateOpen(false);
        setNewItemDetails("");
        setNewItemAssignee(assignableUsers[0]?.name || "");
        setNewItemAssigneeEmail(assignableUsers[0]?.email || "");
        setIsCustomAssignee(false);
        setNewItemTag("");
        toast.success(
          createTaskNotification
            ? `Acompanhamento cadastrado e tarefa gerada para ${newItemAssignee}!`
            : "Novo acompanhamento cadastrado com sucesso!",
        );
      } catch (err: unknown) {
        toast.error(
          err instanceof Error
            ? err.message
            : "Erro ao criar item de acompanhamento.",
        );
      }
    });
  };

  // Handle delete item
  const handleDeleteItem = async (id: string) => {
    if (!confirm("Tem certeza que deseja excluir este item de acompanhamento?")) {
      return;
    }

    setItems((prev) => prev.filter((it) => it.id !== id));
    if (activeThreadItem?.id === id) {
      setActiveThreadItem(null);
    }

    try {
      await deletePlanningReviewItemAction(id);
      toast.success("Item de acompanhamento excluído.");
    } catch {
      toast.error("Erro ao excluir item.");
    }
  };

  return (
    <div className="space-y-6">
      {/* Slack Header Banner */}
      <div className="rounded-2xl border border-slate-200 bg-white p-6 shadow-xs">
        <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <span className="inline-flex items-center gap-1.5 rounded-md bg-purple-50 px-2 py-0.5 text-xs font-semibold text-purple-700">
                <span className="size-1.5 rounded-full bg-purple-500" />
                #marketing-planejamento
              </span>
              <span className="text-slate-400">/</span>
              <h1 className="text-xl font-bold tracking-tight text-slate-900">
                Revisão de Planejamento — {currentCoordinator}
              </h1>
            </div>
            <p className="text-sm text-slate-600">
              Reunião com @{currentCoordinator} para revisar planejamento de
              produto por BU. Sempre convidem o supervisor e o social media pra
              participarem.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-2.5">
            <button
              onClick={() => setIsCreateOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl bg-brand-600 px-4 py-2 text-sm font-semibold text-white shadow-xs transition hover:bg-brand-700 active:scale-98"
            >
              <Plus className="size-4" />
              <span>Adicionar item</span>
            </button>
          </div>
        </div>

        {/* Counter Summary Pills */}
        <div className="mt-5 grid grid-cols-2 gap-3 sm:grid-cols-4 border-t border-slate-100 pt-4">
          <div className="flex items-center gap-3 rounded-xl bg-slate-50 p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-xs text-slate-700">
              <LayoutList className="size-4" />
            </div>
            <div>
              <p className="text-xs text-slate-500 font-medium">Total de Itens</p>
              <p className="text-lg font-bold text-slate-900">{totalCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-sky-50/50 p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-xs text-sky-600">
              <Clock className="size-4" />
            </div>
            <div>
              <p className="text-xs text-sky-800 font-medium">Em andamento</p>
              <p className="text-lg font-bold text-sky-950">{emAndamentoCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-emerald-50/50 p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-xs text-emerald-600">
              <CheckCircle2 className="size-4" />
            </div>
            <div>
              <p className="text-xs text-emerald-800 font-medium">Concluídos</p>
              <p className="text-lg font-bold text-emerald-950">{concluidoCount}</p>
            </div>
          </div>

          <div className="flex items-center gap-3 rounded-xl bg-amber-50/50 p-3">
            <div className="flex size-9 items-center justify-center rounded-lg bg-white shadow-xs text-amber-600">
              <AlertTriangle className="size-4" />
            </div>
            <div>
              <p className="text-xs text-amber-800 font-medium">Pendentes / Atenção</p>
              <p className="text-lg font-bold text-amber-950">{pendenteCount}</p>
            </div>
          </div>
        </div>
      </div>

      {/* Filter and View Switcher Toolbar */}
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-center gap-2.5">
          {/* BU Filter */}
          <div className="relative">
            <select
              value={selectedBu}
              onChange={(e) => setSelectedBu(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-800 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">Todas as Business Units ({businessUnits.length})</option>
              {businessUnits.map((bu) => (
                <option key={bu.id} value={bu.slug}>
                  {bu.label}
                </option>
              ))}
            </select>
            <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 rotate-90 text-slate-400" />
          </div>

          {/* Status Filter */}
          <div className="relative">
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="appearance-none rounded-xl border border-slate-200 bg-white py-2 pl-3 pr-8 text-sm font-medium text-slate-800 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            >
              <option value="all">Todos os Status</option>
              <option value="novo">Novo</option>
              <option value="em_andamento">Em andamento</option>
              <option value="concluido">Concluído</option>
              <option value="pendente">Pendente</option>
              <option value="atrasado">Atrasado</option>
            </select>
            <ChevronRight className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 size-4 rotate-90 text-slate-400" />
          </div>

          {/* Search box */}
          <div className="relative min-w-[240px]">
            <Search className="pointer-events-none absolute left-3 top-1/2 -translate-y-1/2 size-4 text-slate-400" />
            <input
              type="text"
              placeholder="Buscar observações, pautas..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full rounded-xl border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-800 placeholder-slate-400 shadow-xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
            {searchTerm && (
              <button
                onClick={() => setSearchTerm("")}
                className="absolute right-2.5 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600"
              >
                <X className="size-3.5" />
              </button>
            )}
          </div>
        </div>

        {/* View Mode Toggle */}
        <div className="flex items-center rounded-xl border border-slate-200 bg-slate-100/70 p-1">
          <button
            onClick={() => setViewMode("table")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              viewMode === "table"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <TableIcon className="size-3.5" />
            <span>Tabela Slack</span>
          </button>
          <button
            onClick={() => setViewMode("feed")}
            className={cn(
              "flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition",
              viewMode === "feed"
                ? "bg-white text-slate-900 shadow-xs"
                : "text-slate-600 hover:text-slate-900",
            )}
          >
            <LayoutList className="size-3.5" />
            <span>Feed Executivo</span>
          </button>
        </div>
      </div>

      {/* Main Content Area */}
      {filteredItems.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-200 bg-white p-12 text-center">
          <MessageSquare className="mx-auto size-10 text-slate-300" />
          <h3 className="mt-3 text-base font-semibold text-slate-900">
            Nenhum item encontrado
          </h3>
          <p className="mt-1 text-sm text-slate-500 max-w-sm mx-auto">
            Não há observações ou acompanhamentos correspondentes aos filtros
            selecionados.
          </p>
          <button
            onClick={() => {
              setSelectedBu("all");
              setSelectedStatus("all");
              setSearchTerm("");
            }}
            className="mt-4 inline-flex items-center gap-1.5 rounded-xl border border-slate-200 bg-white px-3.5 py-2 text-xs font-semibold text-slate-700 shadow-xs hover:bg-slate-50"
          >
            Limpar filtros
          </button>
        </div>
      ) : viewMode === "table" ? (
        /* TABLE VIEW (Exact Slack Canvas Table Representation) */
        <div className="overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-xs">
          <div className="overflow-x-auto">
            <table className="w-full border-collapse text-left text-sm">
              <thead>
                <tr className="border-b border-slate-200 bg-slate-50/80 font-medium text-slate-600 text-xs">
                  <th className="py-3.5 pl-5 pr-3 w-[150px]">BU</th>
                  <th className="py-3.5 px-3 min-w-[340px]">Detalhes</th>
                  <th className="py-3.5 px-3 w-[120px]">Data Reunião</th>
                  <th className="py-3.5 px-3 w-[140px]">Data Follow Up</th>
                  <th className="py-3.5 px-3 w-[160px]">Destinatário</th>
                  <th className="py-3.5 px-3 w-[140px]">Status</th>
                  <th className="py-3.5 pr-5 pl-3 w-[110px] text-right">Thread</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {filteredItems.map((item) => {
                  const statusStyle =
                    PLANNING_REVIEW_STATUS_COLORS[item.status] ||
                    PLANNING_REVIEW_STATUS_COLORS.novo;
                  const overdue = isOverdue(item.followUpDate) && item.status !== "concluido";

                  return (
                    <tr
                      key={item.id}
                      className="group transition-colors hover:bg-slate-50/70"
                    >
                      {/* BU */}
                      <td className="py-3.5 pl-5 pr-3 align-top">
                        <Link
                          href={`/planejamento/${item.businessUnit.slug}`}
                          className="hover:underline font-semibold"
                        >
                          {getBuBadge(item.businessUnitId, item.businessUnit.label)}
                        </Link>
                      </td>

                      {/* Detalhes */}
                      <td className="py-3.5 px-3 align-top">
                        <div className="space-y-1.5">
                          <div className="text-slate-800 text-sm whitespace-pre-line leading-relaxed font-normal">
                            {item.details}
                          </div>
                          {item.tags && (
                            <div className="flex flex-wrap gap-1 pt-1">
                              {JSON.parse(item.tags).map((tag: string, idx: number) => (
                                <span
                                  key={idx}
                                  className="inline-flex items-center gap-1 rounded bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-600"
                                >
                                  <Tag className="size-2.5 text-slate-400" />
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>

                      {/* Data Reunião */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap text-slate-600 text-xs font-medium">
                        <div className="flex items-center gap-1.5">
                          <Calendar className="size-3.5 text-slate-400" />
                          <span>{formatDate(item.meetingDate)}</span>
                        </div>
                      </td>

                      {/* Data Follow Up */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap text-xs">
                        <div
                          className={cn(
                            "flex items-center gap-1.5 font-medium",
                            overdue ? "text-rose-600" : "text-slate-600",
                          )}
                        >
                          <Clock className="size-3.5 text-slate-400" />
                          <span>{formatDate(item.followUpDate)}</span>
                          {overdue && (
                            <span className="rounded bg-rose-100 px-1 py-0.2 text-[10px] font-bold text-rose-700">
                              Atrasado
                            </span>
                          )}
                        </div>
                      </td>

                      {/* Destinatário */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <div className="flex items-center gap-2">
                          <div className="flex size-6 items-center justify-center rounded-full bg-brand-100 text-[11px] font-bold text-brand-700">
                            {item.assigneeName
                              .split(" ")
                              .map((n) => n[0])
                              .slice(0, 2)
                              .join("")
                              .toUpperCase()}
                          </div>
                          <span className="text-xs font-medium text-slate-800">
                            {item.assigneeName}
                          </span>
                        </div>
                      </td>

                      {/* Status Selector */}
                      <td className="py-3.5 px-3 align-top whitespace-nowrap">
                        <select
                          value={item.status}
                          onChange={(e) =>
                            handleStatusChange(
                              item.id,
                              e.target.value as PlanningReviewStatus,
                            )
                          }
                          className={cn(
                            "rounded-lg border px-2.5 py-1 text-xs font-semibold shadow-2xs transition cursor-pointer focus:outline-none focus:ring-1",
                            statusStyle.bg,
                            statusStyle.text,
                            statusStyle.border,
                          )}
                        >
                          <option value="novo">Novo</option>
                          <option value="em_andamento">Em andamento</option>
                          <option value="concluido">Concluído</option>
                          <option value="pendente">Pendente</option>
                          <option value="atrasado">Atrasado</option>
                        </select>
                      </td>

                      {/* Comments / Thread button */}
                      <td className="py-3.5 pr-5 pl-3 align-top text-right whitespace-nowrap">
                        <div className="flex items-center justify-end gap-1.5">
                          <button
                            onClick={() => setActiveThreadItem(item)}
                            className={cn(
                              "inline-flex items-center gap-1.5 rounded-lg px-2.5 py-1 text-xs font-semibold transition",
                              item.comments.length > 0
                                ? "bg-purple-50 text-purple-700 hover:bg-purple-100 border border-purple-200"
                                : "bg-slate-100 text-slate-600 hover:bg-slate-200",
                            )}
                            title="Abrir comentários da thread"
                          >
                            <MessageSquare className="size-3.5" />
                            <span>{item.comments.length}</span>
                          </button>

                          <button
                            onClick={() => handleDeleteItem(item.id)}
                            className="rounded-lg p-1 text-slate-400 opacity-0 group-hover:opacity-100 hover:bg-rose-50 hover:text-rose-600 transition"
                            title="Excluir item"
                          >
                            <Trash2 className="size-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      ) : (
        /* FEED VIEW (Cards with Expandable inline threads) */
        <div className="grid gap-4 sm:grid-cols-1 md:grid-cols-2">
          {filteredItems.map((item) => {
            const statusStyle =
              PLANNING_REVIEW_STATUS_COLORS[item.status] ||
              PLANNING_REVIEW_STATUS_COLORS.novo;
            const overdue = isOverdue(item.followUpDate) && item.status !== "concluido";

            return (
              <div
                key={item.id}
                className="flex flex-col justify-between rounded-2xl border border-slate-200 bg-white p-5 shadow-xs transition hover:border-slate-300"
              >
                <div>
                  {/* Card Header */}
                  <div className="flex items-center justify-between gap-2 border-b border-slate-100 pb-3">
                    <div className="flex items-center gap-2">
                      {getBuBadge(item.businessUnitId, item.businessUnit.label)}
                      <span className="text-xs text-slate-400">
                        {item.coordinatorName}
                      </span>
                    </div>

                    <select
                      value={item.status}
                      onChange={(e) =>
                        handleStatusChange(
                          item.id,
                          e.target.value as PlanningReviewStatus,
                        )
                      }
                      className={cn(
                        "rounded-lg border px-2 py-0.5 text-xs font-semibold cursor-pointer",
                        statusStyle.bg,
                        statusStyle.text,
                        statusStyle.border,
                      )}
                    >
                      <option value="novo">Novo</option>
                      <option value="em_andamento">Em andamento</option>
                      <option value="concluido">Concluído</option>
                      <option value="pendente">Pendente</option>
                      <option value="atrasado">Atrasado</option>
                    </select>
                  </div>

                  {/* Card Body / Details */}
                  <div className="mt-3.5">
                    <p className="text-sm text-slate-800 whitespace-pre-line leading-relaxed font-normal">
                      {item.details}
                    </p>
                  </div>

                  {/* Tags */}
                  {item.tags && (
                    <div className="mt-3 flex flex-wrap gap-1.5">
                      {JSON.parse(item.tags).map((tag: string, idx: number) => (
                        <span
                          key={idx}
                          className="inline-flex items-center gap-1 rounded bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-600"
                        >
                          <Tag className="size-3 text-slate-400" />
                          {tag}
                        </span>
                      ))}
                    </div>
                  )}

                  {/* Dates & Assignee Meta */}
                  <div className="mt-4 flex flex-wrap items-center justify-between gap-2 border-t border-slate-100 pt-3 text-xs text-slate-500">
                    <div className="flex items-center gap-3">
                      <span className="flex items-center gap-1">
                        <Calendar className="size-3.5 text-slate-400" />
                        Reunião: {formatDate(item.meetingDate)}
                      </span>
                      <span
                        className={cn(
                          "flex items-center gap-1 font-medium",
                          overdue ? "text-rose-600" : "text-slate-600",
                        )}
                      >
                        <Clock className="size-3.5 text-slate-400" />
                        Follow-up: {formatDate(item.followUpDate)}
                      </span>
                    </div>

                    <div className="flex items-center gap-1.5">
                      <div className="flex size-5 items-center justify-center rounded-full bg-brand-100 text-[10px] font-bold text-brand-700">
                        {item.assigneeName
                          .split(" ")
                          .map((n) => n[0])
                          .slice(0, 2)
                          .join("")
                          .toUpperCase()}
                      </div>
                      <span className="font-medium text-slate-700">
                        {item.assigneeName}
                      </span>
                    </div>
                  </div>
                </div>

                {/* Card Footer / Thread Button */}
                <div className="mt-4 flex items-center justify-between border-t border-slate-100 pt-3">
                  <button
                    onClick={() => setActiveThreadItem(item)}
                    className="flex items-center gap-1.5 text-xs font-semibold text-purple-700 hover:text-purple-800 transition"
                  >
                    <MessageSquare className="size-3.5" />
                    <span>
                      {item.comments.length > 0
                        ? `${item.comments.length} respostas no thread`
                        : "Responder / Iniciar thread..."}
                    </span>
                  </button>

                  <div className="flex items-center gap-2">
                    <Link
                      href={`/planejamento/${item.businessUnit.slug}/acompanhamento`}
                      className="text-xs text-slate-400 hover:text-slate-700 transition"
                      title="Ver acompanhamento da BU"
                    >
                      <ExternalLink className="size-3.5" />
                    </Link>
                    <button
                      onClick={() => handleDeleteItem(item.id)}
                      className="text-xs text-slate-400 hover:text-rose-600 transition"
                      title="Excluir"
                    >
                      <Trash2 className="size-3.5" />
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* THREAD DRAWER / MODAL (Slack-style Thread Sidebar) */}
      {activeThreadItem && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-900/40 backdrop-blur-xs transition-opacity animate-in fade-in">
          <div className="w-full max-w-lg bg-white shadow-2xl flex flex-col h-full animate-in slide-in-from-right duration-200">
            {/* Thread Header */}
            <div className="flex items-center justify-between border-b border-slate-200 px-6 py-4">
              <div className="flex items-center gap-2.5">
                <div className="flex size-8 items-center justify-center rounded-lg bg-purple-100 text-purple-700">
                  <MessageSquare className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Thread de Revisão
                  </h3>
                  <p className="text-xs text-slate-500">
                    {activeThreadItem.businessUnit.label} · Reunião de{" "}
                    {formatDate(activeThreadItem.meetingDate)}
                  </p>
                </div>
              </div>
              <button
                onClick={() => setActiveThreadItem(null)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            {/* Parent Item Summary */}
            <div className="border-b border-slate-100 bg-slate-50/70 p-5">
              <div className="flex items-center justify-between gap-2">
                {getBuBadge(
                  activeThreadItem.businessUnitId,
                  activeThreadItem.businessUnit.label,
                )}
                <span
                  className={cn(
                    "inline-flex items-center rounded-md px-2 py-0.5 text-xs font-semibold",
                    PLANNING_REVIEW_STATUS_COLORS[activeThreadItem.status].bg,
                    PLANNING_REVIEW_STATUS_COLORS[activeThreadItem.status].text,
                  )}
                >
                  {PLANNING_REVIEW_STATUS_LABELS[activeThreadItem.status]}
                </span>
              </div>
              <p className="mt-3 text-sm text-slate-800 font-medium whitespace-pre-line">
                {activeThreadItem.details}
              </p>
              <div className="mt-3 flex items-center justify-between text-xs text-slate-500 pt-2 border-t border-slate-200/60">
                <span>Responsável: <strong>{activeThreadItem.assigneeName}</strong></span>
                <span>Prazo: <strong>{formatDate(activeThreadItem.followUpDate)}</strong></span>
              </div>
            </div>

            {/* Comments List */}
            <div className="flex-1 overflow-y-auto p-6 space-y-4">
              {activeThreadItem.comments.length === 0 ? (
                <div className="py-12 text-center">
                  <MessageSquare className="mx-auto size-8 text-slate-300" />
                  <p className="mt-2 text-sm text-slate-500">
                    Ainda não há respostas nesta thread.
                  </p>
                  <p className="text-xs text-slate-400">
                    Envie observações ou atualizações sobre o andamento das ações.
                  </p>
                </div>
              ) : (
                activeThreadItem.comments.map((comment) => (
                  <div
                    key={comment.id}
                    className="flex gap-3 text-sm"
                  >
                    <div className="flex size-7 shrink-0 items-center justify-center rounded-full bg-purple-100 text-xs font-bold text-purple-700">
                      {comment.authorName[0]?.toUpperCase() || "U"}
                    </div>
                    <div className="flex-1 space-y-1">
                      <div className="flex items-baseline gap-2">
                        <span className="font-semibold text-slate-900 text-xs">
                          {comment.authorName}
                        </span>
                        {comment.authorRole && (
                          <span className="text-[11px] text-slate-400">
                            {comment.authorRole}
                          </span>
                        )}
                        <span className="text-[10px] text-slate-400 ml-auto">
                          {new Date(comment.createdAt).toLocaleTimeString("pt-BR", {
                            hour: "2-digit",
                            minute: "2-digit",
                          })}
                        </span>
                      </div>
                      <div className="rounded-xl rounded-tl-none bg-slate-100 px-3.5 py-2.5 text-slate-800 text-xs leading-relaxed">
                        {comment.content}
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>

            {/* Reply Input Box */}
            <form
              onSubmit={handleSendComment}
              className="border-t border-slate-200 bg-white p-4"
            >
              <div className="relative">
                <textarea
                  rows={3}
                  placeholder="Responder... (Ex: criativos aprovados, copy ajustada com social media)"
                  value={commentText}
                  onChange={(e) => setCommentText(e.target.value)}
                  className="w-full resize-none rounded-xl border border-slate-200 bg-slate-50 p-3 pr-12 text-xs text-slate-800 placeholder-slate-400 shadow-2xs focus:border-purple-500 focus:bg-white focus:outline-none focus:ring-1 focus:ring-purple-500"
                  onKeyDown={(e) => {
                    if (e.key === "Enter" && !e.shiftKey) {
                      e.preventDefault();
                      handleSendComment(e);
                    }
                  }}
                />
                <button
                  type="submit"
                  disabled={!commentText.trim() || isSubmittingComment}
                  className="absolute right-2.5 bottom-3.5 flex size-8 items-center justify-center rounded-lg bg-purple-600 text-white transition hover:bg-purple-700 disabled:opacity-40 disabled:cursor-not-allowed"
                >
                  <Send className="size-3.5" />
                </button>
              </div>
              <p className="mt-1 text-[11px] text-slate-400">
                Pressione <strong>Enter</strong> para enviar, <strong>Shift + Enter</strong> para quebra de linha.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* MODAL ADICIONAR ITEM */}
      {isCreateOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/50 backdrop-blur-xs p-4 animate-in fade-in">
          <div className="w-full max-w-xl rounded-2xl bg-white p-6 shadow-2xl animate-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-4">
              <div className="flex items-center gap-2">
                <div className="flex size-8 items-center justify-center rounded-lg bg-brand-50 text-brand-600">
                  <Plus className="size-4" />
                </div>
                <div>
                  <h3 className="text-base font-bold text-slate-900">
                    Novo Item de Acompanhamento
                  </h3>
                  <p className="text-xs text-slate-500">
                    Cadastre uma nova observação ou plano de ação por BU.
                  </p>
                </div>
              </div>
              <button
                onClick={() => setIsCreateOpen(false)}
                className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition"
              >
                <X className="size-5" />
              </button>
            </div>

            <form onSubmit={handleCreateSubmit} className="mt-4 space-y-4">
              <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
                {/* Business Unit */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Business Unit *
                  </label>
                  <select
                    value={newItemBuId}
                    onChange={(e) => setNewItemBuId(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  >
                    {businessUnits.map((bu) => (
                      <option key={bu.id} value={bu.id}>
                        {bu.label}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Destinatário / Responsável */}
                <div>
                  <div className="flex items-center justify-between mb-1">
                    <label className="block text-xs font-semibold text-slate-700">
                      Destinatário / Responsável *
                    </label>
                    {assignableUsers.length > 0 && (
                      <button
                        type="button"
                        onClick={() => {
                          setIsCustomAssignee(!isCustomAssignee);
                          setNewItemAssignee("");
                          setNewItemAssigneeEmail("");
                        }}
                        className="text-[11px] font-medium text-brand-600 hover:text-brand-800 transition"
                      >
                        {isCustomAssignee ? "Escolher da lista" : "+ Digitar outro"}
                      </button>
                    )}
                  </div>

                  {!isCustomAssignee && assignableUsers.length > 0 ? (
                    <select
                      value={newItemAssignee}
                      onChange={(e) => {
                        const val = e.target.value;
                        setNewItemAssignee(val);
                        const match = assignableUsers.find((p) => p.name === val);
                        setNewItemAssigneeEmail(match?.email || "");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      required
                    >
                      <option value="">— Selecione o responsável —</option>
                      {assignableUsers.map((user) => (
                        <option key={user.id} value={user.name}>
                          {user.name} {user.jobTitleName ? `(${user.jobTitleName})` : ""}
                        </option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type="text"
                      placeholder="Ex: Mariana Vasconcelos, João Fontes"
                      value={newItemAssignee}
                      onChange={(e) => {
                        setNewItemAssignee(e.target.value);
                        setNewItemAssigneeEmail("");
                      }}
                      className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                      required
                    />
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                {/* Data Reunião */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data da Reunião *
                  </label>
                  <input
                    type="date"
                    value={newItemMeetingDate}
                    onChange={(e) => setNewItemMeetingDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>

                {/* Data Follow Up */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Data Follow Up *
                  </label>
                  <input
                    type="date"
                    value={newItemFollowUpDate}
                    onChange={(e) => setNewItemFollowUpDate(e.target.value)}
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                    required
                  />
                </div>

                {/* Status Inicial */}
                <div>
                  <label className="block text-xs font-semibold text-slate-700 mb-1">
                    Status Inicial
                  </label>
                  <select
                    value={newItemStatus}
                    onChange={(e) =>
                      setNewItemStatus(e.target.value as PlanningReviewStatus)
                    }
                    className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  >
                    <option value="novo">Novo</option>
                    <option value="em_andamento">Em andamento</option>
                    <option value="pendente">Pendente</option>
                    <option value="concluido">Concluído</option>
                  </select>
                </div>
              </div>

              {/* Detalhes / Ações */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Detalhes e Pautas da Reunião *
                </label>
                <textarea
                  rows={4}
                  placeholder={`• Revisar precificação e oferta do Extensivo\n• Alinhar calendário com Social Media\n• Subir novos criativos de conversão`}
                  value={newItemDetails}
                  onChange={(e) => setNewItemDetails(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-3 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                  required
                />
              </div>

              {/* Tags */}
              <div>
                <label className="block text-xs font-semibold text-slate-700 mb-1">
                  Tags / Palavras-chave (separadas por vírgula)
                </label>
                <input
                  type="text"
                  placeholder="Ex: Black November, Tráfego Pago, Provas Práticas"
                  value={newItemTag}
                  onChange={(e) => setNewItemTag(e.target.value)}
                  className="w-full rounded-xl border border-slate-200 bg-white p-2.5 text-xs text-slate-800 shadow-2xs focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
                />
              </div>

              {/* Notificação via Tarefas na Central */}
              <div className="rounded-xl border border-brand-100 bg-brand-50/50 p-3">
                <label className="flex items-start gap-2.5 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={createTaskNotification}
                    onChange={(e) => setCreateTaskNotification(e.target.checked)}
                    className="mt-0.5 rounded border-slate-300 text-brand-600 focus:ring-brand-500 size-4"
                  />
                  <div>
                    <span className="block text-xs font-semibold text-slate-900">
                      Notificar na Central: Gerar tarefa na fila de {newItemAssignee || "Mariana"}
                    </span>
                    <span className="block text-[11px] text-slate-500 mt-0.5">
                      Cria uma tarefa de follow-up com o prazo estipulado, alertando a pessoa com badge no menu de Tarefas e no painel pessoal dela.
                    </span>
                  </div>
                </label>
              </div>

              {/* Modal Buttons */}
              <div className="flex items-center justify-end gap-2.5 border-t border-slate-100 pt-4">
                <button
                  type="button"
                  onClick={() => setIsCreateOpen(false)}
                  className="rounded-xl border border-slate-200 bg-white px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={isPending}
                  className="rounded-xl bg-brand-600 px-4 py-2 text-xs font-semibold text-white shadow-xs hover:bg-brand-700 transition disabled:opacity-50"
                >
                  {isPending ? "Cadastrando..." : "Cadastrar Acompanhamento"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
