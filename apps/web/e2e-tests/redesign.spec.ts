import { mkdir } from "node:fs/promises";
import { join } from "node:path";
import { expect, test } from "@playwright/test";
import {
  installRedesignApi,
  prepareAuthenticatedPage,
} from "./fixtures/redesign-api";

const shotsDirectory = join(process.cwd(), "shots", "redesign", "after");

const routes = [
  { name: "dashboard", path: "/", heading: "Cockpit do dia" },
  { name: "agenda", path: "/agenda", heading: "Agenda" },
  { name: "waiting-room", path: "/sala-de-espera", heading: "Sala de espera" },
  {
    name: "new-appointment",
    path: "/consultas/nova",
    heading: "Nova consulta",
  },
  {
    name: "appointment-detail",
    path: "/consultas/a4",
    heading: "Maria Silva Rodrigues",
  },
  { name: "patients", path: "/pacientes", heading: "Pacientes" },
  { name: "new-patient", path: "/pacientes/novo", heading: "Novo paciente" },
  {
    name: "patient-detail",
    path: "/pacientes/p1",
    heading: "Maria Silva Rodrigues",
  },
  {
    name: "edit-patient",
    path: "/pacientes/p1/editar",
    heading: "Editar cadastro",
  },
  { name: "professionals", path: "/profissionais", heading: "Profissionais" },
  {
    name: "professional-detail",
    path: "/profissionais/d1",
    heading: "Dra. Helena Prado",
  },
  { name: "documents", path: "/documentos", heading: "Documentos" },
  { name: "tasks", path: "/pendencias", heading: "Pendências" },
  { name: "settings", path: "/configuracoes", heading: "Configurações" },
  { name: "login", path: "/entrar", heading: "Entrar" },
  {
    name: "forgot-password",
    path: "/recuperar-senha",
    heading: "Recuperar senha",
  },
  {
    name: "reset-password",
    path: "/redefinir-senha?token=redesign",
    heading: "Nova senha",
  },
];

const viewports = [
  { name: "mobile", width: 390, height: 844 },
  { name: "tablet", width: 768, height: 1024 },
  { name: "desktop", width: 1440, height: 1000 },
];

function themedPath(path: string, theme: "light" | "dark") {
  const separator = path.includes("?") ? "&" : "?";
  return `${path}${separator}e2eTheme=${theme}`;
}

test("todas as rotas cabem nos breakpoints e temas suportados", async ({
  page,
}) => {
  test.setTimeout(180_000);
  await mkdir(shotsDirectory, { recursive: true });
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(error.message));

  for (const theme of ["light", "dark"] as const) {
    for (const viewport of viewports) {
      await page.setViewportSize({
        width: viewport.width,
        height: viewport.height,
      });
      for (const route of routes) {
        await page.goto(themedPath(route.path, theme), {
          waitUntil: "domcontentloaded",
        });
        await expect(
          page.getByRole("heading", { name: route.heading }).first(),
        ).toBeVisible({ timeout: 15_000 });
        await expect(page.locator("html")).toHaveAttribute("data-theme", theme);
        const dimensions = await page.evaluate(() => ({
          client: document.documentElement.clientWidth,
          scroll: document.documentElement.scrollWidth,
        }));
        expect(
          dimensions.scroll,
          `${route.path} overflows at ${viewport.width}px in ${theme} theme: ${JSON.stringify(dimensions)}`,
        ).toBeLessThanOrEqual(dimensions.client + 1);

        const screenshotName = `${route.name}-${viewport.name}-${theme}.png`;
        await page.screenshot({
          path: join(shotsDirectory, screenshotName),
          fullPage: true,
          animations: "disabled",
        });
      }
    }
  }

  expect(
    api.unknownRequests,
    `unknown API requests: ${api.unknownRequests.join(", ")}`,
  ).toEqual([]);
  expect(pageErrors, `browser page errors: ${pageErrors.join(" | ")}`).toEqual(
    [],
  );
});

