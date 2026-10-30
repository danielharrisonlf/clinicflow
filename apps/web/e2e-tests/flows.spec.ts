import { tmpdir } from "node:os";
import { join } from "node:path";
import { expect, type Page, test } from "@playwright/test";

/**
 * Percursos de ponta a ponta contra a API real (com seed da Clínica Viver).
 * Opcional: só roda com `E2E_REAL_API=1`, porque precisa do backend e do banco
 * de pé — e porque altera dados (cada teste desfaz o que fez quando dá).
 *
 *   E2E_REAL_API=1 pnpm --filter web test:e2e flows
 */
test.skip(!process.env.E2E_REAL_API, "precisa da API real (E2E_REAL_API=1)");
test.describe.configure({ mode: "serial" });

const RECEPCAO = "renata.souza@clinicaviver.com.br";
const PASSWORD = "clinicflow123";

// O login da API aceita 5 tentativas por minuto: entra uma vez e reaproveita.
const SESSION = join(tmpdir(), "clinicflow-e2e-session.json");

async function login(page: Page, email = RECEPCAO) {
  await page.getByLabel("E-mail").fill(email);
  await page.getByLabel("Senha", { exact: true }).fill(PASSWORD);
  await page.getByRole("button", { name: "Entrar" }).click();
}

test("senha errada mostra o erro sem sair do login", async ({ page }) => {
  await page.goto("/entrar");
  await page.getByLabel("E-mail").fill(RECEPCAO);
  await page.getByLabel("Senha", { exact: true }).fill("senha-errada-1");
  await page.getByRole("button", { name: "Entrar" }).click();
  await expect(page.getByRole("alert")).toBeVisible();
  await expect(page).toHaveURL(/\/entrar$/);
});

test("login volta para o endereço pedido e a sessão sobrevive ao F5", async ({
  page,
}) => {
  await page.goto("/pendencias");
  await expect(page).toHaveURL(/\/entrar$/);
  await login(page);
  await expect(page).toHaveURL(/\/pendencias$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();

  await page.reload();
  await expect(page).toHaveURL(/\/pendencias$/);
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
});

test("painel: transição pela linha e desfazer pelo aviso", async ({ page }) => {
  await page.goto("/entrar");
  await login(page);
  await expect(
    page.getByRole("heading", { name: "Painel do dia" }),
  ).toBeVisible();
  // Só depois do painel: antes disso os tokens ainda não estão no localStorage.
  await page.context().storageState({ path: SESSION });

  // Primeira linha com botão de próximo passo (o primário é o passo seguinte).
  const row = page
    .getByRole("article")
    .filter({
      has: page.getByRole("button", { name: /^(Confirmar|Check-in)$/ }),
    })
    .first();
  await expect(row).toBeVisible();
  const label = (await row.getAttribute("aria-label")) ?? "";
  const action = row
    .getByRole("button", { name: /^(Confirmar|Check-in)$/ })
    .first();
  await action.click();

  const undo = page.getByRole("button", { name: /Desfazer/ });
  await expect(undo).toBeVisible();
  await undo.click();
  await expect(
    page.getByText("Ação desfeita", { exact: true }).last(),
  ).toBeVisible();
  // A linha volta ao estado anterior.
  await expect(page.getByRole("article", { name: label })).toBeVisible();
});

test.describe("com sessão salva", () => {
  test.use({ storageState: SESSION });

  test("paleta abre com Ctrl+K, busca por nome e navega por teclado", async ({
    page,
  }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Painel do dia" }),
    ).toBeVisible();
    await page.keyboard.press("Control+k");
    const input = page.getByRole("combobox");
    await expect(input).toBeFocused();
    await input.fill("Luiza");
    await expect(
      page.getByRole("option", { name: /Luiza/ }).first(),
    ).toBeVisible();
    await page.keyboard.press("Enter");
    await expect(page).toHaveURL(/\/pacientes\/[\w-]+$/);
  });

  test("queda de rede no F5 não derruba a sessão", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Painel do dia" }),
    ).toBeVisible();

    await page.route("**/auth/me", (route) =>
      route.abort("internetdisconnected"),
    );
    await page.reload();
    await expect(page.getByText("Sem conexão com o servidor")).toBeVisible();

    await page.unroute("**/auth/me");
    await page.getByRole("button", { name: "Tentar de novo" }).click();
    await expect(
      page.getByRole("heading", { name: "Painel do dia" }),
    ).toBeVisible();
  });

  test("menu da conta sai da sessão", async ({ page }) => {
    await page.goto("/");
    await expect(
      page.getByRole("heading", { name: "Painel do dia" }),
    ).toBeVisible();
    await page
      .getByRole("button", { name: /Conta de/ })
      .first()
      .click();
    await page.getByRole("menuitem", { name: "Sair da conta" }).click();
    await expect(page).toHaveURL(/\/entrar$/);
  });
});
