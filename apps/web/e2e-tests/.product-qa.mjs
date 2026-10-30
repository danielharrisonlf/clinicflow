import { mkdirSync, writeFileSync } from "node:fs";
import { chromium } from "@playwright/test";

const output = process.argv[2] ?? "../../out/product-direction/qa";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
const findings = [];
try {
  for (const width of [1440, 768, 390]) {
    for (const theme of ["light", "dark"]) {
      const context = await browser.newContext({
        viewport: { width, height: 900 },
        colorScheme: theme,
        deviceScaleFactor: 1,
      });
      const page = await context.newPage();
      page.on("pageerror", (error) => findings.push(error.message));
      page.on("console", (message) => {
        if (message.type() === "error") findings.push(message.text());
      });
      await page.goto("http://localhost:5173/conhecer");
      await page.getByRole("heading", { level: 1 }).waitFor();
      await page.evaluate(() => document.fonts.ready);
      await page.locator("img").evaluateAll(async (images) => {
        for (const img of images) img.loading = "eager";
        await Promise.all(images.map((img) => img.decode()));
      });
      const name = `landing-${width}-${theme}`;
      await page.screenshot({ path: `${output}/${name}.png`, fullPage: true });
      await page.locator(".landing-showcase").screenshot({
        path: `${output}/showcase-${width}-${theme}.png`,
      });
      const state = await page.evaluate(() => ({
        width: innerWidth,
        overflow: document.documentElement.scrollWidth - innerWidth,
        font: getComputedStyle(document.querySelector("h1")).fontFamily,
        images: [...document.images].map((img) => ({
          src: img.getAttribute("src"),
          loaded: img.complete && img.naturalWidth > 0,
        })),
      }));
      writeFileSync(`${output}/${name}.json`, JSON.stringify(state, null, 2));
      if (state.overflow > 1)
        findings.push(`${name}: overflow ${state.overflow}`);
      if (state.images.some((img) => !img.loaded))
        findings.push(`${name}: image missing`);
      await context.close();
    }
  }
} finally {
  await browser.close();
}
writeFileSync(`${output}/errors.json`, JSON.stringify(findings, null, 2));
console.log(findings.length ? findings : "no errors");
