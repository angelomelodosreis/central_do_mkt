import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function GoalsPage({
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
  query.set("aba", "metas");
  redirect(`/planejamento/${businessUnitSlug}/ciclos?${query.toString()}`);
}
