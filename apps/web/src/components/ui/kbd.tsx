import { cn } from "@/lib/utils";

/** Atalho de teclado. 12px é o piso, e este é um dos poucos usos que o justifica. */
export function Kbd({
  children,
  className,
}: {
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <kbd
      className={cn(
        "inline-flex h-5 min-w-5 items-center justify-center rounded-marker",
        "border border-border-default bg-surface-sunken px-1.5",
        "font-mono text-micro font-semibold text-ink-secondary",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

/** ⌘ no Mac, Ctrl no resto. Decidido uma vez, no cliente. */
export const MOD_KEY =
  typeof navigator !== "undefined" && /Mac|iPhone|iPad/.test(navigator.platform)
    ? "⌘"
    : "Ctrl";
