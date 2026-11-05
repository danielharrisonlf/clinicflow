import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";

export type ThemePreference = "light" | "dark" | "system";

const STORAGE_KEY = "clinicflow.theme";

interface ThemeContextValue {
  preference: ThemePreference;
  /** O tema que está na tela agora, já resolvido contra o sistema. */
  resolved: "light" | "dark";
  setPreference: (next: ThemePreference) => void;
}

const ThemeContext = createContext<ThemeContextValue | null>(null);

function readStored(): ThemePreference {
  try {
    const value = localStorage.getItem(STORAGE_KEY);
    if (value === "light" || value === "dark") return value;
  } catch {
    // Aba anônima ou site com dados bloqueados: cai no padrão do sistema.
  }
  return "system";
}

function systemPrefersDark(): boolean {
  return window.matchMedia("(prefers-color-scheme: dark)").matches;
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [preference, setPreferenceState] =
    useState<ThemePreference>(readStored);
  const [systemDark, setSystemDark] = useState(systemPrefersDark);

  // Quem escolheu "sistema" acompanha a troca do SO sem recarregar a página.
  useEffect(() => {
    const query = window.matchMedia("(prefers-color-scheme: dark)");
    const onChange = (event: MediaQueryListEvent) =>
      setSystemDark(event.matches);
    query.addEventListener("change", onChange);
    return () => query.removeEventListener("change", onChange);
  }, []);

  const resolved: "light" | "dark" =
    preference === "system" ? (systemDark ? "dark" : "light") : preference;

  // O atributo sempre carrega o tema resolvido: o CSS tem um único bloco de
  // tokens escuros, e "sistema" é resolvido aqui (e no script de index.html).
  // Os tokens vivem só no CSS: nada de estilo inline no <html>.
  useEffect(() => {
    const root = document.documentElement;
    const switching = root.getAttribute("data-theme") !== resolved;
    // Troca de tema não anima: as transições de cor ficam desligadas até o
    // navegador recalcular o estilo com os tokens novos.
    if (switching) root.setAttribute("data-theme-switching", "");
    root.setAttribute("data-theme", resolved);
    const appSurface = getComputedStyle(root)
      .getPropertyValue("--color-surface-app")
      .trim();
    if (switching) {
      window.setTimeout(() => root.removeAttribute("data-theme-switching"), 0);
    }
    document
      .querySelector('meta[name="theme-color"]')
      ?.setAttribute("content", appSurface);
  }, [resolved]);

  const setPreference = useCallback((next: ThemePreference) => {
    setPreferenceState(next);
    try {
      if (next === "system") localStorage.removeItem(STORAGE_KEY);
      else localStorage.setItem(STORAGE_KEY, next);
    } catch {
      // A escolha vale para esta sessão mesmo sem poder gravar.
    }
  }, []);

  const value = useMemo<ThemeContextValue>(
    () => ({
      preference,
      resolved,
      setPreference,
    }),
    [preference, resolved, setPreference],
  );

  return (
    <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>
  );
}

export function useTheme(): ThemeContextValue {
  const context = useContext(ThemeContext);
  if (!context) throw new Error("useTheme precisa do ThemeProvider acima.");
  return context;
}
