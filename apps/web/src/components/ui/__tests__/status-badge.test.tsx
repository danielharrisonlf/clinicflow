import { render, screen } from "@testing-library/react";
import { describe, expect, it } from "vitest";
import { APPOINTMENT_STATUS, type DerivedState } from "@/lib/api/types";
import { StatusBadge } from "../status-badge";

describe("StatusBadge", () => {
  it("usa o rótulo pronto do backend quando ele vem", () => {
    render(<StatusBadge state="CHECK_IN" label="Aguardando 18min" />);
    expect(screen.getByText("Aguardando 18min")).toBeInTheDocument();
  });

  it("cai no rótulo fixo em português quando o backend não manda um", () => {
    render(<StatusBadge state="EM_ATENDIMENTO" />);
    expect(screen.getByText("Em atendimento")).toBeInTheDocument();
  });

  it("cobre todos os estados do enum mais o derivado ATRASADA", () => {
    // Se alguém adicionar um status no Prisma sem mapear aqui, o Record<>
    // reprova no typecheck; este teste garante que nenhum renderiza vazio.
    const states: DerivedState[] = [...APPOINTMENT_STATUS, "ATRASADA"];
    for (const state of states) {
      const { unmount } = render(<StatusBadge state={state} />);
      expect(screen.getByText(/\S/)).toBeInTheDocument();
      unmount();
    }
  });

  it("preenche sólido só o check-in — é o único estado que pede ação imediata", () => {
    const { container: checkIn } = render(<StatusBadge state="CHECK_IN" />);
    expect(checkIn.firstElementChild?.className).toContain(
      "bg-state-espera-weak",
    );

    const { container: agendada } = render(<StatusBadge state="AGENDADA" />);
    expect(agendada.firstElementChild?.className).toContain("bg-transparent");
  });
});
