import { NotificationStatus, Prisma } from "@prisma/client";
import { config } from "../../common/config";
import type { ClockService } from "../../shared/clock/clock.service";
import type { HttpClientService } from "../../shared/http-client/http-client.service";
import type { PrismaService } from "../../shared/prisma/prisma.service";
import type { SettingsService } from "../settings/settings.service";
import { NotificationsService } from "./notifications.service";

const originalTransport = config.notifications.transport;
const originalBaseUrl = config.notifications.whatsappBaseUrl;
const sentAt = new Date("2026-10-04T12:00:00.000Z");

function setup() {
  const appointment = {
    id: "appointment-1",
    startsAt: new Date("2026-10-05T12:00:00.000Z"),
    patient: { name: "Maria Silva", phone: "11999999999" },
    professional: { name: "Dra. Ana" },
  };
  const rows = new Map<string, Record<string, unknown>>();
  const keys = new Set<string>();
  const create = jest.fn(
    async ({ data }: { data: Record<string, unknown> }) => {
      const key = data.deduplicationKey as string | null;
      if (key && keys.has(key)) {
        throw new Prisma.PrismaClientKnownRequestError("Duplicate key", {
          code: "P2002",
          clientVersion: "6.19.3",
          meta: { target: ["deduplication_key"] },
        });
      }
      if (key) keys.add(key);
      rows.set(data.id as string, {
        ...data,
        status: NotificationStatus.PENDENTE,
      });
      return { id: data.id };
    },
  );
  const update = jest.fn(
    async ({
      where,
      data,
    }: {
      where: { id: string };
      data: Record<string, unknown>;
    }) => {
      const row = rows.get(where.id);
      if (!row) throw new Error("Missing notification");
      Object.assign(row, data);
      return row;
    },
  );
  const request = jest.fn().mockResolvedValue({ id: "provider-1" });
  const prisma = {
    appointment: { findUnique: jest.fn().mockResolvedValue(appointment) },
    notification: { create, update },
  } as unknown as PrismaService;
  const settings = {
    get: jest.fn().mockResolvedValue({
      whatsappTemplate:
        "Olá {{paciente}}, {{profissional}} em {{data}} às {{hora}}",
    }),
  } as unknown as SettingsService;
  const clock = {
    now: jest.fn().mockReturnValue(sentAt),
  } as unknown as ClockService;
  const http = { request } as unknown as HttpClientService;
  return {
    service: new NotificationsService(prisma, settings, http, clock),
    appointment,
    rows,
    create,
    request,
  };
}

afterEach(() => {
  config.notifications.transport = originalTransport;
  config.notifications.whatsappBaseUrl = originalBaseUrl;
});

describe("NotificationsService confirmation dispatch", () => {
  it("registra transporte log como SIMULADA, sem data de envio", async () => {
    config.notifications.transport = "log";
    const { service, rows, request } = setup();

    await service.sendConfirmationRequest("appointment-1");

    expect([...rows.values()]).toMatchObject([
      { status: NotificationStatus.SIMULADA },
    ]);
    expect([...rows.values()][0]?.sentAt).toBeUndefined();
    expect(request).not.toHaveBeenCalled();
  });

  it("marca ENVIADA somente após aceite HTTP, sem afirmar entrega", async () => {
    config.notifications.transport = "http";
    config.notifications.whatsappBaseUrl = "https://provider.example";
    const { service, rows, request } = setup();

    await service.sendConfirmationRequest("appointment-1");

    expect(request).toHaveBeenCalledWith(
      expect.objectContaining({
        url: "https://provider.example/messages",
        method: "POST",
        retries: 0,
      }),
    );
    expect([...rows.values()]).toMatchObject([
      {
        status: NotificationStatus.ENVIADA,
        sentAt,
      },
    ]);
  });

  it("registra falha HTTP e não marca envio", async () => {
    config.notifications.transport = "http";
    config.notifications.whatsappBaseUrl = "https://provider.example";
    const { service, rows, request } = setup();
    request.mockRejectedValueOnce(new Error("provider unavailable"));

    await service.sendConfirmationRequest("appointment-1");

    expect([...rows.values()]).toMatchObject([
      {
        status: NotificationStatus.FALHOU,
        error: "Error: provider unavailable",
      },
    ]);
    expect([...rows.values()][0]?.sentAt).toBeUndefined();
  });

  it("registra erro de configuração quando HTTP não tem base URL", async () => {
    config.notifications.transport = "http";
    config.notifications.whatsappBaseUrl = "";
    const { service, rows, request } = setup();

    await service.sendConfirmationRequest("appointment-1");

    expect(request).not.toHaveBeenCalled();
    expect([...rows.values()]).toMatchObject([
      {
        status: NotificationStatus.FALHOU,
        error: expect.stringContaining("WHATSAPP_BASE_URL"),
      },
    ]);
  });

  it("reserva uma confirmação automática por consulta e horário mesmo sob concorrência", async () => {
    config.notifications.transport = "log";
    const { service, appointment, rows, create } = setup();

    await Promise.all([
      service.sendConfirmationRequest(appointment.id, { automatic: true }),
      service.sendConfirmationRequest(appointment.id, { automatic: true }),
    ]);

    expect(rows.size).toBe(1);
    expect(create.mock.calls[0]?.[0].data.deduplicationKey).toBe(
      `confirmation:${appointment.id}:${appointment.startsAt.toISOString()}`,
    );

    appointment.startsAt = new Date("2026-10-06T12:00:00.000Z");
    await service.sendConfirmationRequest(appointment.id, { automatic: true });
    expect(rows.size).toBe(2);

    await service.sendConfirmationRequest(appointment.id);
    await service.sendConfirmationRequest(appointment.id);
    expect(rows.size).toBe(4);
    expect(
      create.mock.calls.slice(-2).map(([args]) => args.data.deduplicationKey),
    ).toEqual([null, null]);
  });
});
