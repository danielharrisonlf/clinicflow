import type { Location } from "react-router";

export interface BackTarget {
  to: string;
  label: string;
}

/**
 * Nome da tela de origem pelo caminho. O link de volta diz para onde vai —
 * "Voltar" sozinho obriga a pessoa a lembrar de onde veio.
 */
const LABEL_BY_PREFIX: [RegExp, string][] = [
  [/^\/$/, "Cockpit do dia"],
  [/^\/agenda/, "Agenda"],
  [/^\/sala-de-espera/, "Sala de espera"],
  [/^\/pacientes\/[^/]+/, "Ficha do paciente"],
  [/^\/pacientes/, "Pacientes"],
  [/^\/profissionais\/[^/]+/, "Profissional"],
  [/^\/profissionais/, "Profissionais"],
  [/^\/pendencias/, "Pendências"],
  [/^\/documentos/, "Documentos"],
  [/^\/consultas\/(?!nova)[^/]+/, "Consulta anterior"],
];

const FALLBACK: BackTarget = { to: "/", label: "Cockpit do dia" };

/** Só caminho interno: `//site.com` ou `https://` no estado não vira link. */
function isInternalPath(value: unknown): value is string {
  return (
    typeof value === "string" &&
    value.startsWith("/") &&
    !value.startsWith("//")
  );
}

export function labelForPath(path: string): string {
  const pathname = path.split(/[?#]/)[0] ?? path;
  return (
    LABEL_BY_PREFIX.find(([pattern]) => pattern.test(pathname))?.[1] ?? "Voltar"
  );
}

/**
 * Para onde o "voltar" leva. Quem abre uma consulta pode passar
 * `state={{ from: "/agenda?..." }}` no link; sem isso, cai no Cockpit.
 */
export function backTargetFrom(
  location: Location,
  fallback: BackTarget = FALLBACK,
): BackTarget {
  const from = (location.state as { from?: unknown } | null)?.from;
  if (isInternalPath(from) && from !== location.pathname) {
    return { to: from, label: labelForPath(from) };
  }
  return fallback;
}

/** O caminho atual, para repassar como `state.from` ao abrir outra tela. */
export function currentPath(location: Location): string {
  return `${location.pathname}${location.search}`;
}
