import { describe, expect, it } from "vitest";
import {
  addDays,
  ageFrom,
  formatDate,
  formatDayShort,
  formatTime,
  toDateKey,
  todayISO,
} from "../labels";

/**
 * As datas seguem o fuso da clínica (America/Sao_Paulo, UTC-3), não o do
 * navegador — é o mesmo fuso em que o backend calcula "hoje" e "09:30".
 */
describe("datas no fuso da clínica", () => {
  it("mostra a hora local da clínica para um instante UTC", () => {
    expect(formatTime("2026-09-11T12:30:00.000Z")).toBe("09:30");
  });

  it("vira o dia no fuso da clínica, não em UTC", () => {
    // 01:00 UTC do dia 12 ainda é dia 11 em São Paulo.
    expect(toDateKey("2026-09-12T01:00:00.000Z")).toBe("2026-09-11");
  });

  it("não desloca data pura (nascimento) por fuso", () => {
    expect(formatDate("1990-03-01")).toBe("01 mar 1990");
  });

  it("monta o cabeçalho curto do dia", () => {
    expect(formatDayShort("2026-09-11")).toBe("Sex, 11 set");
  });

  it("soma dias atravessando mês e ano sem passar por fuso", () => {
    expect(addDays("2026-12-30", 3)).toBe("2027-01-02");
    expect(addDays("2026-03-01", -1)).toBe("2026-02-28");
  });

  it("devolve hoje no formato YYYY-MM-DD", () => {
    expect(todayISO()).toMatch(/^\d{4}-\d{2}-\d{2}$/);
  });

  it("calcula a idade antes e depois do aniversário", () => {
    const today = todayISO();
    const [year] = today.split("-").map(Number) as [number];
    expect(ageFrom(`${year - 30}-01-01`)).toBe(30);
    expect(ageFrom(null)).toBeNull();
  });
});
