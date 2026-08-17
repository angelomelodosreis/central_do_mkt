import { redirect } from "next/navigation";

export default function ParametersIndexPage() {
  // Por ora Parâmetros tem uma única área. Quando houver outras, isto vira uma
  // tela de índice em vez de um desvio.
  redirect("/parametros/nomenclaturas");
}
