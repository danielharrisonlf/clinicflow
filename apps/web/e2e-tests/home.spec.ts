import { expect, test } from "@playwright/test";

/**
 * Fumaça sem backend: sem token, toda rota cai no login. Isso exercita o
 * bundle, as fontes e o guard de rota, que é o que quebra silenciosamente.
 * O fluxo autenticado vive em teste próprio, que precisa da API de pé.
 */
test.describe("Acesso não autenticado", () => {
  test("redireciona qualquer rota para o login", async ({ page }) => {
    await page.goto("/pacientes");
    await expect(page).toHaveURL(/\/entrar$/);
    await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  });

  test("apresenta o formulário com os campos obrigatórios", async ({
    page,
  }) => {
    await page.goto("/entrar");

    await expect(page.getByLabel("E-mail")).toHaveAttribute("type", "email");
    await expect(page.getByLabel("Senha", { exact: true })).toHaveAttribute(
      "type",
      "password",
    );
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
    await expect(
      page.getByRole("link", { name: "Esqueci minha senha" }),
    ).toBeVisible();
  });

  test("o olho revela e esconde a senha", async ({ page }) => {
    await page.goto("/entrar");
    const password = page.getByLabel("Senha", { exact: true });
    await password.fill("segredo123");

    await page.getByRole("button", { name: "Mostrar senha" }).click();
    await expect(password).toHaveAttribute("type", "text");

    await page.getByRole("button", { name: "Ocultar senha" }).click();
    await expect(password).toHaveAttribute("type", "password");
  });

  test("chega na recuperação de senha pelo login", async ({ page }) => {
    await page.goto("/entrar");
    await page.getByRole("link", { name: "Esqueci minha senha" }).click();
    await expect(page).toHaveURL(/\/recuperar-senha$/);
    await expect(
      page.getByRole("heading", { name: "Recuperar senha" }),
    ).toBeVisible();
  });

  test("alvos de toque respeitam o piso de 44px", async ({ page }) => {
    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto("/entrar");

    const submit = page.getByRole("button", { name: "Entrar" });
    const box = await submit.boundingBox();
    expect(box?.height ?? 0).toBeGreaterThanOrEqual(44);
  });
});
