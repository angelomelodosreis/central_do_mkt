export type MonthlyCampaignType = "vendas" | "captacao" | "awareness";

export type MonthlyCampaign = {
  id: string;
  cycleId: string;
  type: MonthlyCampaignType;
  title: string;
  monthYearKey: string; // Ex: "2026-10"
  productId?: string | null;
  productName?: string | null;
  leadMagnet?: string | null;
  leadsCount?: string | null;
  personaId?: string | null;
  personaName?: string | null;
  offerDetails?: string | null;
  salesGoal?: string | null;
  channels?: string | null;
  status?: string;
  notes?: string | null;
};

export type CampaignProductOption = {
  id: string;
  name: string;
};

export type CampaignPersonaOption = {
  id: string;
  name: string;
  avatar?: string | null;
  specialtyTitle?: string | null;
};
