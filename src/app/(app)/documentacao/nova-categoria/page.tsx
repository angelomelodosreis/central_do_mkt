import type { Metadata } from "next";
import Link from "next/link";

import { CategoryForm } from "../category-form";
import { Card, CardBody, PageHeader } from "@/components/ui/card";
import { requirePermission } from "@/lib/auth/session";
import { listCategories } from "@/lib/modules/documentation/queries";

export const metadata: Metadata = { title: "Nova categoria" };
export const dynamic = "force-dynamic";

export default async function NewCategoryPage() {
  await requirePermission("documentation", "edit");
  const categories = await listCategories();

  return (
    <>
      <nav className="mb-4 text-sm text-slate-500">
        <Link href="/documentacao" className="hover:text-slate-900">
          Documentação
        </Link>
        <span aria-hidden className="mx-1.5">
          /
        </span>
        <span className="text-slate-700">Nova categoria</span>
      </nav>

      <PageHeader
        title="Nova categoria"
        description="Categorias organizam as páginas de documentação em grupos."
      />

      <Card>
        <CardBody className="sm:px-6 sm:py-5">
          <CategoryForm
            mode="create"
            cancelHref="/documentacao"
            values={{ name: "", description: "", pageTemplate: "" }}
          />
        </CardBody>
      </Card>

      {categories.length > 0 ? (
        <div className="mt-6">
          <p className="text-sm font-medium text-slate-700">
            Categorias já existentes
          </p>
          <ul className="mt-2 flex flex-wrap gap-1.5">
            {categories.map((category) => (
              <li
                key={category.id}
                className="rounded-md bg-slate-100 px-2 py-1 text-xs text-slate-700"
              >
                {category.name}
              </li>
            ))}
          </ul>
        </div>
      ) : null}
    </>
  );
}
