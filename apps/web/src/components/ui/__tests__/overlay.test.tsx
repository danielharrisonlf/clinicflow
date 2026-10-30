import { fireEvent, render, screen } from "@testing-library/react";
import { useState } from "react";
import { describe, expect, it, vi } from "vitest";
import { Field } from "../field";
import { Overlay } from "../overlay";
import { Pagination } from "../pagination";
import { Tabs } from "../segmented";

function Harness({
  onClose = () => {},
  initialFocus,
}: {
  onClose?: () => void;
  initialFocus?: "field" | "container";
}) {
  const [open, setOpen] = useState(false);
  return (
    <div>
      <button type="button" onClick={() => setOpen(true)}>
        Reagendar
      </button>
      <Overlay
        open={open}
        title="Reagendar consulta"
        onClose={() => {
          onClose();
          setOpen(false);
        }}
        variant="sheet"
        initialFocus={initialFocus}
      >
        <Field label="Motivo" />
      </Overlay>
    </div>
  );
}

describe("Overlay", () => {
  it("mantém Tab e Shift+Tab dentro da folha quando o foco inicial é o painel", () => {
    const visible = vi
      .spyOn(HTMLElement.prototype, "offsetParent", "get")
      .mockReturnValue(document.body);
    try {
      render(<Harness initialFocus="container" />);
      fireEvent.click(screen.getByRole("button", { name: "Reagendar" }));
      const dialog = screen.getByRole("dialog");
      expect(dialog).toHaveFocus();
      fireEvent.keyDown(document, { key: "Tab", shiftKey: true });
      expect(screen.getByLabelText("Motivo")).toHaveFocus();
      dialog.focus();
      fireEvent.keyDown(document, { key: "Tab" });
      expect(
        screen.getAllByRole("button", { name: "Fechar" }).at(-1),
      ).toHaveFocus();
    } finally {
      visible.mockRestore();
    }
  });
  it("foca o primeiro campo, não o botão de fechar", () => {
    render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Reagendar" }));
    expect(screen.getByLabelText("Motivo")).toHaveFocus();
  });

  it("deixa o fundo inerte enquanto aberto", () => {
    const { container } = render(<Harness />);
    fireEvent.click(screen.getByRole("button", { name: "Reagendar" }));
    // O container do render é filho do body e fica atrás da sobreposição.
    expect((container as HTMLElement).inert).toBe(true);
  });

  it("fecha com Esc e devolve o foco para quem abriu", () => {
    const onClose = vi.fn();
    render(<Harness onClose={onClose} />);
    const trigger = screen.getByRole("button", { name: "Reagendar" });
    trigger.focus();
    fireEvent.click(trigger);
    fireEvent.keyDown(document, { key: "Escape" });
    expect(onClose).toHaveBeenCalledTimes(1);
    expect(screen.queryByRole("dialog")).toBeNull();
    expect(trigger).toHaveFocus();
  });
});

describe("Tabs", () => {
  it("troca de aba com as setas (roving tabindex)", () => {
    function TabsHarness() {
      const [value, setValue] = useState<"a" | "b">("a");
      return (
        <Tabs
          label="Histórico"
          idPrefix="t"
          value={value}
          onChange={setValue}
          items={[
            { value: "a", label: "Consultas" },
            { value: "b", label: "Documentos" },
          ]}
        />
      );
    }
    render(<TabsHarness />);
    const first = screen.getByRole("tab", { name: "Consultas" });
    first.focus();
    fireEvent.keyDown(first, { key: "ArrowRight" });
    const second = screen.getByRole("tab", { name: "Documentos" });
    expect(second).toHaveAttribute("aria-selected", "true");
    expect(second).toHaveFocus();
    expect(first).toHaveAttribute("tabindex", "-1");
  });
});

describe("Pagination", () => {
  it("existe em qualquer largura e desabilita as pontas", () => {
    // Regressão: o rodapé tinha `hidden md:flex` e o celular nunca saía da página 1.
    render(
      <Pagination
        unit="pacientes"
        onChange={() => {}}
        meta={{
          page: 1,
          limit: 15,
          itemCount: 40,
          pageCount: 3,
          hasPreviousPage: false,
          hasNextPage: true,
        }}
      />,
    );
    const nav = screen.getByRole("navigation", {
      name: "Paginação de pacientes",
    });
    expect(nav.className).not.toContain("hidden");
    expect(
      screen.getByRole("button", { name: "Página anterior" }),
    ).toBeDisabled();
    expect(
      screen.getByRole("button", { name: "Próxima página" }),
    ).toBeEnabled();
  });
});
