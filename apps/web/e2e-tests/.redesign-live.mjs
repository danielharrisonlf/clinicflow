// Verificação complementar contra a API e o PostgreSQL isolado da revisão.
import { mkdirSync, readFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { chromium, expect } from "@playwright/test";

const evidence = "../../out/redesign/live-workflows";
mkdirSync(evidence, { recursive: true });
const session = join(
  tmpdir(),
  "clinicflow-shots-renata.souza@clinicaviver.com.br.json",
);
const browser = await chromium.launch();
const context = await browser.newContext({
  storageState: JSON.parse(readFileSync(session, "utf8")),
  viewport: { width: 1440, height: 900 },
});
const page = await context.newPage();
const errors = [];
page.on("pageerror", (error) => errors.push(error.message));
try {
  await page.goto("http://localhost:5173/?filtro=abertas");
  const patient = page
    .getByRole("link", { name: "Maria Silva Rodrigues", exact: true })
    .first();
  await patient.click();
  await expect(page.getByRole("dialog")).toBeVisible();
  await expect(page.locator("#conteudo")).toContainText("Consultas de hoje");
  await page.screenshot({ path: `${evidence}/consulta-contextual.png` });
  await page.keyboard.press("Escape");
  await expect(page).toHaveURL(/filtro=abertas/);
  await expect(patient).toBeFocused();

  await page.goto("http://localhost:5173/documentos");
  await page
    .getByRole("button", { name: "Enviar documento", exact: true })
    .click();
  const upload = page.getByRole("dialog", { name: "Enviar documento" });
  await upload
    .getByRole("combobox", { name: "Paciente", exact: true })
    .fill("Maria Silva");
  await upload.getByRole("option", { name: /Maria Silva Rodrigues/ }).click();
  await upload.locator('input[type="file"]').setInputFiles({
    name: "clinicflow-qa-preview.png",
    mimeType: "image/png",
    buffer: Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aSxkAAAAASUVORK5CYII=",
      "base64",
    ),
  });
  await upload.getByLabel("Tipo", { exact: true }).selectOption("EXAME_IMAGEM");
  await upload
    .getByRole("button", { name: "Enviar documento", exact: true })
    .click();
  await expect(upload).not.toBeVisible();
  await page
    .getByRole("button", {
      name: "Abrir clinicflow-qa-preview.png",
      exact: true,
    })
    .click();
  const preview = page.getByRole("dialog", {
    name: "clinicflow-qa-preview.png",
    exact: true,
  });
  await expect(preview.getByRole("img")).toBeVisible();
  await expect(
    preview.getByRole("button", { name: "Baixar arquivo" }),
  ).toBeVisible();
  const downloadEvent = page.waitForEvent("download");
  await preview.getByRole("button", { name: "Baixar arquivo" }).click();
  const downloaded = await downloadEvent;
  expect(downloaded.suggestedFilename()).toBe("clinicflow-qa-preview.png");
  await page.screenshot({ path: `${evidence}/documento-preview.png` });
  await page.keyboard.press("Escape");
  expect(errors).toEqual([]);
  console.log(
    "PASS: detalhe contextual + filtros + retorno de foco; upload real + preview + download; sem erros de renderização.",
  );
} finally {
  await context.close();
  await browser.close();
}
