import { cn } from "@/lib/utils";

/** Atalho de teclado. Some em ponteiro grosso: quem toca não tem tecla. */
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
        "border border-border-subtle bg-surface-sunken px-1.5",
        "font-mono text-micro font-medium text-ink-secondary",
        "pointer-coarse:hidden",
        className,
      )}
    >
      {children}
    </kbd>
  );
}

function isApple(): boolean {
  if (typeof navigator === "undefined") return false;
  const data = (
    navigator as Navigator & { userAgentData?: { platform?: string } }
  ).userAgentData;
  return /mac|iphone|ipad/i.test(data?.platform ?? navigator.userAgent);
}

/** ⌘ no Mac, Ctrl no resto. Decidido uma vez, no cliente. */
export const MOD_KEY = isApple() ? "⌘" : "Ctrl";

/** O alvo do evento é um campo de digitação? Atalhos de uma letra param aí. */
export function isTypingTarget(target: EventTarget | null): boolean {
  const element = target as HTMLElement | null;
  return Boolean(
    element?.closest?.("input, textarea, select, [contenteditable='true']"),
  );
}
