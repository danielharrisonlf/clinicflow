import { AppointmentStatus } from "@prisma/client";
import { AppException } from "../../common/exceptions/app.exception";
import { AppointmentStateMachine } from "./appointment-status.machine";

/**
 * A máquina de estados é a única regra sem exceção do sistema, então é a única
 * coberta exaustivamente: todas as 49 combinações de origem × destino.
 */
describe("AppointmentStateMachine", () => {
  const ALL = Object.values(AppointmentStatus);

  const VALID: Array<[AppointmentStatus, AppointmentStatus]> = [
    ["AGENDADA", "CONFIRMADA"],
    ["AGENDADA", "CHECK_IN"],
    ["AGENDADA", "CANCELADA"],
    ["AGENDADA", "REAGENDADA"],
    ["CONFIRMADA", "CHECK_IN"],
    ["CONFIRMADA", "CANCELADA"],
    ["CONFIRMADA", "REAGENDADA"],
    ["CHECK_IN", "EM_ATENDIMENTO"],
    ["CHECK_IN", "CANCELADA"],
    ["CHECK_IN", "REAGENDADA"],
    ["EM_ATENDIMENTO", "CONCLUIDA"],
  ];

  it.each(VALID)("permite %s → %s", (from, to) => {
    expect(AppointmentStateMachine.can(from, to)).toBe(true);
  });

  it("recusa todas as demais combinações", () => {
    const allowed = new Set(VALID.map(([from, to]) => `${from}>${to}`));

    for (const from of ALL) {
      for (const to of ALL) {
        if (allowed.has(`${from}>${to}`)) continue;
        expect(AppointmentStateMachine.can(from, to)).toBe(false);
      }
    }
  });

  it("nunca deixa uma consulta concluída retroceder para agendada", () => {
    const from = AppointmentStatus.CONCLUIDA;
    const to = AppointmentStatus.AGENDADA;

    expect(() => AppointmentStateMachine.assert(from, to)).toThrow(
      AppException,
    );
  });

  it("informa o código estável INVALID_STATUS_TRANSITION ao recusar", () => {
    let captured: AppException | null = null;

    try {
      AppointmentStateMachine.assert(
        AppointmentStatus.CANCELADA,
        AppointmentStatus.CONFIRMADA,
      );
    } catch (error) {
      captured = error as AppException;
    }

    expect(captured?.code).toBe("INVALID_STATUS_TRANSITION");
    expect(captured?.getStatus()).toBe(422);
  });

  it("trata CONCLUIDA, CANCELADA e REAGENDADA como terminais", () => {
    expect(
      AppointmentStateMachine.isTerminal(AppointmentStatus.CONCLUIDA),
    ).toBe(true);
    expect(
      AppointmentStateMachine.isTerminal(AppointmentStatus.CANCELADA),
    ).toBe(true);
    expect(
      AppointmentStateMachine.isTerminal(AppointmentStatus.REAGENDADA),
    ).toBe(true);
    expect(AppointmentStateMachine.isTerminal(AppointmentStatus.AGENDADA)).toBe(
      false,
    );
  });

  it("devolve as transições permitidas sem expor o mapa interno", () => {
    const allowed = AppointmentStateMachine.allowedFrom(
      AppointmentStatus.AGENDADA,
    );

    allowed.push(AppointmentStatus.CONCLUIDA);

    expect(
      AppointmentStateMachine.can(
        AppointmentStatus.AGENDADA,
        AppointmentStatus.CONCLUIDA,
      ),
    ).toBe(false);
  });
});