test("o balcão preserva filtro no detalhe e não empilha ações de consulta", async ({
  page,
}) => {
  test.setTimeout(60_000);
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?filtro=confirmar");

  const filters = page.getByRole("group", { name: "Filtrar consultas" });
  await expect(filters).toContainText("A confirmar");
  await expect(filters).toContainText("4");
  const row = page.locator('article[aria-label*="Maria Silva Rodrigues"]');
  await expect(row).toBeVisible();
  await expect(row.locator("button.bg-accent")).toHaveCount(1);

  await page.locator('a[href="/consultas/a4"]').last().click();
  await expect(
    page.getByRole("dialog", { name: "Maria Silva Rodrigues" }),
  ).toBeVisible();
  await expect(
    page.getByRole("heading", { name: "Consultas de hoje" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\/?filtro=confirmar$/);
  await expect(
    page.getByRole("heading", { name: "Consultas de hoje" }),
  ).toBeVisible();

  await page.locator('a[href="/consultas/a4"]').last().click();
  const detail = page.getByRole("dialog", { name: "Maria Silva Rodrigues" });
  await expect(detail).toBeVisible();
  const openModalCounts: number[] = [];

  await detail.getByRole("button", { name: "Outras ações" }).click();
  await page.getByRole("menuitem", { name: "Cancelar consulta" }).click();
  await expect(
    page.getByRole("alertdialog", { name: "Cancelar esta consulta?" }),
  ).toBeVisible();
  openModalCounts.push(await page.locator('[aria-modal="true"]').count());
  await page.keyboard.press("Escape");
  await expect(detail).toBeVisible();

  await detail.getByRole("button", { name: "Outras ações" }).click();
  await page.getByRole("menuitem", { name: "Reagendar" }).click();
  await expect(
    page.getByRole("dialog", { name: "Reagendar consulta" }),
  ).toBeVisible();
  openModalCounts.push(await page.locator('[aria-modal="true"]').count());
  await page.keyboard.press("Escape");
  await expect(detail).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("heading", { name: "Consultas de hoje" }),
  ).toBeVisible();

  expect(
    openModalCounts,
    "the cancel and reschedule panel should replace the detail sheet instead of stacking over it",
  ).toEqual([1, 1]);
  expect(api.unknownRequests).toEqual([]);
});

test("atalhos param em campos e overlays e a busca fecha com Escape", async ({
  page,
}) => {
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);
  await page.goto("/documentos");

  const search = page.getByRole("searchbox", { name: "Buscar documento" });
  await search.focus();
  await page.keyboard.press("N");
  await expect(page).toHaveURL(/\/documentos$/);
  await expect(search).toHaveValue("N");

  await page.locator("#conteudo").focus();
  await page.keyboard.press("N");
  await expect(page).toHaveURL(/\/consultas\/nova$/);

  await page.goto("/pacientes");
  await expect(page.getByRole("heading", { name: "Pacientes" })).toBeVisible();
  await page.keyboard.press("Control+k");
  const palette = page.getByRole("dialog", {
    name: "Buscar paciente, profissional ou ação",
  });
  await expect(palette).toBeVisible();
  const paletteSearch = page.getByRole("combobox", { name: "Termo de busca" });
  await paletteSearch.fill("Maria");
  await expect(page.getByText("Maria Silva Rodrigues").last()).toBeVisible();
  await expect(paletteSearch).toBeFocused();
  await paletteSearch.press("n");
  await expect(page).toHaveURL(/\/pacientes$/);
  await expect(paletteSearch).toHaveValue("Marian");
  await page.keyboard.press("Escape");
  await expect(palette).toBeHidden();
  expect(api.unknownRequests).toEqual([]);
});

test("busca de pacientes mantém o filtro e reduz a página fora do intervalo", async ({
  page,
}) => {
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);
  await page.goto("/pacientes");

  const search = page.getByRole("searchbox", { name: "Buscar paciente" });
  await search.fill("Maria");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("busca"))
    .toBe("Maria");
  await page.getByText("Com pendências", { exact: true }).click();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("busca"))
    .toBe("Maria");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("filtro"))
    .toBe("pendencias");
  await expect(page.getByText("Maria Silva Rodrigues").first()).toBeVisible();
  await expect
    .poll(
      () =>
        api.requested.some(
          (request) =>
            request.includes("search=Maria") &&
            request.includes("hasPendencies=true"),
        ),
      { message: `requests: ${api.requested.join(" | ")}` },
    )
    .toBeTruthy();

  await page.goto("/pendencias?pagina=2");
  await expect(page.getByRole("heading", { name: "Pendências" })).toBeVisible();
  await expect
    .poll(() => new URL(page.url()).searchParams.get("pagina"))
    .toBeNull();
  expect(api.unknownRequests).toEqual([]);
});

