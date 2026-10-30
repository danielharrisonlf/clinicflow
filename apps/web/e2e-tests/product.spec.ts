import { mkdir, writeFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { expect, type Page, test } from "@playwright/test";
import {
  installRedesignApi,
  prepareAuthenticatedPage,
} from "./fixtures/redesign-api";

const evidenceDirectory = fileURLToPath(
  new URL("../../../out/product-direction/tester/", import.meta.url),
);

type BrowserErrors = {
  page: string[];
  console: string[];
  requests: string[];
  http: string[];
};

const errorsByPage = new WeakMap<Page, BrowserErrors>();

test.beforeEach(async ({ page }) => {
  const errors: BrowserErrors = {
    page: [],
    console: [],
    requests: [],
    http: [],
  };
  errorsByPage.set(page, errors);
  page.on("pageerror", (error) => errors.page.push(error.message));
  page.on("console", (message) => {
    if (message.type() === "error") {
      errors.console.push(`${message.text()} (${message.location().url})`);
    }
  });
  page.on("requestfailed", (request) => {
    errors.requests.push(
      `${request.url()} (${request.failure()?.errorText ?? "request failed"})`,
    );
  });
  page.on("response", (response) => {
    if (response.status() >= 400) {
      errors.http.push(`${response.status()} ${response.url()}`);
    }
  });
});

test.afterEach(async ({ page }, testInfo) => {
  await mkdir(evidenceDirectory, { recursive: true });
  const browserErrors = errorsByPage.get(page) ?? {
    page: [],
    console: [],
    requests: [],
    http: [],
  };
  const isExpectedMockStreamFailure = (error: string) =>
    /\/api\/v1\/(dashboard|waiting-room)\/stream/.test(error);
  const unexpectedConsole = browserErrors.console.filter(
    (error) => !isExpectedMockStreamFailure(error),
  );
  const unexpectedRequests = browserErrors.requests.filter(
    (error) => !isExpectedMockStreamFailure(error),
  );
  const title = testInfo.title
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-zA-Z0-9]+/g, "-")
    .replace(/^-|-$/g, "")
    .toLowerCase();
  await writeFile(
    `${evidenceDirectory}/${title}.json`,
    `${JSON.stringify(
      {
        test: testInfo.title,
        status: testInfo.status,
        layout: await page.evaluate(() => ({
          viewport: { width: window.innerWidth, height: window.innerHeight },
          document: {
            width: document.documentElement.scrollWidth,
            height: document.documentElement.scrollHeight,
          },
        })),
        errors: {
          page: browserErrors.page,
          console: unexpectedConsole,
          requests: unexpectedRequests,
          http: browserErrors.http,
          brokenImages: await page.evaluate(() =>
            Array.from(document.images)
              .filter((image) => image.complete && image.naturalWidth === 0)
              .map((image) => image.currentSrc || image.src),
          ),
          expectedFixtureStreamAborts: [
            ...browserErrors.console,
            ...browserErrors.requests,
          ].filter(isExpectedMockStreamFailure),
        },
      },
      null,
      2,
    )}\n`,
  );
  expect(browserErrors.page).toEqual([]);
  expect(unexpectedConsole).toEqual([]);
  expect(unexpectedRequests).toEqual([]);
  expect(browserErrors.http).toEqual([]);
  expect(
    await page.evaluate(() =>
      Array.from(document.images)
        .filter((image) => image.complete && image.naturalWidth === 0)
        .map((image) => image.currentSrc || image.src),
    ),
  ).toEqual([]);
});

async function takeScreenshot(page: Page, name: string) {
  await mkdir(evidenceDirectory, { recursive: true });
  await page.screenshot({
    path: `${evidenceDirectory}/${name}.png`,
    fullPage: true,
    animations: "disabled",
  });
}

async function prepareLandingScreenshot(page: Page) {
  await expect(page.getByRole("heading", { level: 1 })).toBeVisible();
  await page.locator("img").evaluateAll((images) => {
    for (const image of images) image.loading = "eager";
  });
  await expect
    .poll(() =>
      page
        .locator("img")
        .evaluateAll((images) =>
          images.every((image) => image.complete && image.naturalWidth > 0),
        ),
    )
    .toBe(true);
}

