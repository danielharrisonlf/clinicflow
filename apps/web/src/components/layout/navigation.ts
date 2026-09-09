import type { LucideIcon } from "lucide-react";
import {
  CalendarDays,
  FileText,
  Hourglass,
  LayoutDashboard,
  ListTodo,
  SlidersHorizontal,
  Stethoscope,
  Users,
} from "lucide-react";

export interface NavItem {
  to: string;
  label: string;
  /** Rótulo curto do trilho do tablet: 72px não comporta a palavra inteira. */
  shortLabel: string;
  icon: LucideIcon;
  /** Os cinco destinos da bottom nav do mobile. O resto vive em "Mais". */
  primary?: boolean;
}

export const NAV_ITEMS: NavItem[] = [
  {
    to: "/",
    label: "Painel do dia",
    shortLabel: "Painel",
    icon: LayoutDashboard,
    primary: true,
  },
  {
    to: "/agenda",
    label: "Agenda",
    shortLabel: "Agenda",
    icon: CalendarDays,
    primary: true,
  },
  {
    to: "/pacientes",
    label: "Pacientes",
    shortLabel: "Pacientes",
    icon: Users,
    primary: true,
  },
  {
    to: "/sala-de-espera",
    label: "Sala de espera",
    shortLabel: "Espera",
    icon: Hourglass,
    primary: true,
  },
  {
    to: "/profissionais",
    label: "Profissionais",
    shortLabel: "Médicos",
    icon: Stethoscope,
  },
  {
    to: "/documentos",
    label: "Documentos",
    shortLabel: "Docs",
    icon: FileText,
  },
  {
    to: "/pendencias",
    label: "Pendências",
    shortLabel: "Pendências",
    icon: ListTodo,
  },
  {
    to: "/configuracoes",
    label: "Configurações",
    shortLabel: "Ajustes",
    icon: SlidersHorizontal,
  },
];

export const PRIMARY_NAV = NAV_ITEMS.filter((item) => item.primary);
export const SECONDARY_NAV = NAV_ITEMS.filter((item) => !item.primary);
