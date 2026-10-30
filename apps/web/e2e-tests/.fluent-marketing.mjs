import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";
import {
  installRedesignApi,
  prepareAuthenticatedPage,
} from "./fixtures/redesign-api.ts";

// Captures of the actual app, with deterministic fictional API fixtures.
// The public landing identifies these illustrations as demonstration data.
const output = "../../out/visual-refresh/marketing";
mkdirSync(output, { recursive: true });
const routes = [
  ["painel", "/", "Painel do dia"],
  ["agenda", "/agenda", "Agenda"],
  ["espera", "/sala-de-espera", "Sala de espera"],
  ["retornos", "/pendencias", "Pendências e retornos"],
];
const browser = await chromium.launch();
const report = [];
try {
  for (const width of [1440, 390]) {
    const context = await browser.newContext({
      viewport: { width, height: width === 390 ? 950 : 1000 },
      deviceScaleFactor: 1,
      colorScheme: "light",
    });
    const page = await context.newPage();
    const api = await installRedesignApi(page);
    await prepareAuthenticatedPage(page);
    const errors = [];
    page.on("pageerror", (error) => errors.push(error.message));
    for (const [name, path, heading] of routes) {
      await page.goto(`http://localhost:5173${path}`);
      await page.getByRole("heading", { name: heading, exact: true }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      if (name === "agenda" && width === 1440) {
        await page
          .getByRole("radio", { name: "Dia", exact: true })
          .locator("..")
          .click();
      }
      await page.waitForTimeout(300);
      await page.evaluate(() => document.activeElement?.blur());
      const filename = `${name}${width === 390 ? "-mobile" : ""}.png`;
      await page.screenshot({
        path: `${output}/${filename}`,
        animations: "disabled",
      });
      report.push({
        filename,
        width,
        source: "actual app with fictional fixtures",
      });
    }
    if (errors.length || api.unknownRequests.length) {
      throw new Error(
        JSON.stringify({ errors, unknownRequests: api.unknownRequests }),
      );
    }
    await context.close();
  }
} finally {
  await browser.close();
}
writeFileSync(`${output}/capture.json`, JSON.stringify(report, null, 2));
console.log(`Captured ${report.length} app illustrations.`);
