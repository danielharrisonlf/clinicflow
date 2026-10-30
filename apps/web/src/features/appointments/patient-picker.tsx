import { useQuery } from "@tanstack/react-query";
import { Phone, Search, UserPlus, X } from "lucide-react";
import { useId, useRef, useState } from "react";
import { Link } from "react-router";
import { Button, IconButton } from "@/components/ui/button";
import { controlClass, FieldShell } from "@/components/ui/field";
import { Spinner } from "@/components/ui/spinner";
import { Avatar } from "@/components/ui/surface";
import { errorMessage } from "@/lib/api/client";
import { patientsApi } from "@/lib/api/endpoints";
import { qk } from "@/lib/query";
import { useDebounced } from "@/lib/use-debounced";
import { cn } from "@/lib/utils";

export interface PickedPatient {
  id: string;
  name: string;
  phone: string;
}

const MIN_CHARS = 2;

/**
 * Busca de paciente no padrão combobox da WAI-ARIA: o foco fica no campo e a
 * opção ativa é anunciada por `aria-activedescendant`. Quem atende digita com o
 * paciente na frente — setas e Enter têm que bastar, sem tirar a mão do teclado.
 */
export function PatientPicker({
  value,
  onChange,
  error,
  onPicked,
}: {
  value: PickedPatient | null;
  onChange: (patient: PickedPatient | null) => void;
  error?: string;
  /** Depois de escolher: a página leva o foco para o próximo campo. */
  onPicked?: () => void;
}) {
  const id = useId();
  const listId = `${id}-list`;
  const inputRef = useRef<HTMLInputElement>(null);
  const boxRef = useRef<HTMLDivElement>(null);
  const [term, setTerm] = useState("");
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(-1);

  const search = useDebounced(term.trim());
  const query = { search, limit: 8 };
  const enabled = search.length >= MIN_CHARS && value === null;
  const results = useQuery({
    queryKey: qk.patients.list(query),
    queryFn: () => patientsApi.list(query),
    enabled,
  });

  const typing = term.trim() !== search;
  const items = enabled && !typing ? (results.data?.data ?? []) : [];
  const showList = open && term.trim().length >= MIN_CHARS && value === null;
  const loading =
    showList && (typing || results.isFetching) && items.length === 0;

  function pick(index: number) {
    const patient = items[index];
    if (!patient) return;
    onChange({ id: patient.id, name: patient.name, phone: patient.phone });
    setTerm("");
    setOpen(false);
    setActive(-1);
    onPicked?.();
  }

  if (value) {
    return (
      <FieldShell id={id} label="Paciente" hideLabel required error={error}>
        <div className="flex min-h-14 items-center gap-3 rounded-control border border-accent bg-accent-weak px-3 py-2">
          <Avatar name={value.name} size="sm" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-body font-semibold text-ink-primary">
              {value.name}
            </p>
            <p className="flex items-center gap-1 font-mono text-label text-ink-secondary">
              <Phone className="size-3.5" aria-hidden="true" />
              {value.phone}
            </p>
          </div>
          <IconButton
            label={`Trocar paciente (${value.name})`}
            size="icon-sm"
            onClick={() => {
              onChange(null);
              // O campo de busca volta no próximo render; foca logo em seguida.
              requestAnimationFrame(() => inputRef.current?.focus());
            }}
          >
            <X aria-hidden="true" />
          </IconButton>
        </div>
      </FieldShell>
    );
  }

  const activeId =
    showList && active >= 0 && items[active]
      ? `${id}-opt-${active}`
      : undefined;
  const hint =
    term.trim().length < MIN_CHARS
      ? "Digite ao menos duas letras do nome, ou o CPF ou telefone."
      : undefined;

  return (
    <FieldShell
      id={id}
      label="Paciente"
      hideLabel
      required
      error={error}
      hint={hint}
    >
      {/* biome-ignore lint/a11y/noStaticElementInteractions: focusout do conjunto, não é interação — Tab até "Cadastrar paciente" não pode fechar a lista no caminho */}
      <div
        ref={boxRef}
        className="relative"
        onBlur={(event) => {
          if (!boxRef.current?.contains(event.relatedTarget as Node | null)) {
            setOpen(false);
          }
        }}
      >
        <Search
          className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-ink-tertiary"
          aria-hidden="true"
        />
        <input
          ref={inputRef}
          id={id}
          type="text"
          role="combobox"
          autoComplete="off"
          spellCheck={false}
          placeholder="Nome, CPF ou telefone"
          aria-autocomplete="list"
          aria-expanded={showList}
          aria-controls={listId}
          aria-activedescendant={activeId}
          aria-invalid={error ? true : undefined}
          aria-describedby={
            error ? `${id}-error` : hint ? `${id}-hint` : undefined
          }
          value={term}
          onChange={(event) => {
            setTerm(event.target.value);
            setOpen(true);
            setActive(-1);
          }}
          onFocus={() => setOpen(true)}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") {
              event.preventDefault();
              setOpen(true);
              if (items.length)
                setActive((current) => (current + 1) % items.length);
            } else if (event.key === "ArrowUp") {
              event.preventDefault();
              setOpen(true);
              if (items.length)
                setActive((current) =>
                  current <= 0 ? items.length - 1 : current - 1,
                );
            } else if (event.key === "Enter") {
              // Enter aqui escolhe paciente; nunca envia o formulário pela metade.
              event.preventDefault();
              if (showList && items.length) pick(active >= 0 ? active : 0);
            } else if (event.key === "Escape") {
              if (showList) {
                event.preventDefault();
                setOpen(false);
              } else if (term) {
                event.preventDefault();
                setTerm("");
              }
            }
          }}
          className={cn(
            controlClass,
            error
              ? "border-danger hover:border-danger focus-visible:border-danger"
              : "border-border-strong",
            "h-10 pr-3 pl-9",
          )}
        />
        {showList ? (
          <div className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-raised border border-border-default bg-surface-raised shadow-overlay">
            <ul
              id={listId}
              // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: listbox do padrão combobox WAI-ARIA; o foco fica no campo
              role="listbox"
              aria-label="Pacientes encontrados"
              className="max-h-72 overflow-y-auto py-1"
            >
              {items.map((patient, index) => (
                // biome-ignore lint/a11y/useKeyWithClickEvents: teclado é tratado no campo (aria-activedescendant)
                <li
                  key={patient.id}
                  id={`${id}-opt-${index}`}
                  // biome-ignore lint/a11y/noNoninteractiveElementToInteractiveRole: opção do listbox; o foco real fica no campo
                  role="option"
                  tabIndex={-1}
                  aria-selected={index === active}
                  // mousedown antes do blur: o clique não fecha a lista antes de escolher.
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => pick(index)}
                  onMouseEnter={() => setActive(index)}
                  className={cn(
                    "flex min-h-11 cursor-pointer items-center gap-3 px-3 py-2",
                    index === active
                      ? "bg-accent-weak"
                      : "hover:bg-surface-app",
                  )}
                >
                  <Avatar name={patient.name} size="sm" />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-body font-semibold text-ink-primary">
                      {patient.name}
                    </span>
                    <span className="block truncate text-label text-ink-secondary">
                      <span className="font-mono">{patient.phone}</span>
                      {patient.age !== null ? `, ${patient.age} anos` : ""}
                    </span>
                  </span>
                </li>
              ))}
            </ul>
            <PickerStatus
              loading={loading}
              error={results.isError && !typing ? results.error : null}
              empty={
                !loading && !typing && results.isSuccess && items.length === 0
              }
              term={term.trim()}
              onRetry={() => void results.refetch()}
            />
          </div>
        ) : null}
      </div>
    </FieldShell>
  );
}

