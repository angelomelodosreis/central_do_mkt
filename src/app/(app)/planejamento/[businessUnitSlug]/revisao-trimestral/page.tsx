import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function QuarterlyReviewPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessUnitSlug: string }>;
  searchParams: Promise<{ ciclo?: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { ciclo } = (await searchParams) ?? {};
  const query = new URLSearchParams();
  if (ciclo) query.set("ciclo", ciclo);
  query.set("aba", "revisoes");
  redirect(`/planejamento/${businessUnitSlug}/ciclos?${query.toString()}`);
}
