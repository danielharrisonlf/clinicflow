import { AppointmentStatus, TaskType } from "@prisma/client";
import { config } from "../../common/config";
import type { ClockService } from "../../shared/clock/clock.service";
import type { PrismaService } from "../../shared/prisma/prisma.service";
import type { StorageService } from "../../shared/storage/storage.service";
import type { NotificationsService } from "../notifications/notifications.service";
import type { SettingsService } from "../settings/settings.service";
import type { TasksService } from "../tasks/tasks.service";
import { JobsService } from "./jobs.service";

const originalEnabled = config.jobs.enabled;

afterEach(() => {
  config.jobs.enabled = originalEnabled;
});

it("agenda apenas confirmações automáticas para consultas na janela", async () => {
  config.jobs.enabled = true;
  const now = new Date("2026-10-04T12:00:00.000Z");
  const startsAt = new Date("2026-10-05T12:00:00.000Z");
  const findMany = jest.fn().mockResolvedValue([
    {
      id: "appointment-1",
      patientId: "patient-1",
      startsAt,
      patient: { id: "patient-1", name: "Maria" },
    },
  ]);
  const createSystemTask = jest.fn().mockResolvedValue(undefined);
  const sendConfirmationRequest = jest.fn().mockResolvedValue(undefined);
  const service = new JobsService(
    { appointment: { findMany } } as unknown as PrismaService,
    {
      get: jest.fn().mockResolvedValue({
        confirmationLeadHours: 48,
        whatsappEnabled: true,
      }),
    } as unknown as SettingsService,
    { createSystemTask } as unknown as TasksService,
    { sendConfirmationRequest } as unknown as NotificationsService,
    {} as StorageService,
    { now: jest.fn().mockReturnValue(now) } as unknown as ClockService,
  );

  await service.generatePendingConfirmations();

  expect(findMany).toHaveBeenCalledWith(
    expect.objectContaining({
      where: {
        status: AppointmentStatus.AGENDADA,
        startsAt: { gte: now, lte: new Date("2026-10-06T12:00:00.000Z") },
      },
    }),
  );
  expect(createSystemTask).toHaveBeenCalledWith(
    expect.objectContaining({
      appointmentId: "appointment-1",
      type: TaskType.CONFIRMACAO_PENDENTE,
    }),
  );
  expect(sendConfirmationRequest).toHaveBeenCalledWith("appointment-1", {
    automatic: true,
  });
});