/** Rodapé da lista: buscando, falhou ou vazio — e o próximo passo em cada caso. */
function PickerStatus({
  loading,
  error,
  empty,
  term,
  onRetry,
}: {
  loading: boolean;
  error: unknown;
  empty: boolean;
  term: string;
  onRetry: () => void;
}) {
  if (loading) {
    return (
      <p
        role="status"
        className="flex items-center gap-2 px-3 py-3 text-body text-ink-secondary"
      >
        <Spinner className="size-4" />
        Buscando pacientes…
      </p>
    );
  }
  if (error) {
    return (
      <div
        role="alert"
        className="flex flex-wrap items-center justify-between gap-2 px-3 py-3 text-body text-danger"
      >
        <span>{errorMessage(error, "A busca falhou. Verifique a rede.")}</span>
        <Button
          size="sm"
          variant="secondary"
          onMouseDown={(event) => event.preventDefault()}
          onClick={onRetry}
        >
          Tentar de novo
        </Button>
      </div>
    );
  }
  if (empty) {
    return (
      <div
        role="status"
        className="flex flex-wrap items-center justify-between gap-2 px-3 py-3"
      >
        <span className="text-body text-ink-secondary">
          Nenhum paciente com “{term}”.
        </span>
        <Link
          to="/pacientes/novo"
          onMouseDown={(event) => event.preventDefault()}
          className="inline-flex items-center gap-1.5 rounded-marker text-label font-semibold text-accent-ink hover:underline pointer-coarse:min-h-11"
        >
          <UserPlus className="size-4" aria-hidden="true" />
          Cadastrar paciente
        </Link>
      </div>
    );
  }
  return null;
}
