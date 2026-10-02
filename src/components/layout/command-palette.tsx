"use client";

import { useEffect, useState, useMemo } from "react";
import { useRouter } from "next/navigation";
import {
  Search,
  Building2,
  Calendar,
  FileText,
  CheckSquare,
  Shield,
  Layers,
  Wand2,
  Command,
  ArrowRight,
  Users,
  User,
  TrendingUp,
} from "lucide-react";

import { cn } from "@/lib/utils/cn";
import { matchesSearch } from "@/lib/utils/text";

type CommandItem = {
  id: string;
  title: string;
  subtitle?: string;
  category: "Navegação" | "Business Units" | "Ações Rápidas";
  href: string;
  icon: typeof Building2;
};

const DEFAULT_COMMANDS: CommandItem[] = [
  {
    id: "nav_painel",
    title: "Painel Geral",
    subtitle: "Visão consolidada e métricas",
    category: "Navegação",
    href: "/painel",
    icon: Layers,
  },
  {
    id: "nav_panorama",
    title: "Panorama Executivo & Vendas",
    subtitle: "Vendas real-time Google Sheets, pacing MoM e fechamento",
    category: "Navegação",
    href: "/panorama",
    icon: TrendingUp,
  },
  {
    id: "nav_styleguide",
    title: "Design System & Style Guide",
    subtitle: "Tokens visuais, componentes e padrões MedCof",
    category: "Navegação",
    href: "/styleguide",
    icon: FileText,
  },
  {
    id: "nav_gerador",
    title: "Gerador de Nomes CRM",
    subtitle: "Listas, tags e campanhas",
    category: "Navegação",
    href: "/gerador-de-nomes",
    icon: Wand2,
  },
  {
    id: "nav_docs",
    title: "Documentação & Processos",
    subtitle: "Base de conhecimento da MedCof",
    category: "Navegação",
    href: "/documentacao",
    icon: FileText,
  },
  {
    id: "nav_planejamento",
    title: "Planejamento Estratégico",
    subtitle: "O ano de cada BU",
    category: "Navegação",
    href: "/planejamento",
    icon: Calendar,
  },
  {
    id: "nav_tarefas",
    title: "Fila de Tarefas",
    subtitle: "Tarefas individuais e do time",
    category: "Navegação",
    href: "/tarefas",
    icon: CheckSquare,
  },

  {
    id: "nav_organograma",
    title: "Organograma & Pessoas",
    subtitle: "Áreas, subáreas, times e cargos",
    category: "Navegação",
    href: "/organograma",
    icon: Users,
  },
  {
    id: "nav_admin_usuarios",
    title: "Matriz de Governança & Usuários",
    subtitle: "Quem controla o quê e controle de cascata",
    category: "Navegação",
    href: "/admin/usuarios",
    icon: Shield,
  },
  {
    id: "nav_perfil",
    title: "Meu Perfil & Acessos",
    subtitle: "Editar nome, minhas BUs e segurança 2FA",
    category: "Navegação",
    href: "/perfil",
    icon: User,
  },
  {
    id: "nav_lista_bus",
    title: "Lista Oficial de BUs",
    subtitle: "Catálogo completo das 23 Business Units (MEDCOF_*)",
    category: "Navegação",
    href: "/planejamento?aba=lista",
    icon: Building2,
  },
  // Business Units Oficiais
  {
    id: "bu_residencia",
    title: "Residência Médica",
    subtitle: "MEDCOF_RESIDENCIA · Divisão Especialidades",
    category: "Business Units",
    href: "/planejamento/residencia",
    icon: Building2,
  },
  {
    id: "bu_revalida",
    title: "Revalida",
    subtitle: "MEDCOF_REVALIDA · Divisão Revalidação",
    category: "Business Units",
    href: "/planejamento/revalida",
    icon: Building2,
  },
  {
    id: "bu_cardiologia",
    title: "Cardiologia",
    subtitle: "MEDCOF_CARDIOLOGIA · Título de Especialista",
    category: "Business Units",
    href: "/planejamento/cardiologia",
    icon: Building2,
  },
  {
    id: "bu_pediatria",
    title: "Pediatria",
    subtitle: "MEDCOF_PEDIATRIA · Título de Especialista",
    category: "Business Units",
    href: "/planejamento/pediatria",
    icon: Building2,
  },
  {
    id: "bu_ginecologia",
    title: "Ginecologia e Obstetrícia",
    subtitle: "MEDCOF_GINECOLOGIA_E_OBSTETRICIA · Título de Especialista",
    category: "Business Units",
    href: "/planejamento/ginecologia_e_obstetricia",
    icon: Building2,
  },
  {
    id: "bu_cirurgia",
    title: "Cirurgia Geral",
    subtitle: "MEDCOF_CIRURGIA · R3 / Especialidades",
    category: "Business Units",
    href: "/planejamento/cirurgia",
    icon: Building2,
  },
  {
    id: "bu_clinica",
    title: "Clínica Médica",
    subtitle: "MEDCOF_CLINICA_MEDICA · R3 / Especialidades",
    category: "Business Units",
    href: "/planejamento/clinica_medica",
    icon: Building2,
  },
  {
    id: "bu_ps",
    title: "Lifehacks / Pronto Socorro",
    subtitle: "MEDCOF_LIFEHACKS · Formação Médica",
    category: "Business Units",
    href: "/planejamento/ps",
    icon: Building2,
  },
  {
    id: "bu_anestesiologia",
    title: "Anestesiologia",
    subtitle: "MEDCOF_ANESTESIOLOGIA · Especialidades",
    category: "Business Units",
    href: "/planejamento/anestesiologia",
    icon: Building2,
  },
  {
    id: "bu_dermatologia",
    title: "Dermatologia",
    subtitle: "MEDCOF_DERMATOLOGIA · Especialidades",
    category: "Business Units",
    href: "/planejamento/dermatologia",
    icon: Building2,
  },
  {
    id: "bu_oftalmologia",
    title: "Oftalmologia",
    subtitle: "MEDCOF_OFTALMOLOGIA · Especialidades",
    category: "Business Units",
    href: "/planejamento/oftalmologia",
    icon: Building2,
  },
  {
    id: "bu_ortopedia",
    title: "Ortopedia",
    subtitle: "MEDCOF_ORTOPEDIA · Especialidades",
    category: "Business Units",
    href: "/planejamento/ortopedia",
    icon: Building2,
  },
  {
    id: "bu_radiologia",
    title: "Radiologia",
    subtitle: "MEDCOF_RADIOLOGIA · Especialidades",
    category: "Business Units",
    href: "/planejamento/radiologia",
    icon: Building2,
  },
  {
    id: "bu_urologia",
    title: "Urologia",
    subtitle: "MEDCOF_UROLOGIA · Especialidades",
    category: "Business Units",
    href: "/planejamento/urologia",
    icon: Building2,
  },
  {
    id: "bu_otorrino",
    title: "Otorrinolaringologia",
    subtitle: "MEDCOF_OTORRINOLARINGOLOGIA · Especialidades",
    category: "Business Units",
    href: "/planejamento/otorrinolaringologia",
    icon: Building2,
  },
  {
    id: "bu_internato",
    title: "Internato",
    subtitle: "MEDCOF_INTERNATO · Graduação Médica",
    category: "Business Units",
    href: "/planejamento/internato",
    icon: Building2,
  },
  {
    id: "bu_emergencia",
    title: "Medicina de Emergência",
    subtitle: "MEDCOF_MEDICINA_DE_EMERGENCIA · Formação",
    category: "Business Units",
    href: "/planejamento/medicina_de_emergencia",
    icon: Building2,
  },
  {
    id: "bu_intensiva",
    title: "Medicina Intensiva",
    subtitle: "MEDCOF_MEDICINA_INTENSIVA · Especialidades",
    category: "Business Units",
    href: "/planejamento/medicina_intensiva",
    icon: Building2,
  },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const [selectedIndex, setSelectedIndex] = useState(0);
  const router = useRouter();

  // Escuta Ctrl+K ou Cmd+K
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.ctrlKey || e.metaKey) && e.key === "k") {
        e.preventDefault();
        setOpen((prev) => !prev);
      } else if (e.key === "Escape") {
        setOpen(false);
      }
    }

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

  const filteredItems = useMemo(() => {
    if (!query.trim()) return DEFAULT_COMMANDS;
    return DEFAULT_COMMANDS.filter((item) =>
      matchesSearch(query, item.title, item.subtitle ?? "", item.category),
    );
  }, [query]);

  // Teclado: Navegar para cima e para baixo
  useEffect(() => {
    setSelectedIndex(0);
  }, [query]);

  useEffect(() => {
    if (!open) return;

    function handleNavigation(e: KeyboardEvent) {
      if (e.key === "ArrowDown") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev < filteredItems.length - 1 ? prev + 1 : 0,
        );
      } else if (e.key === "ArrowUp") {
        e.preventDefault();
        setSelectedIndex((prev) =>
          prev > 0 ? prev - 1 : filteredItems.length - 1,
        );
      } else if (e.key === "Enter" && filteredItems[selectedIndex]) {
        e.preventDefault();
        const target = filteredItems[selectedIndex];
        setOpen(false);
        router.push(target.href);
      }
    }

    window.addEventListener("keydown", handleNavigation);
    return () => window.removeEventListener("keydown", handleNavigation);
  }, [open, filteredItems, selectedIndex, router]);

  if (!open) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-16 sm:pt-24">
      {/* Backdrop */}
      <div
        className="fixed inset-0 bg-slate-900/40 backdrop-blur-xs transition-opacity"
        onClick={() => setOpen(false)}
      />

      {/* Caixa de Comando */}
      <div className="relative w-full max-w-xl overflow-hidden rounded-2xl border border-slate-200 bg-white shadow-2xl transition-all">
        {/* Input da Busca */}
        <div className="flex items-center border-b border-slate-200 px-4 py-3">
          <Search className="size-5 text-slate-400" />
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            autoFocus
            placeholder="Buscar páginas, Business Units ou ferramentas… (ex: 'Residência', 'Tarefas')"
            className="ml-3 flex-1 bg-transparent text-sm text-slate-900 placeholder:text-slate-400 focus:outline-none"
          />
          <kbd className="hidden rounded bg-slate-100 px-2 py-0.5 text-[10px] font-semibold text-slate-500 sm:inline-block">
            ESC
          </kbd>
        </div>

        {/* Lista de Resultados */}
        <div className="max-h-80 overflow-y-auto p-2">
          {filteredItems.length === 0 ? (
            <div className="py-8 text-center text-xs text-slate-500">
              Nenhum resultado encontrado para &quot;{query}&quot;.
            </div>
          ) : (
            filteredItems.map((item, index) => {
              const Icon = item.icon;
              const isSelected = index === selectedIndex;
              return (
                <button
                  key={item.id}
                  type="button"
                  onClick={() => {
                    setOpen(false);
                    router.push(item.href);
                  }}
                  onMouseEnter={() => setSelectedIndex(index)}
                  className={cn(
                    "flex w-full items-center justify-between rounded-xl px-3 py-2.5 text-left text-xs transition",
                    isSelected
                      ? "bg-slate-100 text-slate-900"
                      : "text-slate-600 hover:bg-slate-50 hover:text-slate-900",
                  )}
                >
                  <div className="flex items-center gap-3">
                    <div
                      className={cn(
                        "rounded-lg p-1.5",
                        isSelected
                          ? "bg-white text-brand-600 shadow-xs"
                          : "bg-slate-100 text-slate-500",
                      )}
                    >
                      <Icon className="size-4" />
                    </div>
                    <div>
                      <p className="font-semibold text-slate-900">
                        {item.title}
                      </p>
                      {item.subtitle ? (
                        <p className="text-[11px] text-slate-500">
                          {item.subtitle}
                        </p>
                      ) : null}
                    </div>
                  </div>

                  <span className="text-[10px] uppercase tracking-wider text-slate-400">
                    {item.category}
                  </span>
                </button>
              );
            })
          )}
        </div>

        {/* Rodapé da Paleta */}
        <div className="flex items-center justify-between border-t border-slate-100 bg-slate-50 px-4 py-2 text-[11px] text-slate-500">
          <div className="flex items-center gap-2">
            <span>Navegar: ↑ ↓</span>
            <span>·</span>
            <span>Abrir: ↵</span>
          </div>
          <span>Central do Marketing · MedCof</span>
        </div>
      </div>
    </div>
  );
}
