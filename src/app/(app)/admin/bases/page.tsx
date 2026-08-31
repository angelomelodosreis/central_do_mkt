import { redirect } from "next/navigation";

export default function BasesIndexPage() {
  // A divisão é o topo da hierarquia — é por onde se lê a estrutura.
  redirect("/admin/bases/divisoes");
}
