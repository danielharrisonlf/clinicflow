import { HttpStatus, Injectable, Logger } from "@nestjs/common";
import { config } from "../../common/config";
import { AppException } from "../../common/exceptions/app.exception";

export type HttpMethod = "GET" | "POST" | "PUT" | "PATCH" | "DELETE";

export interface HttpRequestOptions {
  url: string;
  method?: HttpMethod;
  body?: unknown;
  headers?: Record<string, string>;
  timeoutMs?: number;
  retries?: number;
}

/**
 * Cliente HTTP de saída (provedor de WhatsApp, futuros serviços de IA).
 *
 * Sem axios: o `fetch` nativo do Node 22 já faz o trabalho. O que a casa põe
 * em cima é o que importa — timeout, retentativa só onde faz sentido e
 * tradução do erro para o envelope da API.
 */
@Injectable()
export class HttpClientService {
  private readonly logger = new Logger(HttpClientService.name);

  async request<T>(options: HttpRequestOptions): Promise<T> {
    const timeoutMs = options.timeoutMs ?? config.http.timeoutMs;
    const maxAttempts = (options.retries ?? config.http.retries) + 1;

    let lastError: unknown;

    for (let attempt = 1; attempt <= maxAttempts; attempt += 1) {
      try {
        const response = await fetch(options.url, {
          method: options.method ?? "GET",
          headers: {
            "content-type": "application/json",
            ...options.headers,
          },
          ...(options.body === undefined
            ? {}
            : { body: JSON.stringify(options.body) }),
          signal: AbortSignal.timeout(timeoutMs),
        });

        // 4xx é resposta do serviço, não falha de transporte: repetir não muda
        // nada e só multiplica a chamada. Só 5xx e erro de rede merecem retry.
        if (
          !response.ok &&
          response.status < HttpStatus.INTERNAL_SERVER_ERROR
        ) {
          throw new AppException({
            code: "UPSTREAM_UNAVAILABLE",
            message: `Serviço externo recusou a requisição (${response.status}).`,
            status: HttpStatus.BAD_GATEWAY,
            details: { url: options.url, status: response.status },
          });
        }

        if (!response.ok) {
          throw new Error(`upstream ${response.status}`);
        }

        if (response.status === HttpStatus.NO_CONTENT) {
          return undefined as T;
        }
        return (await response.json()) as T;
      } catch (error) {
        if (error instanceof AppException) throw error;
        lastError = error;

        if (attempt < maxAttempts) {
          const backoffMs = 2 ** (attempt - 1) * 250;
          this.logger.warn(
            `Tentativa ${attempt}/${maxAttempts} falhou para ${options.url}. Nova tentativa em ${backoffMs}ms.`,
          );
          await sleep(backoffMs);
        }
      }
    }

    this.logger.error(
      `Falha definitiva ao chamar ${options.url}`,
      String(lastError),
    );
    throw new AppException({
      code: "UPSTREAM_UNAVAILABLE",
      message: "Serviço externo indisponível no momento.",
      status: HttpStatus.BAD_GATEWAY,
      details: { url: options.url },
    });
  }
}

function sleep(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
