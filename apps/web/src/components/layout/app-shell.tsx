import { useQuery } from "@tanstack/react-query";
import {
  ChevronsUpDown,
  LogOut,
  Menu as MenuIcon,
  Plus,
  Search,
} from "lucide-react";
import { useEffect, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router";
import { ButtonLink, IconButton } from "@/components/ui/button";
import { ErrorBoundary } from "@/components/ui/error-boundary";
import { isTypingTarget, Kbd, MOD_KEY } from "@/components/ui/kbd";
import { Menu, MenuItem, MenuLabel, MenuSeparator } from "@/components/ui/menu";
import { Overlay, overlayOpen } from "@/components/ui/overlay";
import { Avatar } from "@/components/ui/surface";
import { ThemeMenuItems, ThemeToggle } from "@/components/ui/theme-toggle";
import { setClinicTimeZone } from "@/features/appointments/labels";
import { useAuth } from "@/features/auth/auth-context";
import { settingsApi, waitingRoomApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";
import { BrandMark } from "./brand";
import {
  isNavActive,
  NAV_ITEMS,
  type NavItem,
  PRIMARY_NAV,
  SECONDARY_NAV,
} from "./navigation";

/**
 * Casca da aplicação. A navegação muda de forma por breakpoint, não de conteúdo:
 * barra lateral rotulada no desktop, trilho de ícones no tablet, barra superior
 * + bottom nav no celular. Busca e "Nova consulta" existem em todas as formas.
 */
export function AppShell({
  onOpenCommand,
  detailOpen = false,
}: {
  onOpenCommand: () => void;
  detailOpen?: boolean;
}) {
  const [moreOpen, setMoreOpen] = useState(false);
  const location = useLocation();
  const navigate = useNavigate();

  // A navegação por teclado chega ao conteúdo novo sem atravessar toda a barra.
  useEffect(() => {
    if (!overlayOpen()) {
      document.getElementById("conteudo")?.focus({ preventScroll: true });
    }
  }, [location.pathname]);

  // Atalhos de uma tecla do balcão: N nova consulta, S sala de espera.
  // Param dentro de campo e com qualquer sobreposição aberta.
  useEffect(() => {
    function onKeyDown(event: KeyboardEvent) {
      if (event.defaultPrevented || event.repeat) return;
      if (event.metaKey || event.ctrlKey || event.altKey) return;
      if (isTypingTarget(event.target) || overlayOpen()) return;
      if (document.querySelector('[role="menu"]')) return;
      const key = event.key.toLowerCase();
      if (key === "n") {
        event.preventDefault();
        navigate("/consultas/nova");
      } else if (key === "s") {
        event.preventDefault();
        navigate("/sala-de-espera");
      }
    }
    window.addEventListener("keydown", onKeyDown);
    return () => window.removeEventListener("keydown", onKeyDown);
  }, [navigate]);

  return (
    <div className="flex min-h-dvh bg-surface-app">
      <a
        href="#conteudo"
        className="sr-only z-[80] rounded-control bg-accent px-4 py-2 font-semibold text-ink-onaccent focus:not-sr-only focus:fixed focus:top-3 focus:left-3"
      >
        Pular para o conteúdo
      </a>

      <SideNav onOpenCommand={onOpenCommand} />

      <div className="flex min-w-0 flex-1 flex-col bg-surface-base md:min-h-dvh md:border-l md:border-border-subtle">
        <MobileTopBar onOpenCommand={onOpenCommand} />
        <main
          id="conteudo"
          tabIndex={-1}
          className="mx-auto w-full max-w-screen-2xl min-w-0 flex-1 px-4 pt-4 pb-[calc(var(--spacing-bottom-nav)+1.5rem+env(safe-area-inset-bottom))] outline-none sm:px-5 md:px-6 md:py-6 lg:px-8 lg:py-7"
        >
          <ErrorBoundary resetKey={location.pathname}>
            <Outlet context={{ detailOpen }} />
          </ErrorBoundary>
        </main>
      </div>

      <BottomNav
        onMore={() => setMoreOpen(true)}
        pathname={location.pathname}
      />
      <MoreSheet open={moreOpen} onClose={() => setMoreOpen(false)} />
    </div>
  );
}

function useClinicName(): string {
  const settings = useQuery({
    queryKey: qk.settings.general,
    queryFn: settingsApi.get,
    staleTime: 5 * 60_000,
  });
  const timezone = settings.data?.timezone;
  useEffect(() => setClinicTimeZone(timezone), [timezone]);
  return settings.data?.clinicName ?? "";
}

/** Contagem viva da sala de espera no item de navegação. */
function useWaitingCount(): number | undefined {
  const metrics = useQuery({
    queryKey: qk.waitingRoom.metrics,
    queryFn: waitingRoomApi.metrics,
    refetchInterval: 60_000,
  });
  return metrics.data?.waitingCount;
}

function SideNav({ onOpenCommand }: { onOpenCommand: () => void }) {
  const clinicName = useClinicName();
  const waiting = useWaitingCount();
  const { pathname } = useLocation();

  return (
    <nav
      aria-label="Navegação principal"
      className="sticky top-0 hidden h-dvh shrink-0 flex-col bg-surface-app md:flex md:w-rail lg:w-sidebar"
    >
      <div className="flex h-18 shrink-0 items-center gap-3 px-4 max-lg:justify-center lg:px-4">
        <BrandMark />
        <span className="hidden min-w-0 lg:block">
          <span className="block truncate text-card font-bold tracking-tight text-ink-primary">
            ClinicFlow
          </span>
          {clinicName ? (
            <span className="block truncate text-label text-ink-secondary">
              {clinicName}
            </span>
          ) : null}
        </span>
      </div>

      <div className="flex shrink-0 flex-col gap-2 px-3 pb-3 max-lg:items-center">
        <button
          type="button"
          onClick={onOpenCommand}
          aria-label="Buscar paciente, profissional ou ação"
          title="Buscar (Ctrl K)"
          aria-keyshortcuts={MOD_KEY === "⌘" ? "Meta+K" : "Control+K"}
          className="flex h-9 w-full items-center gap-2 rounded-control border border-border-default bg-surface-base px-3 text-left text-label text-ink-tertiary transition-colors hover:border-border-strong hover:text-ink-primary max-lg:size-11 max-lg:justify-center max-lg:px-0"
        >
          <Search className="size-4 shrink-0" aria-hidden="true" />
          <span className="flex-1 truncate max-lg:hidden">Buscar…</span>
          <Kbd className="max-lg:hidden">
            {MOD_KEY === "⌘" ? "⌘K" : "Ctrl K"}
          </Kbd>
        </button>
        <ButtonLink
          to="/consultas/nova"
          block
          aria-keyshortcuts="N"
          className="max-lg:size-11 max-lg:px-0"
          aria-label="Nova consulta"
          title="Nova consulta (N)"
        >
          <Plus aria-hidden="true" />
          <span className="max-lg:hidden">Nova consulta</span>
          <Kbd className="ml-auto border-transparent bg-ink-onaccent/15 text-ink-onaccent max-lg:hidden">
            N
          </Kbd>
        </ButtonLink>
      </div>

      <div className="flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-3 pb-3 pt-2 [scrollbar-width:thin] max-lg:px-1.5">
        <NavGroup
          label="Atendimento"
          items={NAV_ITEMS.filter((item) => item.group === "atendimento")}
          pathname={pathname}
          badges={{ "/sala-de-espera": waiting }}
        />
        <NavGroup
          label="Gestão"
          items={NAV_ITEMS.filter((item) => item.group === "gestao")}
          pathname={pathname}
        />
      </div>

      <div className="shrink-0 border-t border-border-default p-3 max-lg:flex max-lg:justify-center">
        <UserMenu placement="right-end" />
      </div>
    </nav>
  );
}

function NavGroup({
  label,
  items,
  pathname,
  badges = {},
}: {
  label: string;
  items: NavItem[];
  pathname: string;
  badges?: Record<string, number | undefined>;
}) {
  return (
    <div className="border-t border-border-default pt-3 first:border-0 first:pt-0">
      <p className="px-3 pb-2 text-micro font-medium text-ink-tertiary max-lg:sr-only">
        {label}
      </p>
      <ul className="flex flex-col gap-0.5">
        {items.map((item) => {
          const active = isNavActive(item, pathname);
          const badge = badges[item.to];
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "group relative flex items-center gap-3 rounded-control border-l-2 border-transparent px-3 py-2 transition-colors duration-150",
                  "max-lg:flex-col max-lg:gap-1 max-lg:px-1 max-lg:py-2",
                  active
                    ? "border-accent bg-accent-weak text-accent-ink"
                    : "text-ink-secondary hover:bg-surface-sunken hover:text-ink-primary",
                )}
              >
                <item.icon
                  className="size-4.5 shrink-0"
                  strokeWidth={active ? 2 : 1.75}
                  aria-hidden="true"
                />
                <span
                  className={cn(
                    "flex-1 truncate text-label max-lg:hidden",
                    active ? "font-semibold" : "font-medium",
                  )}
                >
                  {item.label}
                </span>
                <span className="max-w-full text-center text-micro leading-tight font-semibold [overflow-wrap:anywhere] lg:hidden">
                  {item.shortLabel}
                </span>
                {badge ? (
                  <span className="min-w-5 rounded-full bg-state-espera-weak px-1.5 text-center font-mono text-micro font-semibold text-state-espera max-lg:absolute max-lg:top-1 max-lg:right-2">
                    {badge}
                    <span className="sr-only"> aguardando</span>
                  </span>
                ) : null}
              </NavLink>
            </li>
          );
        })}
      </ul>
    </div>
  );
}