test("página 2 só é ajustada depois que o detalhe contextual fecha", async ({
  page,
}) => {
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/?filtro=confirmar&pagina=2");

  const row = page.locator('article[aria-label*="Ana Beatriz Moraes"]');
  await expect(row).toBeVisible();
  await page.locator('a[href="/consultas/a_page2"]').last().click();
  const detail = page.getByRole("dialog", { name: "Ana Beatriz Moraes" });
  await expect(detail).toBeVisible();
  const backgroundSearch = () =>
    page.evaluate(
      () =>
        (
          window.history.state?.usr as
            | { backgroundLocation?: { search?: string } }
            | undefined
        )?.backgroundLocation?.search,
    );
  await expect.poll(backgroundSearch).toBe("?filtro=confirmar&pagina=2");
  await detail.getByRole("button", { name: "Confirmar consulta" }).click();

  await expect
    .poll(() =>
      api.requested.some(
        (request) => request === "PATCH /appointments/a_page2/confirm",
      ),
    )
    .toBeTruthy();
  await expect(detail).toBeVisible();
  await expect.poll(backgroundSearch).toBe("?filtro=confirmar&pagina=2");
  await expect
    .poll(
      () =>
        api.requested.filter(
          (request) =>
            request.startsWith("GET /appointments?") &&
            request.includes("page=2") &&
            request.includes("status=AGENDADA"),
        ).length,
    )
    .toBeGreaterThan(1);

  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/\?filtro=confirmar&pagina=1$/);
  await expect(
    page.locator('article[aria-label*="Maria Silva Rodrigues"]'),
  ).toBeVisible();
  expect(api.unknownRequests).toEqual([]);
});

test("documentos abrem prévia PDF e imagem e explicam quando o arquivo sumiu", async ({
  page,
}) => {
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);
  await page.goto("/documentos");

  await page.getByRole("button", { name: "Abrir hemograma-maria.pdf" }).click();
  const pdfDialog = page.getByRole("dialog", { name: "hemograma-maria.pdf" });
  await expect(pdfDialog).toBeVisible();
  await expect(
    pdfDialog.getByTitle("Prévia de hemograma-maria.pdf"),
  ).toBeVisible();
  await page.keyboard.press("Escape");

  await page.getByRole("button", { name: "Abrir receita-maria.png" }).click();
  const imageDialog = page.getByRole("dialog", { name: "receita-maria.png" });
  await expect(imageDialog).toBeVisible();
  await expect(
    imageDialog.getByRole("img", { name: "Prévia de receita-maria.png" }),
  ).toBeVisible();
  await page.keyboard.press("Escape");
  expect(api.unknownRequests).toEqual([]);
});

test("prévia informa que os bytes do documento não estão disponíveis", async ({
  page,
}) => {
  const api = await installRedesignApi(page, { missingFile: true });
  await prepareAuthenticatedPage(page);
  await page.goto("/documentos");

  await page.getByRole("button", { name: "Abrir hemograma-maria.pdf" }).click();
  await expect(
    page.getByText("A prévia não carregou", { exact: true }),
  ).toBeVisible();
  await expect(
    page.getByText(
      /o registro existe, mas o arquivo não está no armazenamento/i,
    ),
  ).toBeVisible();
  await expect(
    page.getByRole("button", { name: "Baixar arquivo" }),
  ).toHaveCount(0);
  expect(api.unknownRequests).toEqual([]);
});

test("filtro de documento preserva o termo de busca na URL e na requisição", async ({
  page,
}) => {
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);
  await page.goto("/documentos");

  const search = page.getByRole("searchbox", { name: "Buscar documento" });
  await search.fill("Maria");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("busca"))
    .toBe("Maria");
  await page.getByLabel("Tipo de documento").selectOption("RECEITA");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("tipo"))
    .toBe("RECEITA");
  await expect
    .poll(() => new URL(page.url()).searchParams.get("busca"))
    .toBe("Maria");
  await expect(page.getByText("receita-maria.png")).toBeVisible();
  await expect
    .poll(
      () =>
        api.requested.some(
          (request) =>
            request.includes("search=Maria") &&
            request.includes("type=RECEITA"),
        ),
      { message: `requests: ${api.requested.join(" | ")}` },
    )
    .toBeTruthy();
  expect(api.unknownRequests).toEqual([]);
});

test("navegação Mais e tema funcionam no celular", async ({ page }) => {
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");

  await page.getByRole("button", { name: "Mais" }).click();
  const moreSheet = page.getByRole("dialog", { name: "Mais opções" });
  await expect(moreSheet).toBeVisible();
  await expect(
    moreSheet.getByRole("link", { name: "Profissionais" }),
  ).toBeVisible();
  await moreSheet.getByRole("radio", { name: "Escuro" }).check({ force: true });
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await page.keyboard.press("Escape");
  await expect(moreSheet).toBeHidden();
  expect(api.unknownRequests).toEqual([]);
});
