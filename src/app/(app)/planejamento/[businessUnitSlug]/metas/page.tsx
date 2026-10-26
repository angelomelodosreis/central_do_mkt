import { redirect } from "next/navigation";

export default async function MetasRedirectPage({
  params,
}: {
  params: Promise<{ businessUnitSlug: string }>;
}) {
  const { businessUnitSlug } = await params;
  redirect(`/planejamento/${businessUnitSlug}/ciclos?aba=metas`);
}