test("landing pública abre sem depender da API", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto("/");

  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /O próximo passo de cada paciente/,
    }),
  ).toBeVisible();
  await expect(
    page.getByRole("navigation", { name: "Navegação principal" }),
  ).toBeVisible();
  await expect(page.getByText("Sem conexão com o servidor")).toHaveCount(0);
  await prepareLandingScreenshot(page);
  await takeScreenshot(page, "landing-desktop-light");

  await page.evaluate(() => localStorage.setItem("clinicflow.theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await prepareLandingScreenshot(page);
  await takeScreenshot(page, "landing-desktop-dark");
});

test("CTAs levam ao fluxo e ao login", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.setViewportSize({ width: 1440, height: 1000 });
  await page.goto("/");

  await page.getByRole("link", { name: "Conhecer o fluxo" }).first().click();
  await expect(page).toHaveURL(/#fluxo$/);
  await expect(
    page.getByRole("heading", {
      name: /Um dia de clínica tem muitas passagens/,
    }),
  ).toBeInViewport();

  await page
    .getByRole("navigation", { name: "Navegação principal" })
    .getByRole("link", { name: "Entrar no sistema" })
    .click();
  await expect(page).toHaveURL(/\/entrar$/);
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
});

test("abas trocam a prévia por clique e pelas setas", async ({ page }) => {
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.goto("/conhecer");

  const receptionTab = page.getByRole("tab", { name: "Recepção" });
  await receptionTab.click();
  await expect(receptionTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByRole("img")).toHaveAttribute(
    "alt",
    /Fila de espera/,
  );

  await receptionTab.focus();
  await page.keyboard.press("ArrowRight");
  const careTab = page.getByRole("tab", { name: "Atendimento" });
  await expect(careTab).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("tabpanel").getByRole("img")).toHaveAttribute(
    "alt",
    /Painel operacional/,
  );
  await expect(careTab).toBeFocused();
});

test("menu mobile fecha com Escape e a página cabe em 390px", async ({
  page,
}) => {
  await page.route("**/api/v1/**", (route) => route.abort());
  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await prepareLandingScreenshot(page);
  await takeScreenshot(page, "landing-mobile-light");

  const lightDimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(
    lightDimensions.document,
    `landing overflows 390px in light theme: ${JSON.stringify(lightDimensions)}`,
  ).toBeLessThanOrEqual(lightDimensions.viewport);

  await page.evaluate(() => localStorage.setItem("clinicflow.theme", "dark"));
  await page.reload();
  await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  await prepareLandingScreenshot(page);
  await takeScreenshot(page, "landing-mobile-dark");

  const toggle = page.getByRole("button", { name: "Abrir menu" });
  await toggle.click();
  const closeToggle = page.getByRole("button", { name: "Fechar menu" });
  await expect(closeToggle).toHaveAttribute("aria-expanded", "true");
  await expect(page.getByRole("link", { name: "Como funciona" })).toBeVisible();
  await page.keyboard.press("Escape");
  await expect(
    page.getByRole("button", { name: "Abrir menu" }),
  ).toHaveAttribute("aria-expanded", "false");

  const dimensions = await page.evaluate(() => ({
    viewport: window.innerWidth,
    document: document.documentElement.scrollWidth,
  }));
  expect(
    dimensions.document,
    `landing transborda em 390px: ${JSON.stringify(dimensions)}`,
  ).toBeLessThanOrEqual(dimensions.viewport);
});

test("/conhecer continua público na sessão e / preserva o Painel", async ({
  page,
}) => {
  const api = await installRedesignApi(page);
  await prepareAuthenticatedPage(page);

  await page.goto("/conhecer");
  await expect(
    page.getByRole("heading", {
      level: 1,
      name: /O próximo passo de cada paciente/,
    }),
  ).toBeVisible();
  await expect(page).toHaveURL(/\/conhecer$/);

  await page.goto("/");
  await expect(
    page.getByRole("heading", { name: "Painel do dia" }),
  ).toBeVisible();
  expect(api.unknownRequests).toEqual([]);
});
