import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { Button } from "../button";

describe("Button", () => {
  /**
   * Regressão: o tailwind-merge não conhecia a escala do projeto, tratava
   * `text-card` (tamanho) e `text-ink-onaccent` (cor) como o mesmo grupo e
   * descartava a cor. Todo botão primário ficava com texto quase preto sobre
   * o acento escuro. A correção vive em `lib/utils.ts`.
   */
  it("mantém a cor do texto junto com o tamanho no primário", () => {
    render(<Button size="lg">Entrar</Button>);
    const className = screen.getByRole("button").className;
    expect(className).toContain("text-ink-onaccent");
    expect(className).toContain("text-card");
  });

  it("mantém a cor do texto no destrutivo", () => {
    render(
      <Button variant="destructive" size="sm">
        Cancelar consulta
      </Button>,
    );
    const className = screen.getByRole("button").className;
    expect(className).toContain("text-ink-onaccent");
    expect(className).toContain("text-micro");
  });

  it("deixa o className do chamador sobrescrever a cor", () => {
    render(<Button className="text-ink-primary">Ação</Button>);
    const className = screen.getByRole("button").className;
    expect(className).toContain("text-ink-primary");
    expect(className).not.toContain("text-ink-onaccent");
  });

  it("desabilita e anuncia enquanto carrega", () => {
    render(<Button loading>Salvar</Button>);
    const button = screen.getByRole("button");
    expect(button).toBeDisabled();
    expect(button).toHaveAttribute("aria-busy", "true");
  });
});
