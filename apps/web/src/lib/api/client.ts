import type { AuthResponse, ErrorEnvelope, ValidationIssue } from "./types";

/** Origem da API, sem prefixo. Links do driver local de arquivos vêm relativos a ela. */
export const API_ORIGIN = (
  import.meta.env.VITE_API_URL ?? "http://localhost:3000"
).replace(/\/$/, "");
const BASE_URL = `${API_ORIGIN}/${import.meta.env.VITE_API_PREFIX ?? "api/v1"}`;

/** Link de arquivo: absoluto (S3) passa direto; relativo (driver local) ganha a origem. */
export function resolveFileUrl(url: string): string {
  return /^https?:\/\//.test(url) ? url : `${API_ORIGIN}${url}`;
}

const ACCESS_KEY = "clinicflow.access";
const REFRESH_KEY = "clinicflow.refresh";

/**
 * Erro tipado da API. Carrega o envelope inteiro do `AllExceptionsFilter` para
 * que a tela possa reagir ao `code` — e não fazer parsing de string de mensagem.
 */
export class ApiError extends Error {
  readonly statusCode: number;
  readonly code: string;
  readonly details?: Record<string, unknown>;

  constructor(envelope: ErrorEnvelope) {
    super(envelope.message);
    this.name = "ApiError";
    this.statusCode = envelope.statusCode;
    this.code = envelope.code;
    this.details =
      envelope.details && typeof envelope.details === "object"
        ? envelope.details
        : undefined;
  }

  /** Conflito de horário na criação/reagendamento — a tela oferece encaixe. */
  get isOverbooking(): boolean {
    return this.code === "APPOINTMENT_SLOT_CONFLICT";
  }

  get isValidation(): boolean {
    return this.code === "VALIDATION_FAILED";
  }

  /** Sem resposta do servidor: rede caiu, API fora do ar ou CORS. */
  get isNetwork(): boolean {
    return this.code === "NETWORK_ERROR";
  }

  /**
   * Problemas de validação normalizados. O Zod manda `{ path, message }`; o
   * class-validator manda a frase crua ("property x should not exist").
   */
  get issues(): ValidationIssue[] {
    const raw = this.details?.issues;
    if (!Array.isArray(raw)) return [];
    return raw.map((item) =>
      typeof item === "string"
        ? { path: "", message: item }
        : {
            path: Array.isArray(item?.path)
              ? item.path.join(".")
              : String(item?.path ?? ""),
            message: String(item?.message ?? ""),
          },
    );
  }

  /** Mensagem de erro por campo, para pendurar embaixo do input certo. */
  fieldErrors(): Record<string, string> {
    const out: Record<string, string> = {};
    for (const issue of this.issues) {
      const field = issue.path.split(".")[0];
      if (field && !out[field]) out[field] = issue.message;
    }
    return out;
  }
}

/** Mensagem para a pessoa, seja qual for o tipo do erro. */
export function errorMessage(error: unknown, fallback?: string): string {
  if (error instanceof ApiError) return error.message;
  return (
    fallback ?? "A conexão com o servidor falhou. Verifique a rede da recepção."
  );
}

function networkError(path: string): ApiError {
  return new ApiError({
    statusCode: 0,
    code: "NETWORK_ERROR",
    message: "Sem conexão com o servidor. Verifique a rede e tente de novo.",
    path,
    timestamp: new Date().toISOString(),
  });
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
/**
 * Resultado da renovação. Só `rejected` (o servidor disse não: 400/401/403)
 * encerra a sessão. Rede caída, 429 do limite por IP ou 5xx são `unavailable`:
 * a sessão continua, e a próxima tentativa renova.
 */
type RefreshResult = { token: string } | "rejected" | "unavailable";

let refreshInFlight: Promise<RefreshResult> | null = null;

async function refreshAccessToken(): Promise<RefreshResult> {
  if (refreshInFlight) return refreshInFlight;

  const refreshToken = tokenStore.refresh;
  if (!refreshToken) return "rejected";

  refreshInFlight = (async (): Promise<RefreshResult> => {
    try {
      const response = await fetch(`${BASE_URL}/auth/refresh`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ refreshToken }),
      });
      if (!response.ok) {
        return response.status === 429 || response.status >= 500
          ? "unavailable"
          : "rejected";
      }
      const auth = (await response.json()) as AuthResponse;
      tokenStore.save(auth);
      return { token: auth.accessToken };
    } catch {
      return "unavailable";
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

  try {
    return await fetch(`${BASE_URL}${path}${buildQuery(options.query)}`, {
      method: options.method ?? "GET",
      headers,
      body:
        options.body !== undefined ? JSON.stringify(options.body) : undefined,
      signal: options.signal,
    });
  } catch (error) {
    // Cancelamento é intenção, não falha: deixa o AbortError subir intacto.
    if (error instanceof DOMException && error.name === "AbortError")
      throw error;
    throw networkError(path);
  }
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
    if (typeof renewed === "object") {
      response = await send(path, options, renewed.token);
    } else if (renewed === "rejected") {
      tokenStore.clear();
      window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
    } else {
      throw new ApiError({
        statusCode: 503,
        code: "SESSION_REFRESH_UNAVAILABLE",
        message:
          "Não deu para renovar a sessão agora. Aguarde alguns segundos e tente de novo.",
        path,
        timestamp: new Date().toISOString(),
      });
    }
  }

  if (response.status === 204) return undefined as T;

  const raw = await response.text();
  let payload: unknown = null;
  try {
    payload = raw ? JSON.parse(raw) : null;
  } catch {
    // Proxy devolvendo HTML (502/504): trata como resposta sem envelope.
    payload = null;
  }

  if (!response.ok) {
    const envelope = payload as Partial<ErrorEnvelope> | null;
    throw new ApiError({
      statusCode: response.status,
      code: envelope?.code ?? "UNKNOWN",
      message:
        envelope?.message ??
        (response.status >= 500
          ? "O servidor não respondeu como esperado. Tente de novo em instantes."
          : "Não foi possível concluir. Tente novamente."),
      details: envelope?.details,
      path,
      timestamp: envelope?.timestamp ?? new Date().toISOString(),
    });
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
  let renewedOnce = false;

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
          // Um refresh por 401. Se o token novo também levar 401, espera o
          // backoff em vez de girar o refresh em loop quente.
          if (!renewedOnce) {
            renewedOnce = true;
            const renewed = await refreshAccessToken();
            if (renewed === "rejected") {
              tokenStore.clear();
              window.dispatchEvent(new CustomEvent(SESSION_EXPIRED_EVENT));
              return;
            }
            continue;
          }
          throw new Error("stream não autorizado");
        }
        if (!response.ok || !response.body)
          throw new Error("stream indisponível");

        backoffMs = 1000;
        renewedOnce = false;
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
