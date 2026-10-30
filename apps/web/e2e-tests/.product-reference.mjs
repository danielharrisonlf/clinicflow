import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "@playwright/test";

const urls = process.argv.slice(2);
const output = "../../out/product-direction/references";
mkdirSync(output, { recursive: true });
const browser = await chromium.launch();
try {
  const page = await browser.newPage({
    viewport: { width: 1440, height: 1000 },
  });
  for (const url of urls) {
    const name =
      new URL(url).pathname.split("/").filter(Boolean).join("-") || "home";
    await page.goto(url, { waitUntil: "domcontentloaded" });
    await page.locator("h1").first().waitFor();
    await page.evaluate(() => document.fonts.ready);
    await page.waitForTimeout(1200);
    const media = await page.locator("img, video").evaluateAll((nodes) =>
      nodes.map((node) => ({
        tag: node.tagName,
        src: node.currentSrc || node.src,
        poster: node.poster || "",
        alt: node.alt || "",
        width: node.naturalWidth || node.videoWidth || node.clientWidth,
        height: node.naturalHeight || node.videoHeight || node.clientHeight,
        rect: {
          width: node.getBoundingClientRect().width,
          height: node.getBoundingClientRect().height,
        },
      })),
    );
    const links = await page
      .locator("a[href]")
      .evaluateAll((nodes) =>
        nodes.map((node) => ({ title: node.innerText, href: node.href })),
      );
    writeFileSync(
      join(output, `${name}.json`),
      JSON.stringify({ url, title: await page.title(), media, links }, null, 2),
    );
    await page.screenshot({
      path: join(output, `${name}.png`),
      fullPage: true,
      animations: "disabled",
    });
    console.log(
      JSON.stringify({
        url,
        name,
        media: media.filter((item) => item.rect.width > 500),
      }),
    );
  }
} finally {
  await browser.close();
}
