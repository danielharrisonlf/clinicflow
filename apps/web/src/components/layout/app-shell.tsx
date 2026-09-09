import { Menu, Search } from "lucide-react";
import { useState } from "react";
import { NavLink, Outlet } from "react-router";
import { Kbd, MOD_KEY } from "@/components/ui/kbd";
import { ThemeToggle } from "@/components/ui/theme-toggle";
import { useAuth } from "@/features/auth/auth-context";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, PRIMARY_NAV, SECONDARY_NAV } from "./navigation";

/**
 * Casca da aplicação. A navegação muda de forma por breakpoint, não de conteúdo:
 * lateral rotulada no desktop, trilho de ícone no tablet, bottom nav no mobile.
 */
export function AppShell({ onOpenCommand }: { onOpenCommand: () => void }) {
  const [moreOpen, setMoreOpen] = useState(false);

  return (
    <div className="flex min-h-dvh bg-surface-app">
      <SideNav />

      <div className="flex min-w-0 flex-1 flex-col">
        <MobileTopBar onOpenCommand={onOpenCommand} />
        {/* pb-20 abre espaço para a bottom nav fixa; ela não pode cobrir conteúdo. */}
        <main className="min-w-0 flex-1 px-4 py-4 pb-20 md:px-6 md:py-6 md:pb-6">
          <Outlet />
        </main>
      </div>

      <BottomNav onMore={() => setMoreOpen(true)} />
      {moreOpen ? <MoreSheet onClose={() => setMoreOpen(false)} /> : null}
    </div>
  );
}

function SideNav() {
  const { user, logout } = useAuth();

  return (
    <nav
      aria-label="Navegação principal"
      className="hidden shrink-0 flex-col border-r border-border-subtle bg-surface-app md:flex md:w-[72px] lg:w-[212px]"
    >
      <div className="flex h-16 items-center gap-2 px-4 lg:px-5">
        <span className="flex size-8 shrink-0 items-center justify-center rounded-control bg-accent font-mono text-micro font-bold text-ink-onaccent">
          CF
        </span>
        <span className="hidden min-w-0 lg:block">
          <span className="block truncate text-body font-semibold text-ink-primary">
            ClinicFlow
          </span>
          <span className="block truncate text-micro text-ink-tertiary">
            Clínica Viver
          </span>
        </span>
      </div>

      <ul className="flex flex-1 flex-col gap-0.5 px-2 lg:px-3">
        {NAV_ITEMS.map((item) => (
          <li key={item.to}>
            <NavLink
              to={item.to}
              end={item.to === "/"}
              className={({ isActive }) =>
                cn(
                  "flex items-center gap-3 rounded-raised transition-colors duration-150",
                  "px-2 py-2.5 lg:px-3",
                  "max-lg:flex-col max-lg:gap-1 max-lg:px-1",
                  isActive
                    ? "bg-accent-weak text-accent"
                    : "text-ink-secondary hover:bg-surface-sunken hover:text-ink-primary",
                )
              }
            >
              <item.icon className="size-5 shrink-0" aria-hidden="true" />
              <span className="hidden text-body font-semibold lg:block">
                {item.label}
              </span>
              <span className="text-[11px] font-semibold lg:hidden">
                {item.shortLabel}
              </span>
            </NavLink>
          </li>
        ))}
      </ul>

      <div className="flex flex-col gap-2 border-t border-border-subtle p-3">
        <div className="max-lg:hidden">
          <ThemeToggle />
        </div>
        <button
          type="button"
          onClick={() => void logout()}
          className="flex w-full items-center gap-2 rounded-raised px-1 py-2 text-left transition-colors hover:bg-surface-sunken lg:px-2"
        >
          <span className="flex size-8 shrink-0 items-center justify-center rounded-full bg-accent-weak font-mono text-micro font-bold text-accent">
            {initials(user?.name)}
          </span>
          <span className="hidden min-w-0 lg:block">
            <span className="block truncate text-micro font-semibold text-ink-primary">
              {user?.name ?? "—"}
            </span>
            <span className="block truncate text-micro text-ink-tertiary">
              {user?.roleLabel ?? ""}
            </span>
          </span>
        </button>
      </div>
    </nav>
  );
}

function MobileTopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b border-border-subtle bg-surface-base px-4 md:hidden">
      <span className="flex size-7 items-center justify-center rounded-control bg-accent font-mono text-[11px] font-bold text-ink-onaccent">
        CF
      </span>
      <span className="text-body font-semibold text-ink-primary">
        ClinicFlow
      </span>
      <button
        type="button"
        onClick={onOpenCommand}
        aria-label="Buscar paciente, profissional ou ação"
        className="ml-auto flex size-11 items-center justify-center rounded-control text-ink-secondary transition-colors hover:bg-surface-sunken"
      >
        <Search className="size-5" aria-hidden="true" />
      </button>
    </header>
  );
}

function BottomNav({ onMore }: { onMore: () => void }) {
  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-30 flex h-16 border-t border-border-subtle bg-surface-base md:hidden"
    >
      {PRIMARY_NAV.map((item) => (
        <NavLink
          key={item.to}
          to={item.to}
          end={item.to === "/"}
          className={({ isActive }) =>
            cn(
              "flex flex-1 flex-col items-center justify-center gap-1",
              isActive ? "text-accent" : "text-ink-tertiary",
            )
          }
        >
          <item.icon className="size-5" aria-hidden="true" />
          <span className="text-[11px] font-semibold">{item.shortLabel}</span>
        </NavLink>
      ))}
      <button
        type="button"
        onClick={onMore}
        className="flex flex-1 flex-col items-center justify-center gap-1 text-ink-tertiary"
      >
        <Menu className="size-5" aria-hidden="true" />
        <span className="text-[11px] font-semibold">Mais</span>
      </button>
    </nav>
  );
}

/** Os destinos que não cabem nos cinco slots da bottom nav. */
function MoreSheet({ onClose }: { onClose: () => void }) {
  const { user, logout } = useAuth();

  return (
    <div className="fixed inset-0 z-40 md:hidden">
      <button
        type="button"
        aria-label="Fechar"
        onClick={onClose}
        className="absolute inset-0 bg-ink-primary/30"
      />
      <div className="absolute inset-x-0 bottom-0 rounded-t-modal bg-surface-base p-4 pb-6 shadow-panel">
        <p className="px-2 pb-2 text-micro font-semibold text-ink-tertiary">
          {user?.name} — {user?.roleLabel}
        </p>
        <div className="px-2 pb-3">
          <ThemeToggle />
        </div>
        <ul className="flex flex-col">
          {SECONDARY_NAV.map((item) => (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onClose}
                className="flex min-h-12 items-center gap-3 rounded-raised px-2 text-body font-semibold text-ink-primary"
              >
                <item.icon
                  className="size-5 text-ink-secondary"
                  aria-hidden="true"
                />
                {item.label}
              </NavLink>
            </li>
          ))}
          <li className="mt-1 border-t border-border-subtle pt-1">
            <button
              type="button"
              onClick={() => void logout()}
              className="flex min-h-12 w-full items-center rounded-raised px-2 text-left text-body font-semibold text-state-atrasada"
            >
              Sair da conta
            </button>
          </li>
        </ul>
      </div>
    </div>
  );
}

/** Barra de comando do desktop, anunciada com o atalho que ela responde. */
export function CommandTrigger({ onClick }: { onClick: () => void }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="hidden h-10 min-w-64 items-center gap-2 rounded-control border border-border-default bg-surface-base px-3 text-left text-body text-ink-tertiary transition-colors hover:border-ink-tertiary md:flex"
    >
      <Search className="size-4 shrink-0" aria-hidden="true" />
      <span className="flex-1 truncate">Buscar paciente, médico ou ação</span>
      <Kbd>{MOD_KEY === "⌘" ? "⌘K" : "Ctrl K"}</Kbd>
    </button>
  );
}

function initials(name?: string): string {
  if (!name) return "—";
  const parts = name.trim().split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}
