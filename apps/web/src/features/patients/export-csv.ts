import { API_ORIGIN, ApiError, buildQuery, tokenStore } from "@/lib/api/client";
import { authApi } from "@/lib/api/endpoints";
import type { ListPatientsQuery } from "@/lib/api/types";

const BASE_URL = `${API_ORIGIN}/${import.meta.env.VITE_API_PREFIX ?? "api/v1"}`;

/**
 * Baixa o CSV de `GET /patients/export` com o recorte atual (busca e filtro).
 *
 * Não dá para ser um `<a href>`: a rota exige `Authorization: Bearer`, que um
 * link não manda. E o `request` do cliente lê JSON. Então: fetch com o token,
 * blob, link temporário. Num 401 o `authApi.me()` passa pelo refresh do
 * cliente e a gente tenta mais uma vez com o token novo.
 */
export async function downloadPatientsCsv(
  query: ListPatientsQuery,
): Promise<void> {
  const qs = buildQuery({
    search: query.search,
    hasPendencies: query.hasPendencies,
  });
  const url = `${BASE_URL}/patients/export${qs}`;
  const send = () =>
    fetch(url, {
      headers: tokenStore.access
        ? { Authorization: `Bearer ${tokenStore.access}` }
        : {},
    }).catch(() => null);

  let response = await send();
  if (response?.status === 401) {
    await authApi.me();
    response = await send();
  }
  if (!response) {
    throw new ApiError({
      statusCode: 0,
      code: "NETWORK_ERROR",
      message: "Sem conexão com o servidor. Verifique a rede e tente de novo.",
      path: "/patients/export",
      timestamp: new Date().toISOString(),
    });
  }
  if (!response.ok) {
    const body = (await response.json().catch(() => null)) as {
      message?: string;
      code?: string;
    } | null;
    throw new ApiError({
      statusCode: response.status,
      code: body?.code ?? "EXPORT_FAILED",
      message:
        body?.message ??
        "O servidor não gerou o arquivo. Tente de novo em instantes.",
      path: "/patients/export",
      timestamp: new Date().toISOString(),
    });
  }

  // BOM no início: sem ele o Excel em pt-BR abre "João" como "JoÃ£o".
  const text = await response.text();
  const blob = new Blob([`${String.fromCharCode(0xfeff)}${text}`], {
    type: "text/csv;charset=utf-8",
  });
  const href = URL.createObjectURL(blob);
  const link = document.createElement("a");
  link.href = href;
  link.download = "pacientes.csv";
  document.body.append(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 10_000);
}
