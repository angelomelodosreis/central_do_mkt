import { redirect } from "next/navigation";

export default async function MetasRedirectPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessUnitSlug: string }>;
  searchParams?: Promise<{ ciclo?: string }>;
}) {
  const { businessUnitSlug } = await params;
  const sp = (await searchParams) ?? {};
  const query = new URLSearchParams();
  if (sp.ciclo) query.set("ciclo", sp.ciclo);
  query.set("aba", "metas");
  redirect(`/planejamento/${businessUnitSlug}/ciclos?${query.toString()}`);
}