function UserMenu({
  placement,
  compact = false,
}: {
  placement: "right-end" | "bottom-end";
  compact?: boolean;
}) {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  return (
    <Menu
      label="Conta"
      placement={placement}
      trigger={(props) => (
        <button
          type="button"
          {...props}
          aria-label={`Conta de ${user?.name ?? "usuário"}`}
          className={cn(
            "flex items-center gap-2.5 rounded-control text-left transition-colors hover:bg-surface-sunken",
            compact
              ? "size-11 justify-center"
              : "w-full p-1.5 max-lg:size-11 max-lg:justify-center max-lg:p-0",
          )}
        >
          <Avatar name={user?.name} size={compact ? "sm" : "md"} />
          {compact ? null : (
            <>
              <span className="min-w-0 flex-1 max-lg:hidden">
                <span className="block truncate text-body font-semibold text-ink-primary">
                  {user?.name ?? "—"}
                </span>
                <span className="block truncate text-label text-ink-secondary">
                  {user?.roleLabel ?? ""}
                </span>
              </span>
              <ChevronsUpDown
                className="size-4 shrink-0 text-ink-tertiary max-lg:hidden"
                aria-hidden="true"
              />
            </>
          )}
        </button>
      )}
    >
      <MenuLabel>
        <span className="block font-semibold text-ink-primary">
          {user?.name}
        </span>
        <span className="block">
          {user?.roleLabel} · {user?.email}
        </span>
      </MenuLabel>
      <MenuSeparator />
      <ThemeMenuItems />
      <MenuSeparator />
      <MenuItem
        tone="danger"
        icon={<LogOut />}
        onSelect={() => {
          void logout().then(() => navigate("/entrar", { replace: true }));
        }}
      >
        Sair da conta
      </MenuItem>
    </Menu>
  );
}

