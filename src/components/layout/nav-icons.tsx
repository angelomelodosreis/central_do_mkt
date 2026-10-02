import type { ComponentProps } from "react";
import {
  LayoutDashboard,
  Wand2,
  BookOpen,
  UserCheck,
  Calendar,
  BarChart3,
  CheckSquare,
  Network,
  Shield,
} from "lucide-react";

export const NAV_ICON_KEYS = [
  "dashboard",
  "generator",
  "docs",
  "personas",
  "strategy",
  "panorama",
  "tasks",
  "org",
  "admin",
] as const;

export type NavIconKey = (typeof NAV_ICON_KEYS)[number];

const ICONS: Record<NavIconKey, typeof LayoutDashboard> = {
  dashboard: LayoutDashboard,
  generator: Wand2,
  docs: BookOpen,
  personas: UserCheck,
  strategy: Calendar,
  panorama: BarChart3,
  tasks: CheckSquare,
  org: Network,
  admin: Shield,
};

export function NavIcon({
  name,
  className,
}: {
  name: NavIconKey;
  className?: string;
}) {
  const Icon = ICONS[name] ?? LayoutDashboard;
  return <Icon className={className} aria-hidden />;
}
