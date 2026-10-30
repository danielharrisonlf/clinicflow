import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError, request, resolveFileUrl } from "../client";

function envelope(over: Record<string, unknown> = {}) {
  return {
    statusCode: 400,
    code: "VALIDATION_FAILED",
    message: "Dados enviados estão incorretos.",
    path: "/patients",
    timestamp: "2026-10-02T12:00:00.000Z",
    ...over,
  };
}

describe("ApiError", () => {
  it("normaliza os problemas do Zod por campo", () => {
    const error = new ApiError(
      envelope({
        details: {
          issues: [
            {
              path: "phone",
              message: "Telefone inválido",
              code: "invalid_string",
            },
            { path: "cpf", message: "CPF inválido", code: "custom" },
          ],
        },
      }) as never,
    );
    expect(error.fieldErrors()).toEqual({
      phone: "Telefone inválido",
      cpf: "CPF inválido",
    });
  });

  it("aceita a lista crua do class-validator sem quebrar", () => {
    // Regressão: a tela chamava `details.find` num objeto e ficava branca.
    const error = new ApiError(
      envelope({
        details: { issues: ["property foo should not exist"] },
      }) as never,
    );
    expect(error.issues).toEqual([
      { path: "", message: "property foo should not exist" },
    ]);
    expect(error.fieldErrors()).toEqual({});
  });

  it("reconhece o conflito de horário pelo código real do backend", () => {
    const error = new ApiError(
      envelope({ statusCode: 409, code: "APPOINTMENT_SLOT_CONFLICT" }) as never,
    );
    expect(error.isOverbooking).toBe(true);
  });
});

describe("request", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("transforma resposta HTML de proxy (502) em ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () => new Response("<html>Bad gateway</html>", { status: 502 }),
      ),
    );
    const error = await request("/dashboard/today").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).statusCode).toBe(502);
  });

  it("transforma rede caída em NETWORK_ERROR", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => {
        throw new TypeError("Failed to fetch");
      }),
    );
    const error = await request("/dashboard/today").catch((e: unknown) => e);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).isNetwork).toBe(true);
  });
});

describe("renovação de sessão", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    localStorage.clear();
  });

  it("não derruba a sessão quando o refresh esbarra no limite (429)", async () => {
    // Regressão: qualquer falha no refresh limpava os tokens e mandava para o
    // login — inclusive o limite de 120 req/min por IP da recepção inteira.
    localStorage.setItem("clinicflow.access", "velho");
    localStorage.setItem("clinicflow.refresh", "r1");
    const expired = vi.fn();
    window.addEventListener("clinicflow:session-expired", expired);
    vi.stubGlobal(
      "fetch",
      vi.fn(async (url: string) =>
        url.endsWith("/auth/refresh")
          ? new Response("{}", { status: 429 })
          : new Response(
              JSON.stringify({
                statusCode: 401,
                code: "TOKEN_INVALID",
                message: "x",
              }),
              { status: 401 },
            ),
      ),
    );
    const error = await request("/dashboard/today").catch((e: unknown) => e);
    expect((error as ApiError).code).toBe("SESSION_REFRESH_UNAVAILABLE");
    expect(localStorage.getItem("clinicflow.refresh")).toBe("r1");
    expect(expired).not.toHaveBeenCalled();
    window.removeEventListener("clinicflow:session-expired", expired);
  });

  it("encerra a sessão quando o servidor recusa o refresh (401)", async () => {
    localStorage.setItem("clinicflow.access", "velho");
    localStorage.setItem("clinicflow.refresh", "revogado");
    vi.stubGlobal(
      "fetch",
      vi.fn(
        async () =>
          new Response(
            JSON.stringify({
              statusCode: 401,
              code: "TOKEN_INVALID",
              message: "x",
            }),
            { status: 401 },
          ),
      ),
    );
    await request("/dashboard/today").catch(() => undefined);
    expect(localStorage.getItem("clinicflow.refresh")).toBeNull();
  });
});

describe("resolveFileUrl", () => {
  it("prefixa a origem só no caminho relativo do driver local", () => {
    expect(resolveFileUrl("/api/v1/uploads/local/abc")).toMatch(
      /^https?:\/\/[^/]+\/api\/v1\/uploads\/local\/abc$/,
    );
    expect(resolveFileUrl("https://s3.example.com/x?sig=1")).toBe(
      "https://s3.example.com/x?sig=1",
    );
  });
});
