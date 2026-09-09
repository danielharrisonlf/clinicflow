import { type ClassValue, clsx } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

/**
 * O tailwind-merge precisa conhecer a escala do projeto.
 *
 * Sem isso ele não sabe que `text-card` é tamanho e `text-ink-onaccent` é cor:
 * joga os dois no mesmo grupo, entende como conflito e mantém só o último.
 * Na prática, todo botão primário perdia a cor do texto e caía no `color`
 * herdado do body — texto quase preto sobre o acento escuro.
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
          ],
        },
      ],
      shadow: [{ shadow: ["panel", "raised"] }],
      rounded: [{ rounded: ["marker", "control", "raised", "card", "modal"] }],
    },
  },
});

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
