import { fireEvent, render, screen } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { Menu, MenuItem } from "../menu";

function Harness({ onSelect = () => {} }: { onSelect?: () => void }) {
  return (
    <Menu
      label="Ações da consulta"
      trigger={(props) => (
        <button type="button" {...props}>
          Mais ações
        </button>
      )}
    >
      <MenuItem onSelect={onSelect}>Reagendar</MenuItem>
      <MenuItem onSelect={onSelect} disabled>
        Indisponível
      </MenuItem>
      <MenuItem onSelect={onSelect}>Cancelar</MenuItem>
    </Menu>
  );
}

describe("Menu", () => {
  it("abre pela seta para cima no último item e ignora ações desabilitadas", () => {
    render(<Harness />);
    fireEvent.keyDown(screen.getByRole("button", { name: "Mais ações" }), {
      key: "ArrowUp",
    });
    expect(screen.getByRole("menuitem", { name: "Cancelar" })).toHaveFocus();
    fireEvent.keyDown(document.activeElement as HTMLElement, {
      key: "ArrowUp",
    });
    expect(screen.getByRole("menuitem", { name: "Reagendar" })).toHaveFocus();
  });

  it("Esc fecha somente o menu e restaura o foco do gatilho", () => {
    render(<Harness />);
    const trigger = screen.getByRole("button", { name: "Mais ações" });
    fireEvent.click(trigger);
    fireEvent.keyDown(screen.getByRole("menu"), { key: "Escape" });
    expect(screen.queryByRole("menu")).toBeNull();
    expect(trigger).toHaveFocus();
  });

  it("seleciona uma ação uma vez e fecha o menu", () => {
    const onSelect = vi.fn();
    render(<Harness onSelect={onSelect} />);
    fireEvent.click(screen.getByRole("button", { name: "Mais ações" }));
    fireEvent.click(screen.getByRole("menuitem", { name: "Reagendar" }));
    expect(onSelect).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("menu")).toBeNull();
  });
});
