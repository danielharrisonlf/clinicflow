import { Check, Monitor, Moon, Sun } from "lucide-react";
import { type ThemePreference, useTheme } from "@/lib/theme";
import { SegmentedControl } from "./segmented";

const OPTIONS: { value: ThemePreference; label: string; icon: typeof Sun }[] = [
  { value: "light", label: "Claro", icon: Sun },
  { value: "dark", label: "Escuro", icon: Moon },
  { value: "system", label: "Sistema", icon: Monitor },
];

/**
 * Três estados, não dois. "Sistema" é o padrão porque a recepção troca de
 * turno: quem entra à noite herda a preferência do aparelho sem mexer em nada.
 */
export function ThemeToggle() {
  const { preference, setPreference } = useTheme();
  return (
    <SegmentedControl
      label="Tema"
      value={preference}
      onChange={setPreference}
      className="w-full [&>label]:flex-1 [&>label]:justify-center"
      options={OPTIONS.map((option) => ({
        value: option.value,
        label: option.label,
        icon: <option.icon className="size-4" aria-hidden="true" />,
      }))}
    />
  );
}

/** As mesmas três escolhas como itens de menu (menu do usuário). */
export function ThemeMenuItems() {
  const { preference, setPreference } = useTheme();
  return (
    // biome-ignore lint/a11y/useSemanticElements: grupo de menuitemradio no padrão WAI-ARIA
    <div role="group" aria-label="Tema">
      {OPTIONS.map((option) => {
        const active = preference === option.value;
        return (
          <button
            key={option.value}
            type="button"
            role="menuitemradio"
            aria-checked={active}
            tabIndex={-1}
            data-keep-open=""
            onClick={() => setPreference(option.value)}
            className="flex w-full items-center gap-2.5 rounded-marker px-2.5 py-2 text-left text-label font-medium text-ink-primary outline-none transition-colors hover:bg-surface-hover focus-visible:bg-surface-hover focus-visible:ring-2 focus-visible:ring-accent-ink pointer-coarse:min-h-11"
          >
            <option.icon
              className="size-4 text-ink-secondary"
              aria-hidden="true"
            />
            <span className="flex-1">Tema {option.label.toLowerCase()}</span>
            {active ? (
              <Check className="size-4 text-accent-ink" aria-hidden="true" />
            ) : null}
          </button>
        );
      })}
    </div>
  );
}
