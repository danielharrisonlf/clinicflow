import { useQuery } from "@tanstack/react-query";
import { Search } from "lucide-react";
import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate } from "react-router";
import { Kbd } from "@/components/ui/kbd";
import { searchApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { cn } from "@/lib/utils";

interface Entry {
  id: string;
  label: string;
  hint?: string;
  group: string;
  run: () => void;
}

/** Ações fixas: existem mesmo com a busca vazia, e são o que a recepção mais faz. */
const STATIC_ACTIONS = [
  { id: "nova", label: "Nova consulta", to: "/consultas/nova", shortcut: "N" },
  {
    id: "espera",
    label: "Sala de espera",
    to: "/sala-de-espera",
    shortcut: "S",
  },
  {
    id: "paciente",
    label: "Novo paciente",
    to: "/pacientes/novo",
    shortcut: "",
  },
  {
    id: "pendencias",
    label: "Pendências e retornos",
    to: "/pendencias",
    shortcut: "",
  },
];

export function CommandPalette({
  open,
  onClose,
}: {
  open: boolean;
  onClose: () => void;
}) {
  const navigate = useNavigate();
  const [term, setTerm] = useState("");
  const [active, setActive] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLUListElement>(null);

  const trimmed = term.trim();

  const results = useQuery({
    queryKey: qk.search(trimmed),
    queryFn: ({ signal }) => searchApi.query(trimmed, signal),
    enabled: open && trimmed.length >= 2,
    staleTime: 15_000,
  });

  const entries = useMemo<Entry[]>(() => {
    const list: Entry[] = [];

    for (const patient of results.data?.patients ?? []) {
      list.push({
        id: `patient-${patient.id}`,
        label: patient.name,
        hint: patient.stateLabel ?? patient.subtitle ?? undefined,
        group: "Pacientes",
        run: () => navigate(`/pacientes/${patient.id}`),
      });
    }
    for (const professional of results.data?.professionals ?? []) {
      list.push({
        id: `professional-${professional.id}`,
        label: professional.name,
        hint: professional.specialty,
        group: "Profissionais",
        run: () => navigate(`/profissionais/${professional.id}`),
      });
    }
    for (const action of STATIC_ACTIONS) {
      if (
        trimmed &&
        !action.label.toLowerCase().includes(trimmed.toLowerCase())
      ) {
        continue;
      }
      list.push({
        id: `action-${action.id}`,
        label: action.label,
        hint: action.shortcut || undefined,
        group: "Ações",
        run: () => navigate(action.to),
      });
    }
    return list;
  }, [results.data, trimmed, navigate]);

  useEffect(() => {
    if (open) {
      setTerm("");
      setActive(0);
      // Sem autofocus em touch: o teclado cobre a tela inteira.
      if (!window.matchMedia("(pointer: coarse)").matches) {
        inputRef.current?.focus();
      }
    }
  }, [open]);

  useEffect(() => setActive(0), [trimmed]);

  if (!open) return null;

  function choose(index: number) {
    const entry = entries[index];
    if (!entry) return;
    entry.run();
    onClose();
  }

  function onKeyDown(event: React.KeyboardEvent) {
    if (event.key === "Escape") {
      event.preventDefault();
      onClose();
      return;
    }
    if (event.key === "ArrowDown") {
      event.preventDefault();
      setActive((current) => Math.min(current + 1, entries.length - 1));
      return;
    }
    if (event.key === "ArrowUp") {
      event.preventDefault();
      setActive((current) => Math.max(current - 1, 0));
      return;
    }
    if (event.key === "Enter") {
      event.preventDefault();
      choose(active);
    }
  }

  let lastGroup = "";

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-[12vh]">
      <button
        type="button"
        aria-label="Fechar busca"
        onClick={onClose}
        className="absolute inset-0 bg-ink-primary/40"
      />

      <div
        role="dialog"
        aria-modal="true"
        aria-label="Buscar paciente, profissional ou ação"
        className="relative flex w-full max-w-xl flex-col overflow-hidden rounded-modal border border-border-subtle bg-surface-base shadow-panel"
        onKeyDown={onKeyDown}
      >
        <div className="flex items-center gap-3 border-b border-border-subtle px-4">
          <Search
            className="size-4 shrink-0 text-ink-tertiary"
            aria-hidden="true"
          />
          <input
            ref={inputRef}
            value={term}
            onChange={(event) => setTerm(event.target.value)}
            placeholder="Buscar paciente, médico ou ação"
            aria-label="Termo de busca"
            autoComplete="off"
            spellCheck={false}
            // Sem anel de foco: o campo é largura cheia e o anel global colaria
            // nas bordas do diálogo, parecendo borda quebrada. Quem indica o
            // foco aqui é o próprio diálogo, que só existe enquanto está ativo.
            className="h-14 flex-1 bg-transparent text-card text-ink-primary outline-none placeholder:text-ink-tertiary focus-visible:shadow-none"
          />
          <Kbd>Esc</Kbd>
        </div>

        <ul ref={listRef} className="max-h-80 overflow-y-auto py-1">
          {entries.length === 0 ? (
            <li className="px-4 py-6 text-center text-body text-ink-secondary">
              {trimmed.length < 2
                ? "Digite ao menos duas letras do nome, CPF ou telefone."
                : results.isPending
                  ? "Buscando…"
                  : `Nada encontrado para “${trimmed}”.`}
            </li>
          ) : (
            entries.map((entry, index) => {
              const showGroup = entry.group !== lastGroup;
              lastGroup = entry.group;
              return (
                <li key={entry.id}>
                  {showGroup ? (
                    <p className="px-4 pt-3 pb-1 text-micro font-semibold text-ink-tertiary">
                      {entry.group}
                    </p>
                  ) : null}
                  <button
                    type="button"
                    onMouseEnter={() => setActive(index)}
                    onClick={() => choose(index)}
                    className={cn(
                      "flex w-full items-center justify-between gap-3 px-4 py-2.5 text-left",
                      index === active ? "bg-accent-weak" : "bg-transparent",
                    )}
                  >
                    <span className="truncate text-body font-semibold text-ink-primary">
                      {entry.label}
                    </span>
                    {entry.hint ? (
                      <span className="shrink-0 text-micro text-ink-secondary">
                        {entry.hint}
                      </span>
                    ) : null}
                  </button>
                </li>
              );
            })
          )}
        </ul>

        <div className="flex items-center gap-3 border-t border-border-subtle px-4 py-2 text-micro text-ink-tertiary">
          <span className="flex items-center gap-1">
            <Kbd>↑</Kbd>
            <Kbd>↓</Kbd> navegar
          </span>
          <span className="flex items-center gap-1">
            <Kbd>↵</Kbd> abrir
          </span>
        </div>
      </div>
    </div>
  );
}
