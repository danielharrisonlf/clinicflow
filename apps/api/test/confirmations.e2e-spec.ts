import { INestApplicationContext } from "@nestjs/common";
import { Test } from "@nestjs/testing";
import { NotificationStatus } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { AppModule } from "@/app.module";
import { config } from "@/common/config";
import { NotificationsService } from "@/modules/notifications/notifications.service";
import { PrismaService } from "@/shared/prisma/prisma.service";

// PostgreSQL real: a proteção depende do índice unique, não de um mutex em memória.
describe("Confirmações — persistência e concorrência (e2e)", () => {
  let app: INestApplicationContext;
  let prisma: PrismaService;
  let notifications: NotificationsService;
  let appointmentId: string;
  const originalTransport = config.notifications.transport;

  beforeAll(async () => {
    process.env.JOBS_ENABLED = "false";
    config.notifications.transport = "log";
    app = await Test.createTestingModule({ imports: [AppModule] }).compile();
    await app.init();
    prisma = app.get(PrismaService);
    notifications = app.get(NotificationsService);
    const patient = await prisma.patient.findFirstOrThrow();
    const professional = await prisma.professional.findFirstOrThrow();
    appointmentId = uuidv7();
    await prisma.appointment.create({
      data: {
        id: appointmentId,
        patientId: patient.id,
        professionalId: professional.id,
        startsAt: new Date("2040-10-04T12:00:00.000Z"),
        endsAt: new Date("2040-10-04T12:30:00.000Z"),
      },
    });
  });

  afterAll(async () => {
    config.notifications.transport = originalTransport;
    if (appointmentId && prisma) {
      await prisma.notification.deleteMany({ where: { appointmentId } });
      await prisma.appointment.deleteMany({ where: { id: appointmentId } });
    }
    if (app) await app.close();
  });

  it("persiste uma única simulação para chamadas automáticas concorrentes", async () => {
    await Promise.all([
      notifications.sendConfirmationRequest(appointmentId, { automatic: true }),
      notifications.sendConfirmationRequest(appointmentId, { automatic: true }),
    ]);
    const rows = await prisma.notification.findMany({
      where: { appointmentId },
    });
    expect(rows).toHaveLength(1);
    expect(rows[0]).toMatchObject({
      status: NotificationStatus.SIMULADA,
      sentAt: null,
      error: null,
    });
    expect(rows[0].deduplicationKey).toBe(
      `confirmation:${appointmentId}:2040-10-04T12:00:00.000Z`,
    );
  });

  it("permite dois reenvios manuais sem alterar a reserva automática", async () => {
    await Promise.all([
      notifications.sendConfirmationRequest(appointmentId),
      notifications.sendConfirmationRequest(appointmentId),
    ]);
    expect(
      await prisma.notification.count({
        where: { appointmentId, deduplicationKey: null },
      }),
    ).toBe(2);
    await notifications.sendConfirmationRequest(appointmentId, {
      automatic: true,
    });
    expect(await prisma.notification.count({ where: { appointmentId } })).toBe(
      3,
    );
  });

  it("um horário alterado permite nova confirmação automática", async () => {
    await prisma.appointment.update({
      where: { id: appointmentId },
      data: {
        startsAt: new Date("2040-10-05T12:00:00.000Z"),
        endsAt: new Date("2040-10-05T12:30:00.000Z"),
      },
    });
    await notifications.sendConfirmationRequest(appointmentId, {
      automatic: true,
    });
    const rows = await prisma.notification.findMany({
      where: { appointmentId, deduplicationKey: { not: null } },
    });
    expect(rows).toHaveLength(2);
    expect(rows.map((row) => row.deduplicationKey)).toContain(
      `confirmation:${appointmentId}:2040-10-05T12:00:00.000Z`,
    );
    expect(rows.every((row) => row.sentAt === null)).toBe(true);
  });
});
