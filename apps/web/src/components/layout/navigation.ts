import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  CalendarDays,
  ClipboardList,
  FileText,
  LayoutDashboard,
  Settings2,
  Stethoscope,
  Users,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  /** Rótulo do trilho do tablet e da bottom nav: cabe em 80px a 12px. */
  shortLabel: string;
  icon: LucideIcon;
  group: "atendimento" | "gestao";
  /** Os quatro destinos da bottom nav do celular. O resto vive em "Mais". */
  primary?: boolean;
  /** Rotas filhas que acendem este item (detalhe de consulta → Painel). */
  match?: RegExp;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Painel do dia",
    shortLabel: "Painel",
    icon: LayoutDashboard,
    group: "atendimento",
    primary: true,
    match: /^\/(consultas(\/.*)?)?$/,
  },
  {
    to: "/agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    icon: CalendarDays,
    group: "atendimento",
    primary: true,
  },
  {
    to: "/sala-de-espera",
    label: "Sala de espera",
    shortLabel: "Espera",
    icon: Armchair,
    group: "atendimento",
    primary: true,
  },
  {
    to: "/pacientes",
    label: "Pacientes",
    shortLabel: "Pacientes",
    icon: Users,
    group: "atendimento",
    primary: true,
  },
  {
    to: "/pendencias",
    label: "Pendências",
    // Hífen opcional: no trilho de 84px a palavra quebra em "Pendên-cias".
    shortLabel: "Pendên\u00adcias",
    icon: ClipboardList,
    group: "gestao",
  },
  {
    to: "/profissionais",
    label: "Profissionais",
    shortLabel: "Equipe",
    icon: Stethoscope,
    group: "gestao",
  },
  {
    to: "/documentos",
    label: "Documentos",
    shortLabel: "Docs",
    icon: FileText,
    group: "gestao",
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    shortLabel: "Ajustes",
    icon: Settings2,
    group: "gestao",
  },
];

export const PRIMARY_NAV = NAV_ITEMS.filter((item) => item.primary);
export const SECONDARY_NAV = NAV_ITEMS.filter((item) => !item.primary);

/** O item acende para a própria rota e para as filhas dela. */
export function isNavActive(item: NavItem, pathname: string): boolean {
  if (item.match) return item.match.test(pathname);
  return pathname === item.to || pathname.startsWith(`${item.to}/`);
}
