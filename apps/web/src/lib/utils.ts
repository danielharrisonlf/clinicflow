import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * O tailwind-merge precisa conhecer a escala do projeto.
 *
 * Sem isso ele não sabe que `text-card` é tamanho e `text-ink-onaccent` é cor:
 * joga os dois no mesmo grupo, entende como conflito e mantém só o último.
 * Na prática, todo botão primário perdia a cor do texto e caía no `color`
 * herdado do body — texto quase preto sobre o acento escuro.
 *
 * Todo token novo de `font-size`, `shadow` ou `rounded` entra aqui.
 */
const twMerge = extendTailwindMerge({
  extend: {
    classGroups: {
      "font-size": [
        {
          text: [
            "hero",
            "title",
            "title-sm",
            "metric",
            "metric-sm",
            "entity",
            "section",
            "card",
            "body",
            "label",
            "micro",
            "input-touch",
          ],
        },
      ],
      shadow: [{ shadow: ["panel", "raised", "overlay"] }],
      rounded: [{ rounded: ["marker", "control", "raised", "card", "modal"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** Iniciais para avatar: primeiro e último nome. */
export function initials(name?: string | null): string {
  if (!name) return "—";
  const parts = name
    .replace(/^(Dra?\.)\s+/i, "")
    .trim()
    .split(/\s+/);
  return ((parts[0]?.[0] ?? "") + (parts.at(-1)?.[0] ?? "")).toUpperCase();
}

/** Plural simples em pt-BR: `plural(3, "paciente")` → "3 pacientes". */
export function plural(
  count: number,
  singular: string,
  pluralForm = `${singular}s`,
): string {
  return `${count.toLocaleString("pt-BR")} ${count === 1 ? singular : pluralForm}`;
}

/** Só dígitos do telefone, para `tel:` e `wa.me`. */
export function phoneDigits(phone: string): string {
  return phone.replace(/\D/g, "");
}

/** Link do WhatsApp. Número sem DDI recebe o 55 do Brasil. */
export function whatsappUrl(phone: string): string {
  const digits = phoneDigits(phone);
  return `https://wa.me/${digits.length <= 11 ? `55${digits}` : digits}`;
}
