import type { Metadata } from "next";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { requirePermission } from "@/lib/auth/session";
import { listBusinessUnits } from "@/lib/modules/bases/queries";
import { listPeople } from "@/lib/modules/org/people";
import { listReviewFeedItems } from "@/lib/modules/review/feed-queries";
import { ReviewFeedView } from "./review-feed-view";

export const metadata: Metadata = {
  title: "Feed de Revisão de Planejamento",
  description:
    "Visão unificada das revisões de planejamento e acompanhamento por BU com histórico de observações e prazos de follow-up.",
};

export const dynamic = "force-dynamic";

export default async function PlanningReviewsPage({
  searchParams,
}: {
  searchParams: Promise<{ bu?: string; status?: string; search?: string }>;
}) {
  const currentUser = await requirePermission("strategy", "view");
  const params = await searchParams;

  const [allUnits, items, people] = await Promise.all([
    listBusinessUnits({ includeInactive: false }),
    listReviewFeedItems({
      businessUnitSlug: params.bu,
      status: params.status,
      search: params.search,
    }),
    listPeople({ includeInactive: false }),
  ]);

  const buOptions = allUnits.map((u) => ({
    id: u.id,
    slug: u.slug,
    label: u.label,
  }));

  const assignableUsers = people.map((p) => ({
    id: p.id,
    name: p.name,
    email: p.email,
    jobTitleName: p.jobTitleName,
  }));

  return (
    <div className="space-y-6">
      {/* Back button breadcrumb */}
      <div>
        <Link
          href="/planejamento"
          className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-slate-900 transition"
        >
          <ArrowLeft className="size-3.5" />
          <span>Voltar para Planejamento Geral</span>
        </Link>
      </div>

      <ReviewFeedView
        initialItems={items}
        businessUnits={buOptions}
        assignableUsers={assignableUsers}
        currentCoordinator={currentUser.name || "Ingrid Silva"}
        preselectedBuSlug={params.bu}
        currentUserId={currentUser.id}
        currentUserEmail={currentUser.email}
        isAdmin={currentUser.isSuperAdmin || currentUser.role === "admin" || currentUser.role === "leader"}
      />
    </div>
  );
}
