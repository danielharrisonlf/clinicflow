import { describe, expect, it } from "vitest";
import type { NotificationItem } from "@/lib/api/types";
import { latestByAppointment, noShowRisk } from "../no-show-risk";

const NOW = Date.parse("2026-09-11T12:00:00.000Z");
const HOUR = 3_600_000;
const at = (hours: number) => new Date(NOW + hours * HOUR).toISOString();

function send(input: Partial<NotificationItem>): NotificationItem {
  return {
    id: "n1",
    appointmentId: "a1",
    channel: "WHATSAPP",
    to: "(11) 98432-1190",
    body: "Olá",
    status: "ENVIADA",
    error: null,
    sentAt: null,
    createdAt: at(-1),
    ...input,
  };
}

/** DESIGN.md §Prevenção de faltas: o risco sai do último envio + o relógio. */
describe("risco de falta", () => {
  it("resposta do paciente confirma, a qualquer distância da consulta", () => {
    for (const hours of [-2, 3, 72]) {
      expect(
        noShowRisk({ startsAt: at(hours), lastStatus: "RESPONDIDA", now: NOW }),
      ).toBe("CONFIRMADA");
    }
  });

  it("enviada ou simulada, longe da consulta, é só sem resposta", () => {
    for (const lastStatus of ["ENVIADA", "SIMULADA"] as const) {
      expect(noShowRisk({ startsAt: at(48), lastStatus, now: NOW })).toBe(
        "SEM_RESPOSTA",
      );
    }
  });

  it("sem resposta a menos de 3h da consulta vira crítico", () => {
    expect(
      noShowRisk({ startsAt: at(2.9), lastStatus: "ENVIADA", now: NOW }),
    ).toBe("CRITICO");
    expect(
      noShowRisk({ startsAt: at(3), lastStatus: "ENVIADA", now: NOW }),
    ).toBe("SEM_RESPOSTA");
  });

  it("consulta de hoje com folga ainda é só sem resposta", () => {
    expect(
      noShowRisk({ startsAt: at(5), lastStatus: "SIMULADA", now: NOW }),
    ).toBe("SEM_RESPOSTA");
  });

  it("consulta que já passou do horário sem resposta é crítica", () => {
    expect(
      noShowRisk({ startsAt: at(-1), lastStatus: "SIMULADA", now: NOW }),
    ).toBe("CRITICO");
  });

  it("pendente, falhou ou nenhum envio é crítico mesmo longe da consulta", () => {
    for (const lastStatus of ["PENDENTE", "FALHOU", null, undefined] as const) {
      expect(noShowRisk({ startsAt: at(72), lastStatus, now: NOW })).toBe(
        "CRITICO",
      );
    }
  });
});

describe("último envio por consulta", () => {
  it("fica com o envio mais recente de cada consulta, sem depender da ordem", () => {
    const latest = latestByAppointment([
      send({ id: "old", appointmentId: "a1", createdAt: at(-5) }),
      send({ id: "new", appointmentId: "a1", createdAt: at(-1) }),
      send({ id: "other", appointmentId: "a2", createdAt: at(-3) }),
    ]);
    expect(latest.get("a1")?.id).toBe("new");
    expect(latest.get("a2")?.id).toBe("other");
  });

  it("ignora envios sem consulta", () => {
    const latest = latestByAppointment([send({ appointmentId: null })]);
    expect(latest.size).toBe(0);
  });
});
