import { fireEvent, render, screen } from "@testing-library/react";
import { MemoryRouter } from "react-router";
import { describe, expect, it, vi } from "vitest";
import { StatTile } from "../surface";

describe("StatTile", () => {
  it("em repouso não é controle", () => {
    render(<StatTile label="Espera média" value="16" />);
    expect(screen.queryByRole("button")).toBeNull();
    expect(screen.queryByRole("link")).toBeNull();
  });

  it("com onClick vira botão que aplica o atalho", () => {
    const onClick = vi.fn();
    render(<StatTile label="Atrasadas" value={2} onClick={onClick} />);
    fireEvent.click(screen.getByRole("button", { name: /Atrasadas/ }));
    expect(onClick).toHaveBeenCalledTimes(1);
  });

  it("com to vira link de verdade (abre em nova aba)", () => {
    render(
      <MemoryRouter>
        <StatTile label="Aguardando" value={3} to="/sala-de-espera" />
      </MemoryRouter>,
    );
    expect(screen.getByRole("link", { name: /Aguardando/ })).toHaveAttribute(
      "href",
      "/sala-de-espera",
    );
  });

  it("o dot pulsa só quando pedido e pode ter cor própria", () => {
    const { container } = render(
      <StatTile
        label="Em atendimento"
        value={1}
        dot="pulse"
        dotTone="atendimento"
      />,
    );
    const dot = container.querySelector("[data-pulse]");
    expect(dot).not.toBeNull();
    expect(dot).toHaveClass("text-state-atendimento");
  });
});
