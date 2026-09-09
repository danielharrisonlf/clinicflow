import { Monitor, Moon, Sun } from "lucide-react";
import { useId } from "react";
import { type ThemePreference, useTheme } from "@/lib/theme";
import { cn } from "@/lib/utils";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/**
 * Três estados, não dois. "Sistema" é o padrão porque a recepção troca de
 * turno: quem entra à noite herda a preferência do aparelho sem mexer em nada.
 *
 * Radios de verdade, não botões com `role`: o grupo já navega com as setas e é
 * anunciado como escolha única, sem nada disso precisar ser reimplementado.
 */
export function ThemeToggle({ compact = false }: { compact?: boolean }) {
  const { preference, setPreference } = useTheme();
  const name = useId();

  return (
    <fieldset
      className={cn(
        "flex gap-0.5 rounded-control bg-surface-sunken p-0.5",
        compact && "flex-col",
      )}
    >
      <legend className="sr-only">Tema</legend>
      {OPTIONS.map((option) => (
        <label
          key={option.value}
          title={option.label}
          className={cn(
            "flex h-8 flex-1 cursor-pointer items-center justify-center rounded-marker transition-colors",
            "has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-accent",
            preference === option.value
              ? "bg-surface-base text-ink-primary shadow-raised"
              : "text-ink-tertiary hover:text-ink-primary",
          )}
        >
          <input
            type="radio"
            name={name}
            value={option.value}
            checked={preference === option.value}
            onChange={() => setPreference(option.value)}
            className="sr-only"
          />
          <option.icon className="size-4" aria-hidden="true" />
          <span className="sr-only">{option.label}</span>
        </label>
      ))}
    </fieldset>
  );
}
