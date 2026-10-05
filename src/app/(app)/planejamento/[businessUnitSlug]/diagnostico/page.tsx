import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DiagnosisPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessUnitSlug: string }>;
  searchParams: Promise<{ ciclo?: string; rodada?: string }>;
}) {
  const { businessUnitSlug } = await params;
  const { ciclo, rodada } = (await searchParams) ?? {};
  const query = new URLSearchParams();
  if (ciclo) query.set("ciclo", ciclo);
  if (rodada) query.set("rodada", rodada);
  query.set("aba", "diagnostico");
  redirect(`/planejamento/${businessUnitSlug}/ciclos?${query.toString()}`);
}
