import { useEffect, useState } from "react";

/**
 * Segura o valor até a digitação parar. Sem isso, cada tecla vira uma chave de
 * query nova e o cache enche de entradas que ninguém vai reusar.
 */
export function useDebounced<T>(value: T, delayMs = 300): T {
  const [debounced, setDebounced] = useState(value);

  useEffect(() => {
    const timer = window.setTimeout(() => setDebounced(value), delayMs);
    return () => window.clearTimeout(timer);
  }, [value, delayMs]);

  return debounced;
}
