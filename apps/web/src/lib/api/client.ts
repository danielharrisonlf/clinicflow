import type { AuthResponse, ErrorEnvelope } from "./types";

const BASE_URL = `${import.meta.env.VITE_API_URL ?? "http://localhost:3000"}/api/v1`;

const ACCESS_KEY = "clinicflow.access";
const REFRESH_KEY = "clinicflow.refresh";

/**
 * Erro tipado da API. Carrega o envelope inteiro do `AllExceptionsFilter` para
 * que a tela possa reagir ao `code` — e não fazer parsing de string de mensagem.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: string[];

  constructor(envelope: ErrorEnvelope) {
    super(envelope.message);
    this.name = "ApiError";
    this.statusCode = envelope.statusCode;
    this.code = envelope.code;
    this.details = envelope.details;
  }

  /** Conflito de horário na criação/reagendamento — a tela oferece encaixe. */
  get isOverbooking(): boolean {
    return this.code === "APPOINTMENT_OVERLAP";
  }

  get isValidation(): boolean {
    return this.code === "VALIDATION_FAILED";
  }
}

export const tokenStore = {
  get access(): string | null {
    return localStorage.getItem(ACCESS_KEY);
  },
  get refresh(): string | null {
    return localStorage.getItem(REFRESH_KEY);
  },
  save(auth: Pick<AuthResponse, "accessToken" | "refreshToken">): void {
    localStorage.setItem(ACCESS_KEY, auth.accessToken);
    localStorage.setItem(REFRESH_KEY, auth.refreshToken);
  },
  clear(): void {
    localStorage.removeItem(ACCESS_KEY);
    localStorage.removeItem(REFRESH_KEY);
  },
};

/** Sessão expirada de vez: quem escuta é o AuthProvider, que manda pro login. */
export const SESSION_EXPIRED_EVENT = "clinicflow:session-expired";

type QueryValue = string | number | boolean | undefined | null | string[];

/**
 * O backend aceita array como parâmetro repetido (`status=A&status=B`), que é
 * o que o `@Transform` dos DTOs espera. `URLSearchParams` com array viraria
 * "A,B" e reprovaria no `@IsEnum({ each: true })`.
 */
export function buildQuery(params?: Record<string, QueryValue>): string {
  if (!params) return "";
  const search = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined || value === null || value === "") continue;
    if (Array.isArray(value)) {
      for (const item of value) search.append(key, item);
    } else {
      search.append(key, String(value));
    }
  }
  const qs = search.toString();
  return qs ? `?${qs}` : "";
}

/**
 * Um refresh por vez. Sem isso, cinco queries paralelas recebendo 401 disparam
 * cinco rotações — e como o backend invalida o refresh usado, quatro delas
 * derrubariam a sessão de um usuário que ainda estava logado.
 */
let refreshInFlight: Promise<string | null> | null = null;

async function refreshAccessToken(): Promise<string | null> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return null;

  refreshInFlight = (async () => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) return null;
      const auth = (await response.json()) as AuthResponse;
      tokenStore.save(auth);
      return auth.accessToken;
    } catch {
      return null;
    } finally {
      refreshInFlight = null;
    }
  })();

  return refreshInFlight;
}

interface RequestOptions {
  method?: "GET" | "POST" | "PATCH" | "PUT" | "DELETE";
  body?: unknown;
  query?: Record<string, QueryValue>;
  signal?: AbortSignal;
  /** Rotas públicas (login, refresh) não anexam nem renovam token. */
  anonymous?: boolean;
}

async function send(
  path: string,
  options: RequestOptions,
  accessToken: string | null,
): Promise<Response> {
  const headers: Record<string, string> = {};
  if (options.body !== undefined) headers["Content-Type"] = "application/json";
  if (accessToken) headers.Authorization = `Bearer ${accessToken}`;

  return fetch(`${BASE_URL}${path}${buildQuery(options.query)}`, {
    method: options.method ?? "GET",
    headers,
    body: options.body !== undefined ? JSON.stringify(options.body) : undefined,
    signal: options.signal,
  });
}

export async function request<T>(
  path: string,
  options: RequestOptions = {},
): Promise<T> {
  let response = await send(
    path,
    options,
    options.anonymous ? null : tokenStore.access,
  );

  if (response.status === 401 && !options.anonymous) {
    const renewed = await refreshAccessToken();
    if (renewed) {
      response = await send(path, options, renewed);
    } else {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    }
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  const payload: unknown = raw ? JSON.parse(raw) : null;

  if (!response.ok) {
    throw new ApiError(
      (payload as ErrorEnvelope | null) ?? {
        statusCode: response.status,
        code: "UNKNOWN",
        message: "Não foi possível concluir. Tente novamente.",
        path,
        timestamp: new Date().toISOString(),
      },
    );
  }

  return payload as T;
}

/**
 * Stream de eventos do servidor (painel do dia e sala de espera).
 *
 * Não usa `EventSource` de propósito: ele não manda header, e o `JwtAuthGuard`
 * só aceita `Authorization: Bearer`. A alternativa seria passar o token na
 * query — que vaza para log de acesso e proxy. SSE sobre `fetch` resolve os
 * dois: header de verdade e streaming de verdade.
 *
 * Devolve a função de encerramento.
 */
export function subscribe<T>(
  path: string,
  onMessage: (data: T) => void,
  query?: Record<string, QueryValue>,
): () => void {
  const controller = new AbortController();
  let stopped = false;
  let backoffMs = 1000;

  async function connect(): Promise<void> {
    while (!stopped) {
      try {
        const response = await fetch(`${BASE_URL}${path}${buildQuery(query)}`, {
          headers: {
            Accept: "text/event-stream",
            ...(tokenStore.access
              ? { Authorization: `Bearer ${tokenStore.access}` }
              : {}),
          },
          signal: controller.signal,
        });

        if (response.status === 401) {
          const renewed = await refreshAccessToken();
          if (!renewed) {
            tokenStore.clear();
            window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
            return;
          }
          continue;
        }
        if (!response.ok || !response.body)
          throw new Error("stream indisponível");

        backoffMs = 1000;
        const reader = response.body.getReader();
        const decoder = new TextDecoder();
        let buffer = "";

        while (!stopped) {
          const { done, value } = await reader.read();
          if (done) break;
          buffer += decoder.decode(value, { stream: true });

          // Frames SSE são separados por linha em branco.
          let split = buffer.indexOf("\n\n");
          while (split !== -1) {
            const frame = buffer.slice(0, split);
            buffer = buffer.slice(split + 2);
            const data = frame
              .split("\n")
              .filter((line) => line.startsWith("data:"))
              .map((line) => line.slice(5).trim())
              .join("");
            if (data) {
              try {
                onMessage(JSON.parse(data) as T);
              } catch {
                // Frame malformado não derruba o stream.
              }
            }
            split = buffer.indexOf("\n\n");
          }
        }
      } catch {
        if (stopped) return;
      }

      if (stopped) return;
      await new Promise((resolve) => setTimeout(resolve, backoffMs));
      backoffMs = Math.min(backoffMs * 2, 30_000);
    }
  }

  void connect();

  return () => {
    stopped = true;
    controller.abort();
  };
}
