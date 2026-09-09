import { EventEmitter2 } from "@nestjs/event-emitter";
import { Test, TestingModule } from "@nestjs/testing";
import {
  AppointmentStatus,
  AppointmentType,
  CancelReason,
  Channel,
} from "@prisma/client";
import { AppException } from "../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { AuditService } from "../../shared/audit/audit.service";
import { ClockService } from "../../shared/clock/clock.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import { SettingsService } from "../settings/settings.service";
import { AppointmentsService } from "./appointments.service";
import { AvailabilityService } from "./availability.service";
import { CancelAppointmentService } from "./services/cancel-appointment.service";
import { CheckAvailabilityService } from "./services/check-availability.service";
import { CheckInAppointmentService } from "./services/check-in-appointment.service";
import { CompleteAppointmentService } from "./services/complete-appointment.service";
import { ConfirmAppointmentService } from "./services/confirm-appointment.service";
import { CreateAppointmentService } from "./services/create-appointment.service";
import { FindAllAppointmentsService } from "./services/find-all-appointments.service";
import { FindAppointmentByIdService } from "./services/find-appointment-by-id.service";
import { GetCalendarService } from "./services/get-calendar.service";
import { ListAppointmentEventsService } from "./services/list-appointment-events.service";
import { ListPatientAppointmentsService } from "./services/list-patient-appointments.service";
import { ListSlotsService } from "./services/list-slots.service";
import { RescheduleAppointmentService } from "./services/reschedule-appointment.service";
import { StartAppointmentService } from "./services/start-appointment.service";
import { TransitionAppointmentService } from "./services/transition-appointment.service";
import { UndoAppointmentService } from "./services/undo-appointment.service";
import { UpdateAppointmentService } from "./services/update-appointment.service";

const ACTOR: AuthenticatedUser = {
  id: "user-1",
  email: "renata@clinicaviver.com.br",
  name: "Renata Souza",
  role: "RECEPCAO",
};

const NOW = new Date("2026-09-11T12:50:00.000Z");

