import { keepPreviousData, useQuery } from "@tanstack/react-query";
import type { LucideIcon } from "lucide-react";
import {
  Armchair,
  CalendarDays,
  CalendarPlus,
  ClipboardList,
  FileText,
  Search,
  Settings,
  Stethoscope,
  UserPlus,
  UserRound,
  X,
} from "lucide-react";
import { useEffect, useId, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { useLocation, useNavigate } from "react-router";
import { Button, IconButton } from "@/components/ui/button";
import { Kbd } from "@/components/ui/kbd";
import { useOverlay } from "@/components/ui/overlay";
import { Spinner } from "@/components/ui/spinner";
import { errorMessage } from "@/lib/api/client";
import { searchApi } from "@/lib/api/endpoints";
import type { SearchResult } from "@/lib/api/types";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";

/** Atalhos que a casca de fato implementa. Dica de tecla que não funciona é mentira. */
const LIVE_SHORTCUTS = new Set(["N", "S"]);

/** Ações do backend → destino. Id desconhecido não vira item: não há para onde ir. */
const BACKEND_ACTION: Record<string, { to: string; icon: LucideIcon }> = {
  "new-appointment": { to: "/consultas/nova", icon: CalendarPlus },
  "open-waiting-room": { to: "/sala-de-espera", icon: Armchair },
  "new-patient": { to: "/pacientes/novo", icon: UserPlus },
};

/** Navegação que o backend não conhece, filtrada aqui mesmo. */
const LOCAL_ACTIONS: {
  id: string;
  title: string;
  keywords: string;
  to: string;
  icon: LucideIcon;
}[] = [
  {
    id: "agenda",
    title: "Abrir Agenda",
    keywords: "agenda semana calendario dia",
    to: "/agenda",
    icon: CalendarDays,
  },
  {
    id: "pendencias",
    title: "Abrir Pendências e retornos",
    keywords: "pendencias retornos tarefas funil",
    to: "/pendencias",
    icon: ClipboardList,
  },
  {
    id: "documentos",
    title: "Abrir Documentos",
    keywords: "documentos exames arquivos",
    to: "/documentos",
    icon: FileText,
  },
  {
    id: "configuracoes",
    title: "Abrir Configurações",
    keywords: "configuracoes ajustes whatsapp tema",
    to: "/configuracoes",
    icon: Settings,
  },
];

interface Entry {
  id: string;
  group: string;
  title: string;
  /** Telefone, em mono, ao lado do nome. */
  mono?: string;
  detail?: string;
  shortcut?: string;
  icon: LucideIcon;
  to: string;
}

interface Group {
  label: string;
  entries: Entry[];
}

/** Minúsculas e sem acento: "pendencias" encontra "Pendências". */
function normalize(text: string): string {
  return text
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "")
    .toLowerCase();
}

function buildGroups(data: SearchResult | undefined, term: string): Group[] {
  const short = term.length < 2;
  const needle = normalize(term);

  const patients: Entry[] = (data?.patients ?? []).map((patient) => ({
    id: `patient-${patient.id}`,
    group: short ? "Na clínica hoje" : "Pacientes",
    title: patient.name,
    mono: patient.phone,
    detail: patient.stateLabel ?? patient.subtitle ?? undefined,
    icon: UserRound,
    to: `/pacientes/${patient.id}`,
  }));

  const professionals: Entry[] = (data?.professionals ?? []).map(
    (professional) => ({
      id: `professional-${professional.id}`,
      group: "Profissionais",
      title: professional.name,
      detail: professional.subtitle,
      icon: Stethoscope,
      to: `/profissionais/${professional.id}`,
    }),
  );

  const actions: Entry[] = [];
  const seen = new Set<string>();
  for (const action of data?.actions ?? []) {
    const known = BACKEND_ACTION[action.id];
    if (!known || seen.has(known.to)) continue;
    seen.add(known.to);
    const shortcut = action.shortcut?.toUpperCase();
    actions.push({
      id: `action-${action.id}`,
      group: "Ações",
      title: action.title,
      detail: action.subtitle ?? undefined,
      shortcut: shortcut && LIVE_SHORTCUTS.has(shortcut) ? shortcut : undefined,
      icon: known.icon,
      to: known.to,
    });
  }
  for (const action of LOCAL_ACTIONS) {
    if (seen.has(action.to)) continue;
    if (
      !short &&
      !normalize(`${action.title} ${action.keywords}`).includes(needle)
    )
      continue;
    actions.push({
      id: `nav-${action.id}`,
      group: "Ações",
      title: action.title,
      icon: action.icon,
      to: action.to,
    });
  }

  // Sem termo, o que mais se faz vem primeiro; com termo, quem a pessoa procurou.
  const ordered = short
    ? [actions, patients]
    : [patients, professionals, actions];
  return ordered
    .filter((entries) => entries.length > 0)
    .map((entries) => ({ label: entries[0]?.group ?? "", entries }));
}

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  // Montar só aberto: termo, seleção e foco recomeçam a cada abertura.
  if (!open) return null;
  return <Palette onClose={onClose} />;
}

