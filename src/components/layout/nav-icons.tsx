import type { ComponentProps, ReactElement } from "react";

/**
 * Ícones da navegação.
 *
 * São SVGs de traço, e não emoji: emoji são renderizados coloridos e com
 * desenho diferente em cada sistema, o que quebra a leitura de um menu onde a
 * única cor deve ser a do item ativo.
 */
export const NAV_ICON_KEYS = [
  "dashboard",
  "generator",
  "docs",
  "personas",
  "strategy",
  "parameters",
  "admin",
] as const;

export type NavIconKey = (typeof NAV_ICON_KEYS)[number];

function Svg(props: ComponentProps<"svg">) {
  return (
    <svg
      viewBox="0 0 24 24"
      fill="none"
      stroke="currentColor"
      strokeWidth={1.75}
      strokeLinecap="round"
      strokeLinejoin="round"
      aria-hidden
      {...props}
    />
  );
}

const ICONS: Record<
  NavIconKey,
  (props: ComponentProps<"svg">) => ReactElement
> = {
    dashboard: (props) => (
      <Svg {...props}>
        <rect x="3" y="3" width="7.5" height="7.5" rx="2" />
        <rect x="13.5" y="3" width="7.5" height="7.5" rx="2" />
        <rect x="3" y="13.5" width="7.5" height="7.5" rx="2" />
        <rect x="13.5" y="13.5" width="7.5" height="7.5" rx="2" />
      </Svg>
    ),
    generator: (props) => (
      <Svg {...props}>
        <path d="M4 7h16" />
        <path d="M4 12h10" />
        <path d="M4 17h13" />
        <circle cx="18.5" cy="12" r="1.6" />
      </Svg>
    ),
    docs: (props) => (
      <Svg {...props}>
        <path d="M4 5.5A1.5 1.5 0 0 1 5.5 4H10a2 2 0 0 1 2 2v14a1.75 1.75 0 0 0-1.75-1.75H5.5A1.5 1.5 0 0 1 4 16.75Z" />
        <path d="M20 5.5A1.5 1.5 0 0 0 18.5 4H14a2 2 0 0 0-2 2v14a1.75 1.75 0 0 1 1.75-1.75h4.75A1.5 1.5 0 0 0 20 16.75Z" />
      </Svg>
    ),
    personas: (props) => (
      <Svg {...props}>
        <circle cx="12" cy="8" r="3.5" />
        <path d="M5 19.5a7 7 0 0 1 14 0" />
      </Svg>
    ),
    strategy: (props) => (
      <Svg {...props}>
        <rect x="3" y="4.5" width="18" height="16" rx="2.5" />
        <path d="M3 9.5h18" />
        <path d="M8 3v3M16 3v3" />
        <path d="M7.5 13h4M7.5 16.5h8" />
      </Svg>
    ),
    parameters: (props) => (
      <Svg {...props}>
        <path d="M4 7h7M15 7h5" />
        <path d="M4 17h5M13 17h7" />
        <circle cx="13" cy="7" r="2.2" />
        <circle cx="11" cy="17" r="2.2" />
      </Svg>
    ),
    admin: (props) => (
      <Svg {...props}>
        <circle cx="12" cy="12" r="3" />
        <path d="M12 2.5v2.2M12 19.3v2.2M4.9 4.9l1.6 1.6M17.5 17.5l1.6 1.6M2.5 12h2.2M19.3 12h2.2M4.9 19.1l1.6-1.6M17.5 6.5l1.6-1.6" />
      </Svg>
    ),
  };

export function NavIcon({
  name,
  className,
}: {
  name: NavIconKey;
  className?: string;
}) {
  const Icon = ICONS[name];
  return <Icon className={className} />;
}