function MobileTopBar({ onOpenCommand }: { onOpenCommand: () => void }) {
  const clinicName = useClinicName();
  return (
    <header className="sticky top-0 z-30 flex h-14 items-center gap-2.5 border-b border-border-subtle bg-surface-base/95 px-3 backdrop-blur supports-[backdrop-filter]:bg-surface-base/85 md:hidden">
      <BrandMark size="sm" />
      <span className="min-w-0 flex-1">
        <span className="block truncate text-body font-bold text-ink-primary">
          ClinicFlow
        </span>
        {clinicName ? (
          <span className="block truncate text-micro text-ink-secondary">
            {clinicName}
          </span>
        ) : null}
      </span>
      <IconButton
        label="Buscar paciente, profissional ou ação"
        onClick={onOpenCommand}
      >
        <Search aria-hidden="true" />
      </IconButton>
      <UserMenu placement="bottom-end" compact />
    </header>
  );
}

function BottomNav({
  onMore,
  pathname,
}: {
  onMore: () => void;
  pathname: string;
}) {
  const moreActive = SECONDARY_NAV.some((item) => isNavActive(item, pathname));
  const waiting = useWaitingCount();

  return (
    <nav
      aria-label="Navegação"
      className="fixed inset-x-0 bottom-0 z-30 flex border-t border-border-subtle bg-surface-base pb-[env(safe-area-inset-bottom)] md:hidden"
    >
      {PRIMARY_NAV.map((item) => {
        const active = isNavActive(item, pathname);
        const badge = item.to === "/sala-de-espera" ? waiting : undefined;
        return (
          <NavLink
            key={item.to}
            to={item.to}
            aria-current={active ? "page" : undefined}
            className={cn(
              "relative flex h-bottom-nav flex-1 flex-col items-center justify-center gap-1",
              active ? "text-accent-ink" : "text-ink-secondary",
            )}
          >
            <span
              className={cn(
                "flex h-7 w-12 items-center justify-center rounded-full transition-colors",
                active && "bg-accent-weak",
              )}
            >
              <item.icon className="size-5" aria-hidden="true" />
            </span>
            <span className="text-micro font-semibold">{item.shortLabel}</span>
            {badge ? (
              <span className="absolute top-1.5 left-[calc(50%+6px)] min-w-4.5 rounded-full bg-state-espera px-1 text-center font-mono text-micro leading-4.5 font-semibold text-surface-base">
                {badge}
                <span className="sr-only"> aguardando</span>
              </span>
            ) : null}
          </NavLink>
        );
      })}
      <button
        type="button"
        onClick={onMore}
        aria-haspopup="dialog"
        className={cn(
          "flex h-bottom-nav flex-1 flex-col items-center justify-center gap-1",
          moreActive ? "text-accent-ink" : "text-ink-secondary",
        )}
      >
        <span
          className={cn(
            "flex h-7 w-12 items-center justify-center rounded-full",
            moreActive && "bg-accent-weak",
          )}
        >
          <MenuIcon className="size-5" aria-hidden="true" />
        </span>
        <span className="text-micro font-semibold">Mais</span>
      </button>
    </nav>
  );
}