describe("AppointmentsService", () => {
  let service: AppointmentsService;
  let prisma: jest.Mocked<Record<string, never>> & Record<string, never>;
  let prismaMock: ReturnType<typeof buildPrismaMock>;
  let availability: {
    findOverlapping: jest.Mock;
    isWithinSchedule: jest.Mock;
    getProfessionalOrThrow: jest.Mock;
    resolveDuration: jest.Mock;
  };

  function buildPrismaMock() {
    return {
      appointment: {
        findUnique: jest.fn(),
        findFirst: jest.fn(),
        findMany: jest.fn(),
        count: jest.fn().mockResolvedValue(0),
        create: jest.fn(),
        update: jest.fn(),
      },
      appointmentEvent: { create: jest.fn(), findFirst: jest.fn() },
      patient: { findFirst: jest.fn() },
      document: { count: jest.fn().mockResolvedValue(0) },
      // A transação recebe um callback; o mock executa contra o próprio mock,
      // o que basta para verificar quais escritas aconteceram juntas.
      $transaction: jest.fn(),
    };
  }

  beforeEach(async () => {
    prismaMock = buildPrismaMock();
    prismaMock.$transaction.mockImplementation(async (arg: unknown) =>
      typeof arg === "function"
        ? (arg as (tx: unknown) => Promise<unknown>)(prismaMock)
        : arg,
    );

    availability = {
      findOverlapping: jest.fn().mockResolvedValue([]),
      isWithinSchedule: jest.fn().mockResolvedValue(true),
      getProfessionalOrThrow: jest.fn().mockResolvedValue({
        id: "prof-1",
        name: "Dra. Helena Prado",
        defaultDurationMinutes: 30,
      }),
      resolveDuration: jest.fn().mockResolvedValue(30),
    };

    const module: TestingModule = await Test.createTestingModule({
      providers: [
        AppointmentsService,
        CreateAppointmentService,
        FindAllAppointmentsService,
        FindAppointmentByIdService,
        UpdateAppointmentService,
        ConfirmAppointmentService,
        CheckInAppointmentService,
        StartAppointmentService,
        CompleteAppointmentService,
        CancelAppointmentService,
        RescheduleAppointmentService,
        UndoAppointmentService,
        GetCalendarService,
        ListAppointmentEventsService,
        ListPatientAppointmentsService,
        CheckAvailabilityService,
        ListSlotsService,
        TransitionAppointmentService,
        { provide: PrismaService, useValue: prismaMock },
        { provide: AvailabilityService, useValue: availability },
        {
          provide: SettingsService,
          useValue: {
            get: jest.fn().mockResolvedValue({ lateToleranceMinutes: 15 }),
          },
        },
        {
          provide: ClockService,
          useValue: { now: () => NOW, nowMs: () => NOW.getTime() },
        },
        { provide: AuditService, useValue: { record: jest.fn() } },
        { provide: EventEmitter2, useValue: { emit: jest.fn() } },
      ],
    }).compile();

    service = module.get(AppointmentsService);
    prisma = prismaMock as never;
    void prisma;
  });

  describe("create", () => {
    const dto = {
      patientId: "pat-1",
      professionalId: "prof-1",
      date: "2026-09-12",
      time: "14:30",
      type: AppointmentType.RETORNO,
    };

    beforeEach(() => {
      prismaMock.patient.findFirst.mockResolvedValue({
        id: "pat-1",
        name: "Marcos",
      });
      prismaMock.appointment.findUnique.mockResolvedValue(buildStored());
    });

    it("recusa o agendamento em horário ocupado com APPOINTMENT_SLOT_CONFLICT", async () => {
      // Arrange
      availability.findOverlapping.mockResolvedValue([
        {
          id: "appt-existente",
          startsAt: new Date("2026-09-12T17:30:00.000Z"),
          endsAt: new Date("2026-09-12T18:00:00.000Z"),
          patient: { name: "Bruno Almeida" },
        },
      ]);

      // Act
      const promise = service.create(dto, ACTOR);

      // Assert
      await expect(promise).rejects.toMatchObject({
        code: "APPOINTMENT_SLOT_CONFLICT",
        details: { patientName: "Bruno Almeida", durationMinutes: 30 },
      });
      expect(prismaMock.appointment.create).not.toHaveBeenCalled();
    });

    it("permite o encaixe explícito e registra o motivo na auditoria", async () => {
      // Arrange
      availability.findOverlapping.mockResolvedValue([{ id: "outro" }]);

      // Act
      await service.create({ ...dto, allowOverbooking: true }, ACTOR);

      // Assert
      expect(prismaMock.appointment.create).toHaveBeenCalled();
      expect(prismaMock.appointmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            reason: "Encaixe autorizado pela recepção",
          }),
        }),
      );
    });

    it("recusa horário fora da grade configurada do profissional", async () => {
      availability.isWithinSchedule.mockResolvedValue(false);

      await expect(service.create(dto, ACTOR)).rejects.toMatchObject({
        code: "PROFESSIONAL_OUTSIDE_SCHEDULE",
      });
    });

    it("grava a consulta e o evento de auditoria na mesma transação", async () => {
      await service.create(dto, ACTOR);

      expect(prismaMock.$transaction).toHaveBeenCalledTimes(1);
      expect(prismaMock.appointment.create).toHaveBeenCalled();
      expect(prismaMock.appointmentEvent.create).toHaveBeenCalled();
    });
  });

  describe("cancel", () => {
    it("recusa cancelar uma consulta já concluída", async () => {
      // Arrange
      prismaMock.appointment.findUnique.mockResolvedValue(
        buildStored({ status: AppointmentStatus.CONCLUIDA }),
      );

      // Act & Assert
      await expect(
        service.cancel(
          "appt-1",
          { reasonCode: CancelReason.PACIENTE_DESMARCOU },
          ACTOR,
        ),
      ).rejects.toBeInstanceOf(AppException);
    });

    it("registra o motivo legível na trilha de auditoria", async () => {
      // Arrange
      prismaMock.appointment.findUnique.mockResolvedValue(buildStored());

      // Act
      await service.cancel(
        "appt-1",
        {
          reasonCode: CancelReason.NO_SHOW,
          note: "Paciente não atendeu o telefone.",
        },
        ACTOR,
      );

      // Assert
      expect(prismaMock.appointmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            toStatus: AppointmentStatus.CANCELADA,
            reason:
              "Não compareceu (no-show) — Paciente não atendeu o telefone.",
            channel: Channel.WEB,
          }),
        }),
      );
    });
  });

  describe("undoLastTransition", () => {
    beforeEach(() => {
      prismaMock.appointment.findUnique.mockResolvedValue(
        buildStored({ status: AppointmentStatus.CHECK_IN }),
      );
    });

    it("desfaz dentro da janela e grava um evento de compensação", async () => {
      // Arrange — transição feita há 10 segundos pelo próprio operador
      prismaMock.appointmentEvent.findFirst.mockResolvedValue({
        id: "evt-1",
        fromStatus: AppointmentStatus.CONFIRMADA,
        toStatus: AppointmentStatus.CHECK_IN,
        actorId: ACTOR.id,
        createdAt: new Date(NOW.getTime() - 10_000),
      });

      // Act
      await service.undoLastTransition("appt-1", ACTOR);

      // Assert — volta o status, limpa o carimbo e deixa rastro
      expect(prismaMock.appointment.update).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({
            status: AppointmentStatus.CONFIRMADA,
            checkedInAt: null,
          }),
        }),
      );
      expect(prismaMock.appointmentEvent.create).toHaveBeenCalledWith(
        expect.objectContaining({
          data: expect.objectContaining({ isCompensation: true }),
        }),
      );
    });

    it("recusa depois de expirada a janela de 30s", async () => {
      prismaMock.appointmentEvent.findFirst.mockResolvedValue({
        id: "evt-1",
        fromStatus: AppointmentStatus.CONFIRMADA,
        toStatus: AppointmentStatus.CHECK_IN,
        actorId: ACTOR.id,
        createdAt: new Date(NOW.getTime() - 120_000),
      });

      await expect(
        service.undoLastTransition("appt-1", ACTOR),
      ).rejects.toMatchObject({
        code: "UNDO_WINDOW_EXPIRED",
      });
    });

    it("recusa desfazer alteração feita por outra pessoa", async () => {
      prismaMock.appointmentEvent.findFirst.mockResolvedValue({
        id: "evt-1",
        fromStatus: AppointmentStatus.CONFIRMADA,
        toStatus: AppointmentStatus.CHECK_IN,
        actorId: "outro-usuario",
        createdAt: new Date(NOW.getTime() - 5_000),
      });

      await expect(
        service.undoLastTransition("appt-1", ACTOR),
      ).rejects.toMatchObject({
        code: "UNDO_NOT_ALLOWED",
      });
    });
  });

  function buildStored(overrides: Record<string, unknown> = {}) {
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
      createdAt: NOW,
      updatedAt: NOW,
      patient: {
        id: "pat-1",
        name: "Luiza Fernandes Rocha",
        phone: "(11) 98432-1190",
      },
      professional: { id: "prof-1", name: "Dra. Helena Prado" },
      ...overrides,
    };
  }
});
