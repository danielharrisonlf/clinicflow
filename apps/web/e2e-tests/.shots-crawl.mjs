// Ferramenta local de revisão (não é teste): loga na API real e fotografa cada rota.
// Uso: node e2e-tests/.shots-crawl.mjs <pastaSaida> [rota1,rota2]
import { existsSync, mkdirSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const out = process.argv[2] ?? "shots-crawl";
const only = process.argv[3]?.split(",");
const base = process.env.BASE ?? "http://localhost:5173";
const theme = process.env.THEME ?? "light";
mkdirSync(out, { recursive: true });

const routes = only ?? [
  "/",
  "/agenda",
  "/sala-de-espera",
  "/pacientes",
  "/pacientes/novo",
  "/profissionais",
  "/documentos",
  "/pendencias",
  "/configuracoes",
  "/consultas/nova",
];
const widths = (process.env.WIDTHS ?? "1440,768,390").split(",").map(Number);

const browser = await chromium.launch();
const errors = [];
for (const width of widths) {
  const email = process.env.EMAIL ?? "renata.souza@clinicaviver.com.br";
  // Sessão salva por e-mail: o login da API aceita só 5 tentativas por minuto.
  const statePath = join(tmpdir(), `clinicflow-shots-${email}.json`);
  const ctx = await browser.newContext({
    viewport: { width, height: width < 500 ? 844 : 900 },
    colorScheme: theme === "dark" ? "dark" : "light",
    storageState: existsSync(statePath) ? statePath : undefined,
  });
  const page = await ctx.newPage();
  page.on("response", async (r) => {
    if (r.status() >= 400)
      errors.push(
        `[${width}] ${r.status()} ${r.request().method()} ${r.url()} ${(await r.text().catch(() => "")).slice(0, 200)}`,
      );
  });
  page.on("pageerror", (e) => errors.push(`[${width}] pageerror ${e.message}`));
  page.on("console", (m) => {
    if (m.type() === "error" && !m.text().startsWith("Failed to load resource"))
      errors.push(`[${width}] console ${m.text()}`);
  });
  await page.goto(`${base}/entrar`);
  await page.waitForTimeout(1500);
  if (new URL(page.url()).pathname.startsWith("/entrar")) {
    if (width === widths[0])
      await page.screenshot({
        path: `${out}/login-${width}.png`,
        fullPage: true,
      });
    await page.getByLabel(/e-?mail/i).fill(email);
    await page.getByLabel("Senha", { exact: true }).fill("clinicflow123");
    await page.keyboard.press("Enter");
    await page.waitForURL((u) => !u.pathname.startsWith("/entrar"), {
      timeout: 15000,
    });
    await ctx.storageState({ path: statePath });
  }
  for (const route of routes) {
    await page.goto(`${base}${route}`);
    // Streams SSE permanecem abertos; esperar networkidle atrasava cada rota em 30s.
    await page.getByRole("heading", { level: 1 }).first().waitFor();
    if (route === "/agenda" && process.env.MARKETING === "1" && width >= 768) {
      await page
        .getByRole("radio", { name: "Dia", exact: true })
        .locator("..")
        .click();
    }
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(600);
    const name = route === "/" ? "painel" : route.slice(1).replaceAll("/", "_");
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - window.innerWidth,
    );
    // A tela de "Sem conexão" renderiza sem erro de console: precisa ser lida.
    if (await page.getByText("Sem conexão com o servidor").count())
      errors.push(`[${width}] ${route} mostrou "Sem conexão com o servidor"`);
    if (overflow > 1)
      errors.push(`[${width}] ${route} horizontal overflow ${overflow}px`);
    // Captura neutra: o foco programático do conteúdo é verificado nos testes de teclado.
    await page.evaluate(() => {
      if (document.activeElement instanceof HTMLElement)
        document.activeElement.blur();
    });
    await page.screenshot({
      path: `${out}/${name}-${width}.png`,
      fullPage: true,
    });
  }
  await ctx.close();
}
await browser.close();
console.log(errors.length ? errors.join("\n") : "no errors");
