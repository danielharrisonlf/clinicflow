import { useQueryClient } from "@tanstack/react-query";
import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
} from "react";
import { SESSION_EXPIRED_EVENT, tokenStore } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { SessionUser } from "@/lib/api/types";

interface AuthContextValue {
  user: SessionUser | null;
  status: "loading" | "authenticated" | "anonymous";
  login: (email: string, password: string) => Promise<void>;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const queryClient = useQueryClient();
  const [user, setUser] = useState<SessionUser | null>(null);
  const [status, setStatus] = useState<AuthContextValue["status"]>("loading");

  // Restaura a sessão a partir do token guardado. Sem isso, um F5 no meio do
  // turno joga a recepcionista de volta para o login.
  useEffect(() => {
    let active = true;
    if (!tokenStore.access) {
      setStatus("anonymous");
      return;
    }
    authApi
      .me()
      .then((session) => {
        if (!active) return;
        setUser(session);
        setStatus("authenticated");
      })
      .catch(() => {
        if (!active) return;
        tokenStore.clear();
        setStatus("anonymous");
      });
    return () => {
      active = false;
    };
  }, []);

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

  const login = useCallback(async (email: string, password: string) => {
    const auth = await authApi.login(email, password);
    tokenStore.save(auth);
    setUser(auth.user);
    setStatus("authenticated");
  }, []);

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
    () => ({ user, status, login, logout }),
    [user, status, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth(): AuthContextValue {
  const context = useContext(AuthContext);
  if (!context) throw new Error("useAuth precisa do AuthProvider acima.");
  return context;
}
