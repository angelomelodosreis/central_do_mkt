import { redirect } from "next/navigation";

export default function AdminIndexPage() {
  // A primeira coisa que um administrador precisa ver são os acessos pendentes.
  redirect("/admin/usuarios");
}
