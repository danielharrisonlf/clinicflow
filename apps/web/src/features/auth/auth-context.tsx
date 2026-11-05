import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { ApiError, SESSION_EXPIRED_EVENT, tokenStore } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { SessionUser } from "@/lib/api/types";

interface AuthContextValue {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
  /** A restauração falhou por rede/servidor (não por credencial). */
  restoreError: boolean;
  retryRestore: () => void;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  // Restaura a sessão a partir do token guardado. Sem isso, um F5 no meio do
  // turno joga a recepcionista de volta para o login.
  //
  // Só um "não" do servidor (401/403/404) encerra a sessão. Rede caída ou 5xx
  // no F5 não pode deslogar quem está no meio do turno: tenta de novo.
  // Sem access mas com refresh, o `request` renova sozinho no primeiro 401.
  const [restoreError, setRestoreError] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    let active = true;
    if (!tokenStore.access && !tokenStore.refresh) {
      setStatus("anonymous");
      return;
    }
    setRestoreError(false);
    authApi
      .me()
      .then((session) => {
        if (!active) return;
        setUser(session);
        setStatus("authenticated");
      })
      .catch((error: unknown) => {
        if (!active) return;
        // 429 (limite por IP) também é 4xx, mas não é recusa da sessão.
        const rejected =
          error instanceof ApiError &&
          [401, 403, 404].includes(error.statusCode);
        if (rejected) {
          tokenStore.clear();
          setStatus("anonymous");
        } else {
          setRestoreError(true);
        }
      });
    return () => {
      active = false;
    };
  }, [attempt]);

  const retryRestore = useCallback(() => setAttempt((n) => n + 1), []);

  // O client dispara este evento quando o refresh também falha.
  useEffect(() => {
    function onExpired() {
      setUser(null);
      setStatus("anonymous");
      queryClient.clear();
    }
    window.addEventListener(SESSION_EXPIRED_EVENT, onExpired);
    return () => window.removeEventListener(SESSION_EXPIRED_EVENT, onExpired);
  }, [queryClient]);

  const login = useCallback(
    async (email: string, password: string) => {
      const auth = await authApi.login(email, password);
      // Cache de outra pessoa no mesmo balcão não pode vazar para a nova sessão.
      queryClient.clear();
      tokenStore.save(auth);
      setUser(auth.user);
      setStatus("authenticated");
    },
    [queryClient],
  );

  const logout = useCallback(async () => {
    const refreshToken = tokenStore.refresh;
    // A sessão local cai mesmo se a revogação no servidor falhar: deixar a
    // pessoa presa numa tela logada por causa de rede é pior que um token órfão.
    if (refreshToken) await authApi.logout(refreshToken).catch(() => undefined);
    tokenStore.clear();
    setUser(null);
    setStatus("anonymous");
    queryClient.clear();
  }, [queryClient]);

  const value = useMemo(
    () => ({ user, status, login, logout, restoreError, retryRestore }),
    [user, status, login, logout, restoreError, retryRestore],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa do AuthProvider acima.");
  return context;
}
