import { DateTime } from "luxon";
import { config } from "../config";
import { AppException } from "../exceptions/app.exception";

/**
 * Toda a aritmética de calendário da clínica.
 *
 * O banco guarda UTC (`timestamptz`); a recepção pensa em "quinta-feira,
 * 11 de setembro, 09:30". A tradução acontece só aqui — se ficar espalhada,
 * a agenda "vira" na troca do horário de verão e ninguém descobre em setembro.
 */
export const ClinicTime = {
  zone: config.timezone,

  now(): DateTime {
    return DateTime.now().setZone(this.zone);
  },

  /** "2026-09-11" → intervalo [00:00, 24:00) daquele dia, em UTC. */
  dayRange(date: string): { start: Date; end: Date } {
    const day = DateTime.fromISO(date, { zone: this.zone });
    if (!day.isValid) {
      throw new AppException({
        code: "VALIDATION_FAILED",
        message: `Data inválida: ${date}. Use o formato AAAA-MM-DD.`,
      });
    }
    return {
      start: day.startOf("day").toUTC().toJSDate(),
      end: day.startOf("day").plus({ days: 1 }).toUTC().toJSDate(),
    };
  },

  /** Combina "2026-09-12" + "14:30" no instante UTC correspondente. */
  combine(date: string, time: string): Date {
    const parsed = DateTime.fromISO(`${date}T${time}`, { zone: this.zone });
    if (!parsed.isValid) {
      throw new AppException({
        code: "VALIDATION_FAILED",
        message: `Data ou hora inválida: ${date} ${time}.`,
      });
    }
    return parsed.toUTC().toJSDate();
  },

  /** 0 = domingo … 6 = sábado, como em `ScheduleWindow.weekday`. */
  weekdayOf(instant: Date): number {
    return DateTime.fromJSDate(instant).setZone(this.zone).weekday % 7;
  },

  /** "09:30" no fuso da clínica, para comparar com as janelas de atendimento. */
  timeOf(instant: Date): string {
    return DateTime.fromJSDate(instant).setZone(this.zone).toFormat("HH:mm");
  },

  isoDateOf(instant: Date): string {
    return DateTime.fromJSDate(instant).setZone(this.zone).toISODate() ?? "";
  },

  /** Intervalo fechado de dias [from, to], com teto para não varrer a tabela inteira. */
  rangeOf(
    from: string,
    to: string,
    maxDays: number,
  ): { start: Date; end: Date } {
    const start = DateTime.fromISO(from, { zone: this.zone }).startOf("day");
    const end = DateTime.fromISO(to, { zone: this.zone })
      .startOf("day")
      .plus({ days: 1 });
    if (!start.isValid || !end.isValid || end <= start) {
      throw new AppException({
        code: "VALIDATION_FAILED",
        message: "Intervalo de datas inválido.",
      });
    }
    if (end.diff(start, "days").days > maxDays) {
      throw new AppException({
        code: "DATE_RANGE_TOO_LARGE",
        message: `Intervalo máximo de ${maxDays} dias por consulta à agenda.`,
      });
    }
    return { start: start.toUTC().toJSDate(), end: end.toUTC().toJSDate() };
  },

  /** Minutos inteiros entre dois instantes, nunca negativo. */
  minutesBetween(from: Date, to: Date): number {
    return Math.max(0, Math.floor((to.getTime() - from.getTime()) / 60_000));
  },

  /** Idade em anos completos a partir da data de nascimento. */
  ageOf(birthDate: Date | null): number | null {
    if (!birthDate) return null;
    const years = DateTime.now()
      .setZone(this.zone)
      .diff(DateTime.fromJSDate(birthDate).setZone(this.zone), "years").years;
    return Math.floor(years);
  },
};

/** "HH:mm" → minutos desde a meia-noite. Usado nas janelas de atendimento. */
export function minutesOfDay(time: string): number {
  const [hours, minutes] = time.split(":");
  return Number(hours ?? 0) * 60 + Number(minutes ?? 0);
}