/** Os destinos que não cabem nos cinco slots da bottom nav. */
function MoreSheet({ open, onClose }: { open: boolean; onClose: () => void }) {
  const { user, logout } = useAuth();
  const { pathname } = useLocation();
  const navigate = useNavigate();

  return (
    <Overlay
      open={open}
      onClose={onClose}
      title="Mais opções"
      description={user ? `${user.name} — ${user.roleLabel}` : undefined}
      initialFocus="container"
    >
      <ul className="-mx-2 flex flex-col">
        {SECONDARY_NAV.map((item) => {
          const active = isNavActive(item, pathname);
          return (
            <li key={item.to}>
              <NavLink
                to={item.to}
                onClick={onClose}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex min-h-12 items-center gap-3 rounded-control px-3 text-body font-semibold",
                  active
                    ? "bg-accent-weak text-accent-ink"
                    : "text-ink-primary hover:bg-surface-sunken",
                )}
              >
                <item.icon
                  className="size-5 text-ink-secondary"
                  aria-hidden="true"
                />
                {item.label}
              </NavLink>
            </li>
          );
        })}
      </ul>
      <div className="mt-5 border-t border-border-subtle pt-4">
        <p className="mb-2 text-label font-semibold text-ink-secondary">Tema</p>
        <ThemeToggle />
      </div>
      <button
        type="button"
        onClick={() => {
          onClose();
          void logout().then(() => navigate("/entrar", { replace: true }));
        }}
        className="mt-4 -mx-2 flex min-h-12 w-[calc(100%+1rem)] items-center gap-3 rounded-control px-3 text-left text-body font-semibold text-danger hover:bg-danger-weak"
      >
        <LogOut className="size-5" aria-hidden="true" />
        Sair da conta
      </button>
    </Overlay>
  );
}
