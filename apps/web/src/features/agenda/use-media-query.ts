import { useSyncExternalStore } from "react";

/**
 * Acompanha uma media query. Reativo de propósito: a recepção redimensiona a
 * janela para dividir a tela com o sistema do convênio, e a grade tem que
 * acompanhar sem recarregar.
 */
export function useMediaQuery(query: string): boolean {
  return useSyncExternalStore(
    (onChange) => {
      const list = window.matchMedia(query);
      list.addEventListener("change", onChange);
      return () => list.removeEventListener("change", onChange);
    },
    () => window.matchMedia(query).matches,
    () => false,
  );
}
