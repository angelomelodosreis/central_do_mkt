import { redirect } from "next/navigation";

export const dynamic = "force-dynamic";

export default async function DiagnosisPage({
  params,
  searchParams,
}: {
  params: Promise<{ businessUnitSlug: string }>;
  searchParams: Promise<{
    ciclo?: string;
    rodada?: string;
    aba?: string;
    subaba?: string;
  }>;
}) {
  const { businessUnitSlug } = await params;
  const { ciclo, rodada, aba, subaba } = (await searchParams) ?? {};
  const query = new URLSearchParams();
  if (ciclo) query.set("ciclo", ciclo);
  if (rodada) query.set("rodada", rodada);
  query.set("aba", aba === "comentarios" ? "diagnostico" : (aba ?? "diagnostico"));
  if (aba === "comentarios" || subaba === "comentarios") {
    query.set("subaba", "comentarios");
  } else if (subaba) {
    query.set("subaba", subaba);
  }
  redirect(`/planejamento/${businessUnitSlug}/ciclos?${query.toString()}`);
}
