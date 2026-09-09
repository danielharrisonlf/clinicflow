import { AppointmentStatus, AppointmentType } from "@prisma/client";
import {
  AppointmentWithRelations,
  toAppointmentListItem,
} from "./appointment.mapper";

/**
 * Os selos "Atrasada 27min" e "Aguardando 18min" são calculados no servidor
 * justamente para o balcão e o painel de TV não divergirem. Se este arquivo
 * quebrar, é porque a tela passou a mostrar um número que ninguém mais confirma.
 */
function buildAppointment(
  overrides: Partial<AppointmentWithRelations>,
): AppointmentWithRelations {
  return {
    id: "appt-1",
    code: 1042,
    patientId: "pat-1",
    professionalId: "prof-1",
    startsAt: new Date("2026-09-11T12:30:00.000Z"),
    endsAt: new Date("2026-09-11T13:00:00.000Z"),
    type: AppointmentType.RETORNO,
    status: AppointmentStatus.AGENDADA,
    room: null,
    notes: null,
    confirmedAt: null,
    checkedInAt: null,
    startedAt: null,
    completedAt: null,
    cancelledAt: null,
    calledAt: null,
    cancelReason: null,
    cancelNote: null,
    rescheduledFromId: null,
    createdById: null,
    createdAt: new Date("2026-09-08T13:11:00.000Z"),
    updatedAt: new Date("2026-09-08T13:11:00.000Z"),
    patient: {
      id: "pat-1",
      name: "Luiza Fernandes Rocha",
      phone: "(11) 98432-1190",
    },
    professional: { id: "prof-1", name: "Dra. Helena Prado" },
    ...overrides,
  } as AppointmentWithRelations;
}

describe("toAppointmentListItem", () => {
  const tolerance = 15;

  it('rotula "Aguardando 18min" a partir do check-in', () => {
    const appointment = buildAppointment({
      status: AppointmentStatus.CHECK_IN,
      checkedInAt: new Date("2026-09-11T12:32:00.000Z"),
    });
    const now = new Date("2026-09-11T12:50:00.000Z");

    const item = toAppointmentListItem(appointment, now, tolerance);

    expect(item.waitingMinutes).toBe(18);
    expect(item.stateLabel).toBe("Aguardando 18min");
    expect(item.derivedState).toBe(AppointmentStatus.CHECK_IN);
  });

  it('deriva "Atrasada 27min" sem tocar no status persistido', () => {
    const appointment = buildAppointment({
      status: AppointmentStatus.CONFIRMADA,
      startsAt: new Date("2026-09-11T12:15:00.000Z"),
    });
    const now = new Date("2026-09-11T12:42:00.000Z");

    const item = toAppointmentListItem(appointment, now, tolerance);

    expect(item.status).toBe(AppointmentStatus.CONFIRMADA);
    expect(item.derivedState).toBe("ATRASADA");
    expect(item.stateLabel).toBe("Atrasada 27min");
  });

  it("respeita a tolerância configurada antes de marcar atraso", () => {
    const appointment = buildAppointment({
      status: AppointmentStatus.CONFIRMADA,
    });
    const now = new Date("2026-09-11T12:40:00.000Z");

    const item = toAppointmentListItem(appointment, now, tolerance);

    expect(item.derivedState).toBe(AppointmentStatus.CONFIRMADA);
    expect(item.lateMinutes).toBeNull();
  });

  it("não marca atraso em consulta já concluída", () => {
    const appointment = buildAppointment({
      status: AppointmentStatus.CONCLUIDA,
      startsAt: new Date("2026-09-11T11:00:00.000Z"),
    });

    const item = toAppointmentListItem(
      appointment,
      new Date("2026-09-11T14:00:00.000Z"),
      tolerance,
    );

    expect(item.derivedState).toBe(AppointmentStatus.CONCLUIDA);
    expect(item.stateLabel).toBe("Concluída");
  });

  it("expõe só as transições válidas para o front acender os botões certos", () => {
    const item = toAppointmentListItem(
      buildAppointment({ status: AppointmentStatus.EM_ATENDIMENTO }),
      new Date("2026-09-11T12:35:00.000Z"),
      tolerance,
    );

    expect(item.allowedTransitions).toEqual([AppointmentStatus.CONCLUIDA]);
  });

  it("calcula a duração a partir do intervalo, não de um campo solto", () => {
    const item = toAppointmentListItem(
      buildAppointment({}),
      new Date("2026-09-11T12:00:00.000Z"),
      tolerance,
    );

    expect(item.durationMinutes).toBe(30);
  });
});