function Palette({ onClose }: { onClose: () => void }) {
  const navigate = useNavigate();
  const location = useLocation();
  const panelRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const listboxId = useId();
  const optionPrefix = useId();
  const titleId = useId();

  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);

  useOverlay(true, onClose, panelRef);

  // A paleta é uma busca: abrir é para digitar, inclusive no celular.
  useEffect(() => {
    inputRef.current?.focus({ preventScroll: true });
  }, []);

  // Navegou por outro caminho (voltar do navegador, atalho): a paleta sai junto.
  const firstPath = useRef(location.pathname);
  useEffect(() => {
    if (location.pathname !== firstPath.current) onClose();
  }, [location.pathname, onClose]);

  const trimmed = term.trim();
  const debounced = useDebounced(trimmed, 150);
  // Abaixo de duas letras o backend devolve o padrão: ações e quem está na clínica hoje.
  const q = debounced.length >= 2 ? debounced : "";

  const results = useQuery({
    queryKey: qk.search(q),
    queryFn: ({ signal }) => searchApi.query(q, signal),
    staleTime: 15_000,
    placeholderData: keepPreviousData,
  });

  const groups = buildGroups(results.data, q);
  const entries = groups.flatMap((group) => group.entries);
  const activeIndex =
    entries.length === 0 ? -1 : Math.min(active, entries.length - 1);
  const activeEntry = activeIndex >= 0 ? entries[activeIndex] : undefined;
  const optionId = (entry: Entry) => `${optionPrefix}-${entry.id}`;
  const settling =
    trimmed !== debounced || (results.isFetching && results.isPlaceholderData);

  useEffect(() => setActive(0), [q]);

  // Enter antes de a busca do termo atual chegar abriria o resultado do termo
  // anterior. Fica guardado e roda quando o resultado certo assentar.
  const [pendingEnter, setPendingEnter] = useState(false);

  useEffect(() => {
    if (!activeEntry) return;
    document
      .getElementById(`${optionPrefix}-${activeEntry.id}`)
      ?.scrollIntoView({ block: "nearest" });
  }, [activeEntry, optionPrefix]);

  function run(entry: Entry | undefined) {
    if (!entry || settling) return;
    onClose();
    navigate(entry.to);
  }

  function onKeyDown(event: React.KeyboardEvent<HTMLInputElement>) {
    if (event.key === "ArrowDown" || event.key === "ArrowUp") {
      event.preventDefault();
      if (entries.length === 0) return;
      const step = event.key === "ArrowDown" ? 1 : -1;
      setActive((activeIndex + step + entries.length) % entries.length);
    } else if (event.key === "Home" && event.ctrlKey) {
      event.preventDefault();
      setActive(0);
    } else if (event.key === "End" && event.ctrlKey) {
      event.preventDefault();
      setActive(entries.length - 1);
    } else if (event.key === "Enter") {
      event.preventDefault();
      if (settling) setPendingEnter(true);
      else run(activeEntry);
    }
  }

  useEffect(() => {
    if (!pendingEnter || settling) return;
    setPendingEnter(false);
    run(entries[0]);
  });

  const failed = results.isError && !settling;
  const nothing =
    entries.length === 0 &&
    q.length >= 2 &&
    !settling &&
    !results.isError &&
    !results.isPending;

  return createPortal(
    <div className="fixed inset-0 z-50 flex items-start justify-center sm:px-4 sm:pt-20">
      <button
        type="button"
        tabIndex={-1}
        aria-label="Fechar busca"
        onClick={onClose}
        className="absolute inset-0 cursor-default bg-scrim animate-fade"
      />
      <div
        ref={panelRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby={titleId}
        tabIndex={-1}
        // A vitrine do vidro: camada sobreposta, surface-glass + blur.
        className={cn(
          "relative flex h-dvh w-full flex-col overflow-hidden bg-surface-glass shadow-overlay outline-none backdrop-blur-md animate-sheet-up",
          "sm:h-auto sm:max-h-[min(36rem,80dvh)] sm:max-w-xl sm:rounded-modal sm:border sm:border-border-subtle sm:animate-pop",
        )}
      >
        <h2 id={titleId} className="sr-only">
          Buscar paciente, profissional ou ação
        </h2>
        <div className="flex shrink-0 items-center gap-3 border-b border-border-subtle pr-2 pl-4 pt-[env(safe-area-inset-top)]">
          {settling || results.isPending ? (
            <Spinner className="size-4 shrink-0 text-accent" />
          ) : (
            <Search
              className="size-4 shrink-0 text-ink-tertiary"
              aria-hidden="true"
            />
          )}
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            onKeyDown={onKeyDown}
            role="combobox"
            aria-expanded={entries.length > 0}
            aria-controls={listboxId}
            aria-autocomplete="list"
            aria-activedescendant={
              activeEntry ? optionId(activeEntry) : undefined
            }
            aria-label="Termo de busca"
            placeholder="Paciente, profissional ou ação"
            autoComplete="off"
            autoCorrect="off"
            spellCheck={false}
            enterKeyHint="go"
            // Sem anel: o campo ocupa a largura do diálogo e o anel colaria nas
            // bordas. O foco aqui é óbvio — a paleta só existe enquanto ativa.
            className="h-14 min-w-0 flex-1 bg-transparent text-card text-ink-primary outline-none placeholder:text-ink-tertiary focus-visible:shadow-none pointer-coarse:text-input-touch"
          />
          <Kbd>Esc</Kbd>
          <IconButton
            label="Fechar busca"
            size="icon-sm"
            onClick={onClose}
            className="sm:hidden"
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
          {failed ? (
            <div
              role="alert"
              className="flex flex-col items-center gap-2 px-6 py-8 text-center"
            >
              <p className="text-card font-semibold text-ink-primary">
                A busca falhou
              </p>
              <p className="max-w-sm text-body text-ink-secondary">
                {errorMessage(results.error)}
              </p>
              <Button
                variant="secondary"
                size="sm"
                onClick={() => void results.refetch()}
              >
                Tentar de novo
              </Button>
            </div>
          ) : null}

          {nothing ? (
            <div className="px-6 py-8 text-center" aria-live="polite">
              <p className="text-card font-semibold text-ink-primary">
                Nada encontrado para “{q}”
              </p>
              <p className="mt-1 text-body text-ink-secondary">
                Busque pelo nome, CPF ou telefone do paciente, ou pelo nome do
                profissional.
              </p>
            </div>
          ) : null}

          {results.isPending && !failed ? (
            <p className="px-6 py-8 text-center text-body text-ink-secondary">
              Buscando…
            </p>
          ) : null}

          <div
            id={listboxId}
            role="listbox"
            aria-label="Resultados da busca"
            aria-busy={settling || results.isPending}
            className={cn("py-1", entries.length === 0 && "hidden")}
          >
            {groups.map((group, groupIndex) => {
              const groupId = `${listboxId}-g${groupIndex}`;
              return (
                // biome-ignore lint/a11y/useSemanticElements: grupo de opções dentro de listbox; fieldset não é filho válido de listbox
                <div key={group.label} role="group" aria-labelledby={groupId}>
                  <div
                    id={groupId}
                    role="presentation"
                    className="px-4 pt-3 pb-1 text-label font-semibold text-ink-secondary"
                  >
                    {group.label}
                  </div>
                  {group.entries.map((entry) => {
                    const selected = entry === activeEntry;
                    const Icon = entry.icon;
                    return (
                      // biome-ignore lint/a11y/useKeyWithClickEvents: o teclado mora no combobox (aria-activedescendant); a opção nunca recebe foco
                      <div
                        key={entry.id}
                        id={optionId(entry)}
                        role="option"
                        tabIndex={-1}
                        aria-selected={selected}
                        onMouseMove={() => {
                          if (!selected) setActive(entries.indexOf(entry));
                        }}
                        onMouseDown={(event) => event.preventDefault()}
                        onClick={() => run(entry)}
                        className={cn(
                          "mx-1.5 flex cursor-pointer items-center gap-3 rounded-control px-2.5 py-2 pointer-coarse:min-h-12",
                          selected
                            ? "bg-accent-weak"
                            : "bg-transparent hover:bg-surface-hover",
                        )}
                      >
                        <Icon
                          className={cn(
                            "size-4 shrink-0",
                            selected ? "text-accent-ink" : "text-ink-tertiary",
                          )}
                          aria-hidden="true"
                        />
                        <span className="min-w-0 flex-1">
                          <span className="flex min-w-0 flex-wrap items-baseline gap-x-2 gap-y-0.5">
                            <span className="truncate text-body font-semibold text-ink-primary">
                              {entry.title}
                            </span>
                            {entry.mono ? (
                              <span className="font-mono text-label whitespace-nowrap text-ink-secondary">
                                {entry.mono}
                              </span>
                            ) : null}
                          </span>
                          {entry.detail ? (
                            <span className="block truncate text-label text-ink-secondary">
                              {entry.detail}
                            </span>
                          ) : null}
                        </span>
                        {entry.shortcut ? <Kbd>{entry.shortcut}</Kbd> : null}
                      </div>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>

        <div className="flex shrink-0 items-center gap-4 border-t border-border-subtle px-4 py-2 text-label text-ink-secondary pointer-coarse:hidden">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> abrir
          </span>
          <span className="flex items-center gap-1">
            <Kbd>Esc</Kbd> fechar
          </span>
        </div>
      </div>
    </div>,
    document.body,
  );
}
