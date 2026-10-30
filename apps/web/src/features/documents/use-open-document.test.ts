import { afterEach, describe, expect, it, vi } from "vitest";
import { ApiError } from "@/lib/api/client";
import { loadDocumentBlob } from "./use-open-document";

vi.mock("@/lib/api/endpoints", () => ({
  documentsApi: { download: vi.fn(async () => ({ url: "/uploads/file" })) },
}));

describe("loadDocumentBlob", () => {
  afterEach(() => vi.unstubAllGlobals());

  it("preserva o tipo de PDF quando o armazenamento retorna bytes genéricos", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response("%PDF-1.7")),
    );
    const blob = await loadDocumentBlob({ id: "1", fileName: "laudo.pdf" });
    expect(blob.type).toBe("application/pdf");
    expect(await blob.text()).toBe("%PDF-1.7");
  });

  it("explica quando o registro existe mas o arquivo foi removido", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => new Response(null, { status: 404 })),
    );
    const error = await loadDocumentBlob({
      id: "1",
      fileName: "laudo.pdf",
    }).catch((cause: unknown) => cause);
    expect(error).toBeInstanceOf(ApiError);
    expect((error as ApiError).code).toBe("FILE_UNAVAILABLE");
    expect((error as ApiError).message).toContain(
      "arquivo não está no armazenamento",
    );
  });
});
