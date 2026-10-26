"use client";

import { useState, useTransition } from "react";
import {
  Target,
  ShoppingBag,
  Magnet,
  Megaphone,
  Plus,
  X,
  Pencil,
  Trash2,
  Users,
  Check,
  ChevronRight,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils/cn";
import type {
  MonthlyCampaign,
  MonthlyCampaignType,
  CampaignProductOption,
  CampaignPersonaOption,
} from "./campaign-types";
import {
  saveMonthlyCampaignAction,
  deleteMonthlyCampaignAction,
} from "./campaign-actions";

type MonthlyCampaignsBarProps = {
  businessUnitSlug: string;
  cycleId: string;
  monthAnchor: Date;
  campaigns: MonthlyCampaign[];
  products: CampaignProductOption[];
  personas: CampaignPersonaOption[];
  canEdit: boolean;
  onCampaignsChange?: (updated: MonthlyCampaign[]) => void;
};

const MONTH_NAMES = [
  "Janeiro",
  "Fevereiro",
  "Março",
  "Abril",
  "Maio",
  "Junho",
  "Julho",
  "Agosto",
  "Setembro",
  "Outubro",
  "Novembro",
  "Dezembro",
];

const CAMPAIGN_STYLES: Record<
  MonthlyCampaignType,
  {
    label: string;
    icon: typeof ShoppingBag;
    badgeBg: string;
    badgeText: string;
    badgeBorder: string;
    dotBg: string;
    pillBg: string;
    accentColor: string;
  }
> = {
  vendas: {
    label: "Vendas",
    icon: ShoppingBag,
    badgeBg: "bg-emerald-50",
    badgeText: "text-emerald-800",
    badgeBorder: "border-emerald-200",
    dotBg: "bg-emerald-500",
    pillBg: "hover:bg-emerald-100/70",
    accentColor: "emerald",
  },
  captacao: {
    label: "Captação",
    icon: Magnet,
    badgeBg: "bg-sky-50",
    badgeText: "text-sky-800",
    badgeBorder: "border-sky-200",
    dotBg: "bg-sky-500",
    pillBg: "hover:bg-sky-100/70",
    accentColor: "sky",
  },
  awareness: {
    label: "Awareness",
    icon: Megaphone,
    badgeBg: "bg-purple-50",
    badgeText: "text-purple-800",
    badgeBorder: "border-purple-200",
    dotBg: "bg-purple-500",
    pillBg: "hover:bg-purple-100/70",
    accentColor: "purple",
  },
};

export function MonthlyCampaignsBar({
  businessUnitSlug,
  cycleId,
  monthAnchor,
  campaigns,
  products,
  personas,
  canEdit,
  onCampaignsChange,
}: MonthlyCampaignsBarProps) {
  const [modalOpen, setModalOpen] = useState(false);
  const [editingCampaign, setEditingCampaign] = useState<MonthlyCampaign | null>(
    null,
  );
  const [preselectedType, setPreselectedType] =
    useState<MonthlyCampaignType>("vendas");
  const [isPending, startTransition] = useTransition();

  const year = monthAnchor.getFullYear();
  const month = monthAnchor.getMonth() + 1;
  const monthYearKey = `${year}-${String(month).padStart(2, "0")}`;
  const monthLabel = `${MONTH_NAMES[monthAnchor.getMonth()]} de ${year}`;

  // Filtra as campanhas vigentes do mês ativo
  const activeCampaigns = campaigns.filter(
    (c) => c.monthYearKey === monthYearKey,
  );
  const vendasCamp = activeCampaigns.find((c) => c.type === "vendas");
  const captacaoCamp = activeCampaigns.find((c) => c.type === "captacao");
  const awarenessCamp = activeCampaigns.find((c) => c.type === "awareness");

  function handleOpenCreate(type: MonthlyCampaignType) {
    setEditingCampaign(null);
    setPreselectedType(type);
    setModalOpen(true);
  }

  function handleOpenEdit(campaign: MonthlyCampaign) {
    setEditingCampaign(campaign);
    setPreselectedType(campaign.type);
    setModalOpen(true);
  }

  return (
    <div className="mb-4 rounded-2xl border border-slate-200/90 bg-gradient-to-r from-slate-50/80 via-white to-slate-50/60 p-3 shadow-2xs">
      <div className="flex flex-col gap-2.5 sm:flex-row sm:items-center sm:justify-between">
        {/* Título da Seção com Ícone */}
        <div className="flex items-center gap-2">
          <div className="flex size-7 items-center justify-center rounded-lg bg-brand-100 text-brand-700 shadow-2xs">
            <Target className="size-4" />
          </div>
          <div>
            <div className="flex items-center gap-1.5">
              <span className="text-xs font-bold text-slate-900 tracking-tight">
                Campanhas do Mês
              </span>
              <span className="rounded bg-slate-200/60 px-1.5 py-0.2 text-[10px] font-semibold text-slate-600">
                {monthLabel}
              </span>
            </div>
            <p className="text-[11px] text-slate-500">
              Foco estratégico de marketing para o período
            </p>
          </div>
        </div>

        {/* Três Slots de Campanhas: Vendas, Captação e Awareness */}
        <div className="flex flex-wrap items-center gap-2">
          {/* 1. Slot de Vendas */}
          {vendasCamp ? (
            <button
              type="button"
              onClick={() => handleOpenEdit(vendasCamp)}
              className={cn(
                "group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-xs transition cursor-pointer shadow-2xs",
                CAMPAIGN_STYLES.vendas.badgeBg,
                CAMPAIGN_STYLES.vendas.badgeBorder,
                CAMPAIGN_STYLES.vendas.pillBg,
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  CAMPAIGN_STYLES.vendas.dotBg,
                )}
              />
              <div className="min-w-0 max-w-[200px]">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-emerald-950 truncate">
                    {vendasCamp.title}
                  </span>
                  <span className="rounded bg-emerald-200/60 px-1 text-[9px] font-bold text-emerald-800 uppercase">
                    Vendas
                  </span>
                </div>
                <p className="truncate text-[10px] text-emerald-700/90">
                  {vendasCamp.productName || "Produto"}
                  {vendasCamp.salesGoal ? ` • Meta: ${vendasCamp.salesGoal}` : ""}
                </p>
              </div>
              <ChevronRight className="size-3 text-emerald-400 group-hover:text-emerald-700 transition ml-0.5" />
            </button>
          ) : canEdit ? (
            <button
              type="button"
              onClick={() => handleOpenCreate("vendas")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-emerald-300 bg-emerald-50/40 px-2.5 py-1.5 text-xs font-semibold text-emerald-700 hover:bg-emerald-50 transition cursor-pointer"
            >
              <Plus className="size-3" />
              <span>+ Vendas</span>
            </button>
          ) : null}

          {/* 2. Slot de Captação */}
          {captacaoCamp ? (
            <button
              type="button"
              onClick={() => handleOpenEdit(captacaoCamp)}
              className={cn(
                "group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-xs transition cursor-pointer shadow-2xs",
                CAMPAIGN_STYLES.captacao.badgeBg,
                CAMPAIGN_STYLES.captacao.badgeBorder,
                CAMPAIGN_STYLES.captacao.pillBg,
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  CAMPAIGN_STYLES.captacao.dotBg,
                )}
              />
              <div className="min-w-0 max-w-[210px]">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-sky-950 truncate">
                    {captacaoCamp.title}
                  </span>
                  <span className="rounded bg-sky-200/60 px-1 text-[9px] font-bold text-sky-800 uppercase">
                    Captação
                  </span>
                </div>
                <p className="truncate text-[10px] text-sky-700/90">
                  {captacaoCamp.leadMagnet
                    ? `Isca: ${captacaoCamp.leadMagnet}`
                    : "Isca ativa"}
                  {captacaoCamp.leadsCount
                    ? ` • ${captacaoCamp.leadsCount} leads`
                    : ""}
                </p>
              </div>
              <ChevronRight className="size-3 text-sky-400 group-hover:text-sky-700 transition ml-0.5" />
            </button>
          ) : canEdit ? (
            <button
              type="button"
              onClick={() => handleOpenCreate("captacao")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-sky-300 bg-sky-50/40 px-2.5 py-1.5 text-xs font-semibold text-sky-700 hover:bg-sky-50 transition cursor-pointer"
            >
              <Plus className="size-3" />
              <span>+ Captação</span>
            </button>
          ) : null}

          {/* 3. Slot de Awareness */}
          {awarenessCamp ? (
            <button
              type="button"
              onClick={() => handleOpenEdit(awarenessCamp)}
              className={cn(
                "group flex items-center gap-2 rounded-xl border px-3 py-1.5 text-left text-xs transition cursor-pointer shadow-2xs",
                CAMPAIGN_STYLES.awareness.badgeBg,
                CAMPAIGN_STYLES.awareness.badgeBorder,
                CAMPAIGN_STYLES.awareness.pillBg,
              )}
            >
              <span
                className={cn(
                  "size-2 shrink-0 rounded-full",
                  CAMPAIGN_STYLES.awareness.dotBg,
                )}
              />
              <div className="min-w-0 max-w-[190px]">
                <div className="flex items-center gap-1">
                  <span className="font-bold text-purple-950 truncate">
                    {awarenessCamp.title}
                  </span>
                  <span className="rounded bg-purple-200/60 px-1 text-[9px] font-bold text-purple-800 uppercase">
                    Awareness
                  </span>
                </div>
                <p className="truncate text-[10px] text-purple-700/90">
                  {awarenessCamp.channels || "Canais & Branding"}
                </p>
              </div>
              <ChevronRight className="size-3 text-purple-400 group-hover:text-purple-700 transition ml-0.5" />
            </button>
          ) : canEdit ? (
            <button
              type="button"
              onClick={() => handleOpenCreate("awareness")}
              className="inline-flex items-center gap-1.5 rounded-xl border border-dashed border-purple-300 bg-purple-50/40 px-2.5 py-1.5 text-xs font-semibold text-purple-700 hover:bg-purple-50 transition cursor-pointer"
            >
              <Plus className="size-3" />
              <span>+ Awareness</span>
            </button>
          ) : null}
        </div>
      </div>

      {/* Modal / Dialog de Edição e Criação de Campanha */}
      {modalOpen && (
        <CampaignModal
          businessUnitSlug={businessUnitSlug}
          cycleId={cycleId}
          monthYearKey={monthYearKey}
          monthLabel={monthLabel}
          initialType={preselectedType}
          campaign={editingCampaign}
          products={products}
          personas={personas}
          canEdit={canEdit}
          onClose={() => setModalOpen(false)}
          onSaved={(saved) => {
            setModalOpen(false);
            const next = editingCampaign
              ? campaigns.map((c) => (c.id === saved.id ? saved : c))
              : [...campaigns, saved];
            onCampaignsChange?.(next);
          }}
          onDeleted={(deletedId) => {
            setModalOpen(false);
            const next = campaigns.filter((c) => c.id !== deletedId);
            onCampaignsChange?.(next);
          }}
        />
      )}
    </div>
  );
}

export function CampaignModal({
  businessUnitSlug,
  cycleId,
  monthYearKey,
  monthLabel,
  initialType,
  campaign,
  products,
  personas,
  canEdit,
  onClose,
  onSaved,
  onDeleted,
}: {
  businessUnitSlug: string;
  cycleId: string;
  monthYearKey: string;
  monthLabel: string;
  initialType: MonthlyCampaignType;
  campaign: MonthlyCampaign | null;
  products: CampaignProductOption[];
  personas: CampaignPersonaOption[];
  canEdit: boolean;
  onClose: () => void;
  onSaved: (campaign: MonthlyCampaign) => void;
  onDeleted: (id: string) => void;
}) {
  const [type, setType] = useState<MonthlyCampaignType>(
    campaign?.type || initialType,
  );
  const [title, setTitle] = useState(campaign?.title || "");
  const [productId, setProductId] = useState(campaign?.productId || "");
  const [personaId, setPersonaId] = useState(campaign?.personaId || "");
  const [leadMagnet, setLeadMagnet] = useState(campaign?.leadMagnet || "");
  const [leadsCount, setLeadsCount] = useState(campaign?.leadsCount || "");
  const [salesGoal, setSalesGoal] = useState(campaign?.salesGoal || "");
  const [offerDetails, setOfferDetails] = useState(
    campaign?.offerDetails || "",
  );
  const [channels, setChannels] = useState(campaign?.channels || "");
  const [notes, setNotes] = useState(campaign?.notes || "");
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    if (!title.trim()) {
      toast.error("Informe o nome da campanha.");
      return;
    }

    setIsSubmitting(true);
    const selectedProd = products.find((p) => p.id === productId);
    const selectedPersona = personas.find((p) => p.id === personaId);

    const res = await saveMonthlyCampaignAction({
      id: campaign?.id,
      cycleId,
      businessUnitSlug,
      type,
      title: title.trim(),
      monthYearKey,
      productId: productId || null,
      productName: selectedProd?.name || null,
      leadMagnet: leadMagnet || null,
      leadsCount: leadsCount || null,
      personaId: personaId || null,
      personaName: selectedPersona?.name || null,
      offerDetails: offerDetails || null,
      salesGoal: salesGoal || null,
      channels: channels || null,
      notes: notes || null,
    });

    setIsSubmitting(false);
    if (res.ok && res.campaign) {
      toast.success(
        campaign ? "Campanha atualizada!" : "Campanha criada com sucesso!",
      );
      onSaved(res.campaign);
    } else {
      toast.error(res.error || "Erro ao salvar campanha.");
    }
  }

  async function handleDelete() {
    if (!campaign?.id) return;
    if (!confirm(`Tem certeza que deseja excluir a campanha "${campaign.title}"?`)) {
      return;
    }

    setIsDeleting(true);
    const res = await deleteMonthlyCampaignAction(
      campaign.id,
      businessUnitSlug,
    );
    setIsDeleting(false);

    if (res.ok) {
      toast.success("Campanha excluída.");
      onDeleted(campaign.id);
    } else {
      toast.error(res.error || "Erro ao excluir campanha.");
    }
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-xs p-4 animate-in fade-in">
      <div className="w-full max-w-lg rounded-2xl border border-slate-200 bg-white p-6 shadow-xl space-y-5">
        {/* Modal Header */}
        <div className="flex items-start justify-between border-b border-slate-100 pb-3">
          <div>
            <span className="inline-block rounded bg-brand-100 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-brand-800">
              Campanha do Mês • {monthLabel}
            </span>
            <h2 className="mt-1 font-display text-lg font-bold text-slate-900">
              {campaign ? "Editar Campanha" : "Nova Campanha de Marketing"}
            </h2>
          </div>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-700 transition cursor-pointer"
          >
            <X className="size-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Seletor de Tipo de Campanha */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1.5">
              Tipo de Campanha
            </label>
            <div className="grid grid-cols-3 gap-2">
              {(["vendas", "captacao", "awareness"] as MonthlyCampaignType[]).map(
                (opt) => {
                  const style = CAMPAIGN_STYLES[opt];
                  const Icon = style.icon;
                  const selected = type === opt;
                  return (
                    <button
                      key={opt}
                      type="button"
                      onClick={() => setType(opt)}
                      className={cn(
                        "flex items-center justify-center gap-1.5 rounded-xl border py-2 px-3 text-xs font-bold transition cursor-pointer",
                        selected
                          ? cn(style.badgeBg, style.badgeBorder, style.badgeText, "ring-1 ring-inset")
                          : "border-slate-200 text-slate-600 hover:bg-slate-50",
                      )}
                    >
                      <Icon className="size-3.5" />
                      <span>{style.label}</span>
                    </button>
                  );
                },
              )}
            </div>
          </div>

          {/* Nome da Campanha */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Título da Campanha *
            </label>
            <input
              type="text"
              required
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder={
                type === "vendas"
                  ? "Ex.: Lote Promocional Extensivo Cirurgia 2027"
                  : type === "captacao"
                    ? "Ex.: Captação Simulado Nacional ENARE R1"
                    : "Ex.: Semana da Especialidade no Podcast MedCof"
              }
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 px-3 py-2 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Campos específicos por Tipo */}
          {type === "vendas" && (
            <div className="space-y-3 rounded-xl border border-emerald-100 bg-emerald-50/30 p-3">
              <div>
                <label className="block text-xs font-semibold text-emerald-950 mb-1">
                  Produto Foco da Esteira
                </label>
                <select
                  value={productId}
                  onChange={(e) => setProductId(e.target.value)}
                  className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                >
                  <option value="">Selecione o produto foco...</option>
                  {products.map((p) => (
                    <option key={p.id} value={p.id}>
                      {p.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Meta de Vendas / Matrículas
                  </label>
                  <input
                    type="text"
                    value={salesGoal}
                    onChange={(e) => setSalesGoal(e.target.value)}
                    placeholder="Ex.: 300 matrículas"
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
                <div>
                  <label className="block text-xs font-semibold text-emerald-950 mb-1">
                    Oferta / Condição Comercial
                  </label>
                  <input
                    type="text"
                    value={offerDetails}
                    onChange={(e) => setOfferDetails(e.target.value)}
                    placeholder="Ex.: 12x s/ juros + Bônus"
                    className="w-full rounded-lg border border-emerald-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-emerald-500"
                  />
                </div>
              </div>
            </div>
          )}

          {type === "captacao" && (
            <div className="space-y-3 rounded-xl border border-sky-100 bg-sky-50/30 p-3">
              <div>
                <label className="block text-xs font-semibold text-sky-950 mb-1">
                  Isca Digital / Lead Magnet Ativo
                </label>
                <input
                  type="text"
                  value={leadMagnet}
                  onChange={(e) => setLeadMagnet(e.target.value)}
                  placeholder="Ex.: Guia 500 Questões Comentadas ou Simulado Aberto"
                  className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-semibold text-sky-950 mb-1">
                    Persona Foco
                  </label>
                  <select
                    value={personaId}
                    onChange={(e) => setPersonaId(e.target.value)}
                    className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  >
                    <option value="">Selecione a persona...</option>
                    {personas.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name} {p.specialtyTitle ? `(${p.specialtyTitle})` : ""}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-xs font-semibold text-sky-950 mb-1">
                    Meta ou Leads Captados
                  </label>
                  <input
                    type="text"
                    value={leadsCount}
                    onChange={(e) => setLeadsCount(e.target.value)}
                    placeholder="Ex.: 1.500 leads"
                    className="w-full rounded-lg border border-sky-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-sky-500"
                  />
                </div>
              </div>
            </div>
          )}

          {type === "awareness" && (
            <div className="space-y-3 rounded-xl border border-purple-100 bg-purple-50/30 p-3">
              <div>
                <label className="block text-xs font-semibold text-purple-950 mb-1">
                  Canais & Frentes de Divulgação
                </label>
                <input
                  type="text"
                  value={channels}
                  onChange={(e) => setChannels(e.target.value)}
                  placeholder="Ex.: YouTube Live, Instagram Reels, Podcast, E-mail"
                  className="w-full rounded-lg border border-purple-200 bg-white px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-1 focus:ring-purple-500"
                />
              </div>
            </div>
          )}

          {/* Observações / Notas */}
          <div>
            <label className="block text-xs font-semibold text-slate-700 mb-1">
              Observações Estratégicas (opcional)
            </label>
            <textarea
              rows={2}
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
              placeholder="Detalhes adicionais, alinhamento de equipe ou hipóteses para o mês..."
              className="w-full rounded-xl border border-slate-200 bg-slate-50/50 p-2.5 text-xs text-slate-900 placeholder:text-slate-400 focus:bg-white focus:border-brand-500 focus:outline-none focus:ring-1 focus:ring-brand-500"
            />
          </div>

          {/* Modal Actions */}
          <div className="flex items-center justify-between border-t border-slate-100 pt-3">
            {campaign && canEdit ? (
              <button
                type="button"
                disabled={isDeleting || isSubmitting}
                onClick={handleDelete}
                className="inline-flex items-center gap-1.5 text-xs font-bold text-rose-600 hover:text-rose-800 transition cursor-pointer"
              >
                <Trash2 className="size-3.5" />
                <span>{isDeleting ? "Excluindo..." : "Excluir"}</span>
              </button>
            ) : (
              <div />
            )}

            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={onClose}
                className="rounded-xl border border-slate-200 px-4 py-2 text-xs font-semibold text-slate-700 hover:bg-slate-50 transition cursor-pointer"
              >
                Cancelar
              </button>
              {canEdit && (
                <button
                  type="submit"
                  disabled={isSubmitting || !title.trim()}
                  className="inline-flex items-center gap-1.5 rounded-xl bg-brand-600 px-5 py-2 text-xs font-bold text-white shadow-2xs transition hover:bg-brand-700 disabled:opacity-50 cursor-pointer"
                >
                  {isSubmitting ? (
                    <>
                      <div className="size-3 animate-spin rounded-full border-2 border-white border-t-transparent" />
                      <span>Salvando...</span>
                    </>
                  ) : (
                    <>
                      <Check className="size-3.5" />
                      <span>Salvar Campanha</span>
                    </>
                  )}
                </button>
              )}
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
