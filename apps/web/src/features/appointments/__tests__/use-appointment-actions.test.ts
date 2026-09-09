import { describe, expect, it } from "vitest";
import type { AppointmentStatus } from "@/lib/api/types";
import { actionsFor } from "../use-appointment-actions";

/**
 * O front nunca infere a máquina de estados: ele obedece `allowedTransitions`.
 * Estes testes travam essa obediência — se alguém acender um botão que o
 * backend não permite, quebra aqui e não em produção.
 */
describe("actionsFor", () => {
  it("não oferece nada quando o backend não permite transição", () => {
    expect(actionsFor([])).toEqual([]);
  });

  it("ignora transições que não são ação da recepção", () => {
    // CANCELADA existe no allowedTransitions, mas cancelar tem fluxo próprio
    // (painel lateral com motivo obrigatório), não um botão de uma tecla.
    const actions = actionsFor(["CANCELADA", "REAGENDADA"]);
    expect(actions).toEqual([]);
  });

  it("elege check-in como primária quando a consulta está confirmada", () => {
    const actions = actionsFor(["CHECK_IN", "CANCELADA"]);
    expect(actions).toHaveLength(1);
    expect(actions[0]).toMatchObject({
      target: "CHECK_IN",
      shortLabel: "Check-in",
      primary: true,
    });
  });

  it("numa consulta apenas agendada, a primária é confirmar — não check-in", () => {
    // O paciente ainda não chegou na clínica. Oferecer check-in como botão
    // escuro convida ao erro de registrar presença de quem está em casa.
    const actions = actionsFor(["CONFIRMADA", "CHECK_IN", "CANCELADA"]);
    expect(actions.map((action) => action.target)).toEqual([
      "CONFIRMADA",
      "CHECK_IN",
    ]);
    expect(actions[0].primary).toBe(true);
    expect(actions[1].primary).toBe(false);
  });

  it("promove o próximo passo do ciclo, seja ele qual for", () => {
    expect(actionsFor(["CONCLUIDA"])[0]).toMatchObject({
      target: "CONCLUIDA",
      primary: true,
    });
  });

  it("ordena pelo ciclo de vida, não pela ordem que o backend mandou", () => {
    const shuffled: AppointmentStatus[] = [
      "CONCLUIDA",
      "CONFIRMADA",
      "EM_ATENDIMENTO",
      "CHECK_IN",
    ];
    expect(actionsFor(shuffled).map((action) => action.target)).toEqual([
      "CONFIRMADA",
      "CHECK_IN",
      "EM_ATENDIMENTO",
      "CONCLUIDA",
    ]);
  });
});
