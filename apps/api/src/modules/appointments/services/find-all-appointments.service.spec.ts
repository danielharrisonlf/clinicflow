import { AppointmentStatus } from "@prisma/client";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import type { ClockService } from "../../../shared/clock/clock.service";
import type { PrismaService } from "../../../shared/prisma/prisma.service";
import type { SettingsService } from "../../settings/settings.service";
import { ListAppointmentsQueryRequest } from "../requests/list-appointments.request";
import { FindAllAppointmentsService } from "./find-all-appointments.service";

const now = new Date("2026-09-11T12:00:00.000Z");

function setup() {
  const findMany = jest.fn().mockResolvedValue([]);
  const count = jest.fn().mockResolvedValue(0);
  const prisma = {
    appointment: { findMany, count },
  } as unknown as PrismaService;
  const settings = {
    get: jest.fn().mockResolvedValue({ lateToleranceMinutes: 15 }),
  } as unknown as SettingsService;
  const clock = {
    now: jest.fn().mockReturnValue(now),
  } as unknown as ClockService;
  return {
    service: new FindAllAppointmentsService(prisma, settings, clock),
    findMany,
    count,
  };
}

function lateQuery(filters: Partial<ListAppointmentsQueryRequest>) {
  return Object.assign(new ListAppointmentsQueryRequest(), {
    derivedState: "ATRASADA" as const,
    ...filters,
  });
}

describe("FindAllAppointmentsService ATRASADA", () => {
  it("limita o intervalo encerrado ontem ao seu fim, inclusive quando agora é hoje", async () => {
    const { service, findMany, count } = setup();
    await service.execute(lateQuery({ from: "2026-09-09", to: "2026-09-10" }));

    const { start } = ClinicTime.dayRange("2026-09-09");
    const { end } = ClinicTime.dayRange("2026-09-10");
    const expected = { gte: start, lt: end };
    expect(findMany.mock.calls[0][0].where.startsAt).toEqual(expected);
    expect(count.mock.calls[0][0].where.startsAt).toEqual(expected);
  });

  it("usa o relógio para o dia atual e preserva interseção de status", async () => {
    const { service, findMany } = setup();
    await service.execute(
      lateQuery({
        date: "2026-09-11",
        status: [AppointmentStatus.CONFIRMADA, AppointmentStatus.CHECK_IN],
      }),
    );

    const { start } = ClinicTime.dayRange("2026-09-11");
    expect(findMany.mock.calls[0][0].where).toMatchObject({
      startsAt: { gte: start, lt: new Date("2026-09-11T11:45:00.000Z") },
      status: { in: [AppointmentStatus.CONFIRMADA] },
    });
  });

  it("retorna página vazia para dia futuro sem consultar a tabela", async () => {
    const { service, findMany, count } = setup();
    const page = await service.execute(lateQuery({ date: "2026-09-12" }));
    expect(page.data).toEqual([]);
    expect(page.meta.itemCount).toBe(0);
    expect(findMany).not.toHaveBeenCalled();
    expect(count).not.toHaveBeenCalled();
  });
});
