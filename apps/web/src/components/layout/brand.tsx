import { cn } from "@/lib/utils";

/**
 * Marca: cruz clínica recortada num quadrado de cantos suaves. Desenhada aqui
 * (traço do sistema, cor do acento) em vez de iniciais "CF" num quadrado.
 */
export function BrandMark({
  size = "md",
  className,
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
}) {
  return (
    <span
      aria-hidden="true"
      className={cn(
        "flex shrink-0 items-center justify-center rounded-control bg-accent text-ink-onaccent",
        size === "sm" && "size-8",
        size === "md" && "size-9",
        size === "lg" && "size-11",
        className,
      )}
    >
      <svg
        viewBox="0 0 24 24"
        className={size === "lg" ? "size-6" : "size-5"}
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M9.5 4.5h5v5h5v5h-5v5h-5v-5h-5v-5h5z"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinejoin="round"
        />
        <path
          d="M12 9.5v5M9.5 12h5"
          stroke="currentColor"
          strokeWidth="1.8"
          strokeLinecap="round"
          opacity="0.55"
        />
      </svg>
    </span>
  );
}
