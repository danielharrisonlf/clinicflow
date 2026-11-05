import { INestApplication } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "@/app.module";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";
import {
  AppValidationPipe,
  GLOBAL_VALIDATION_OPTIONS,
} from "@/common/pipes/app-validation.pipe";

/**
 * Fluxo ponta a ponta da recepção: entrar → cadastrar → agendar → confirmar →
 * check-in → iniciar → concluir → pendência de retorno gerada.
 *
 * Exige um PostgreSQL de verdade:
 *   docker compose up -d postgres
 *   pnpm --filter api db:migrate && pnpm --filter api db:seed
 */
describe("ClinicFlow — fluxo da recepção (e2e)", () => {
  let app: INestApplication;
  let accessToken: string;
  let patientId: string;
  let professionalId: string;
  let appointmentId: string;

  beforeAll(async () => {
    process.env.JOBS_ENABLED = "false";

    const moduleFixture: TestingModule = await Test.createTestingModule({
      imports: [AppModule],
    }).compile();

    app = moduleFixture.createNestApplication();
    app.setGlobalPrefix("api/v1", { exclude: ["health"] });
    // O mesmo pipe global do main.ts: com um ValidationPipe puro, toda request
    // validada pelo Zod (login incluso) era recusada com 400.
    app.useGlobalPipes(new AppValidationPipe(GLOBAL_VALIDATION_OPTIONS));
    app.useGlobalFilters(new AllExceptionsFilter());
    await app.init();
  });

  afterAll(async () => {
    await app.close();
  });

  it("responde ao liveness sem autenticação", async () => {
    await request(app.getHttpServer()).get("/health").expect(200);
  });

  it("recusa o painel do dia sem token", async () => {
    const response = await request(app.getHttpServer())
      .get("/api/v1/appointments")
      .expect(401);
    expect(response.body.code).toBe("TOKEN_MISSING");
  });

  it("entra com a conta da recepção", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "renata.souza@clinicaviver.com.br",
        password: "clinicflow123",
      })
      .expect(200);

    expect(response.body.user.roleLabel).toBe("Recepção");
    accessToken = response.body.accessToken;
  });

  it("recusa credencial errada sem revelar se o e-mail existe", async () => {
    const response = await request(app.getHttpServer())
      .post("/api/v1/auth/login")
      .send({
        email: "renata.souza@clinicaviver.com.br",
        password: "senha-errada",
      })
      .expect(401);

    expect(response.body.code).toBe("INVALID_CREDENTIALS");
    expect(response.body.message).toBe("E-mail ou senha incorretos.");
  });

  it("lista pacientes com envelope de paginação padronizado", async () => {
    const response = await auth(
      request(app.getHttpServer()).get("/api/v1/patients?limit=12"),
    ).expect(200);

    expect(response.body.meta).toMatchObject({ page: 1, limit: 12 });
    expect(response.body.meta.itemCount).toBeGreaterThan(0);
    expect(response.body.data[0]).toHaveProperty("age");
    expect(response.body.data[0]).toHaveProperty("lastVisitAt");
  });

  it("não devolve item repetido entre a página 1 e a 2 (prova do tie-breaker)", async () => {
    const [first, second] = await Promise.all([
      auth(
        request(app.getHttpServer()).get("/api/v1/patients?limit=5&page=1"),
      ).expect(200),
      auth(
        request(app.getHttpServer()).get("/api/v1/patients?limit=5&page=2"),
      ).expect(200),
    ]);

    const firstIds = first.body.data.map((p: { id: string }) => p.id);
    const secondIds = second.body.data.map((p: { id: string }) => p.id);

    expect(
      firstIds.filter((id: string) => secondIds.includes(id)),
    ).toHaveLength(0);
  });

  it("cadastra um paciente novo", async () => {
    const response = await auth(
      request(app.getHttpServer()).post("/api/v1/patients"),
    )
      .send({
        name: "Paciente E2E",
        phone: "(11) 90000-0000",
        birthDate: "1990-01-01",
      })
      .expect(201);

    patientId = response.body.id;
    expect(response.body.age).toBeGreaterThan(30);
  });

  it("recusa CPF inválido com erro de validação legível", async () => {
    const response = await auth(
      request(app.getHttpServer()).post("/api/v1/patients"),
    )
      .send({
        name: "CPF Ruim",
        phone: "(11) 90000-0001",
        cpf: "111.111.111-11",
      })
      .expect(400);

    expect(response.body.code).toBe("VALIDATION_FAILED");
  });

  it("agenda uma consulta em horário livre", async () => {
    const professionals = await auth(
      request(app.getHttpServer()).get("/api/v1/professionals"),
    ).expect(200);
    professionalId = professionals.body.data[0].id;

    const response = await auth(
      request(app.getHttpServer()).post("/api/v1/appointments"),
    )
      .send({
        patientId,
        professionalId,
        date: nextWeekday(),
        time: "16:00",
        type: "CONSULTA",
      })
      .expect(201);

    appointmentId = response.body.id;
    expect(response.body.status).toBe("AGENDADA");
    expect(response.body.allowedTransitions).toContain("CONFIRMADA");
  });

  it("recusa a segunda consulta no mesmo horário com APPOINTMENT_SLOT_CONFLICT", async () => {
    const response = await auth(
      request(app.getHttpServer()).post("/api/v1/appointments"),
    )
      .send({
        patientId,
        professionalId,
        date: nextWeekday(),
        time: "16:00",
        type: "CONSULTA",
      })
      .expect(409);

    expect(response.body.code).toBe("APPOINTMENT_SLOT_CONFLICT");
    expect(response.body.details).toHaveProperty("patientName");
  });

  it("aceita o encaixe explícito no horário ocupado e marca isOverbooked", async () => {
    const server = app.getHttpServer();
    const body = {
      patientId,
      professionalId,
      date: nextWeekday(),
      time: "16:00",
      type: "CONSULTA",
    };

    // Antes da migração do encaixe, a trava do banco devolvia 500 aqui.
    const encaixe = await auth(request(server).post("/api/v1/appointments"))
      .send({ ...body, allowOverbooking: true })
      .expect(201);
    expect(encaixe.body.isOverbooked).toBe(true);

    const events = await auth(
      request(server).get(`/api/v1/appointments/${encaixe.body.id}/audit`),
    ).expect(200);
    const reasons = events.body.data.map(
      (e: { reason: string | null }) => e.reason,
    );
    expect(reasons).toContain("Encaixe autorizado pela recepção");

    // O encaixe não abre o horário para quem não pediu encaixe.
    await auth(request(server).post("/api/v1/appointments"))
      .send(body)
      .expect(409);

    await auth(
      request(server).patch(`/api/v1/appointments/${encaixe.body.id}/cancel`),
    )
      .send({ reasonCode: "OUTRO", note: "Limpeza do teste e2e" })
      .expect(200);
  });

  it("percorre a máquina de estados até concluir", async () => {
    await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${appointmentId}/confirm`,
      ),
    )
      .expect(200)
      .expect((res) => expect(res.body.status).toBe("CONFIRMADA"));

    await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${appointmentId}/check-in`,
      ),
    )
      .expect(200)
      .expect((res) => expect(res.body.checkedInAt).not.toBeNull());

    await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${appointmentId}/start`,
      ),
    )
      .expect(200)
      .expect((res) => expect(res.body.status).toBe("EM_ATENDIMENTO"));

    await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${appointmentId}/complete`,
      ),
    )
      .expect(200)
      .expect((res) => expect(res.body.status).toBe("CONCLUIDA"));
  });

  it("recusa retroceder uma consulta concluída", async () => {
    const response = await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${appointmentId}/confirm`,
      ),
    ).expect(422);

    expect(response.body.code).toBe("INVALID_STATUS_TRANSITION");
  });

  it("registra toda a trilha na auditoria da consulta", async () => {
    const response = await auth(
      request(app.getHttpServer()).get(
        `/api/v1/appointments/${appointmentId}/audit`,
      ),
    ).expect(200);

    const titles = response.body.data.map(
      (event: { title: string }) => event.title,
    );
    expect(titles).toContain("Atendimento concluído");
    expect(titles).toContain("Check-in registrado");
    expect(response.body.meta).toHaveProperty("hasNextPage");
  });

  it("gera a pendência de retorno ao concluir", async () => {
    // O ouvinte de evento roda fora do ciclo da requisição.
    await new Promise((resolve) => setTimeout(resolve, 300));

    const response = await auth(
      request(app.getHttpServer()).get(`/api/v1/patients/${patientId}/tasks`),
    ).expect(200);

    const types = response.body.data.map((task: { type: string }) => task.type);
    expect(types).toContain("RETORNO_A_AGENDAR");
  });

  it("exige motivo ao cancelar", async () => {
    const target = await auth(
      request(app.getHttpServer()).post("/api/v1/appointments"),
    )
      .send({
        patientId,
        professionalId,
        date: nextWeekday(),
        time: "16:30",
        type: "RETORNO",
      })
      .expect(201);

    await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${target.body.id}/cancel`,
      ),
    )
      .send({})
      .expect(400);

    await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${target.body.id}/cancel`,
      ),
    )
      .send({ reasonCode: "PACIENTE_DESMARCOU" })
      .expect(200);
  });

  it("bloqueia a recepção nas configurações da clínica", async () => {
    const response = await auth(
      request(app.getHttpServer()).patch("/api/v1/settings"),
    )
      .send({ lateToleranceMinutes: 5 })
      .expect(403);

    expect(response.body.code).toBe("FORBIDDEN_ROLE");
  });

  it("entrega os seis contadores do painel do dia", async () => {
    const response = await auth(
      request(app.getHttpServer()).get("/api/v1/dashboard/today"),
    ).expect(200);

    expect(response.body).toHaveProperty("waiting");
    expect(response.body).toHaveProperty("late");
    expect(response.body.dateLabel).toMatch(/de/);
  });

  it("responde a paleta de comandos com ações e pacientes", async () => {
    const server = app.getHttpServer();

    // As ações são filtradas pelo título: um nome de paciente não casa com
    // nenhuma delas, e a paleta mostra só o grupo de pacientes.
    const byPatient = await auth(
      request(server).get("/api/v1/search?q=Luiza"),
    ).expect(200);
    expect(byPatient.body.actions).toEqual([]);
    expect(byPatient.body.patients.length).toBeGreaterThan(0);

    const byAction = await auth(
      request(server).get("/api/v1/search?q=consulta"),
    ).expect(200);
    expect(byAction.body.actions.map((a: { id: string }) => a.id)).toContain(
      "new-appointment",
    );

    // Sem termo, a paleta abre com as ações principais.
    const empty = await auth(request(server).get("/api/v1/search")).expect(200);
    expect(empty.body.actions.length).toBeGreaterThan(0);
  });

  it("recusa arquivo acima do limite antes de qualquer byte subir", async () => {
    const response = await auth(
      request(app.getHttpServer()).post("/api/v1/uploads/sign"),
    )
      .send({
        purpose: "DOCUMENT",
        fileName: "Hemograma completo.pdf",
        mimeType: "application/pdf",
        byteSize: 13_000_000,
      })
      .expect(400);

    expect(response.body.code).toBe("FILE_TOO_LARGE");
    expect(response.body.message).toContain("10 MB");
  });

  it("aceita os filtros das listagens validadas pelo Zod", async () => {
    const server = app.getHttpServer();
    const today = new Date().toISOString().slice(0, 10);

    await auth(
      request(server).get("/api/v1/patients?page=1&limit=15&orderBy=name"),
    ).expect(200);
    await auth(
      request(server).get("/api/v1/patients?hasPendencies=true"),
    ).expect(200);
    await auth(request(server).get("/api/v1/documents?page=1&limit=15")).expect(
      200,
    );
    await auth(
      request(server).get(
        "/api/v1/tasks?page=1&limit=15&status=ABERTA&status=EM_ANDAMENTO",
      ),
    ).expect(200);
    await auth(
      request(server).get(
        `/api/v1/appointments?date=${today}&derivedState=ATRASADA`,
      ),
    ).expect(200);
    await auth(
      request(server).get(
        `/api/v1/notifications?appointmentId=${appointmentId}`,
      ),
    ).expect(200);
  });

  it("filtra a agenda por vários status repetindo o parâmetro", async () => {
    const response = await auth(
      request(app.getHttpServer()).get(
        `/api/v1/appointments?date=${nextWeekday()}&limit=50&status=AGENDADA&status=CONCLUIDA`,
      ),
    ).expect(200);

    const statuses: string[] = response.body.data.map(
      (item: { status: string }) => item.status,
    );
    expect(statuses).toContain("CONCLUIDA");
    for (const status of statuses) {
      expect(["AGENDADA", "CONCLUIDA"]).toContain(status);
    }
  });

  it("pagina a agenda de verdade (página 2 diferente da 1)", async () => {
    const day = nextWeekday();
    const [first, second] = await Promise.all([
      auth(
        request(app.getHttpServer()).get(
          `/api/v1/appointments?date=${day}&page=1&limit=1`,
        ),
      ).expect(200),
      auth(
        request(app.getHttpServer()).get(
          `/api/v1/appointments?date=${day}&page=2&limit=1`,
        ),
      ).expect(200),
    ]);

    expect(first.body.meta.itemCount).toBeGreaterThan(1);
    expect(second.body.data[0].id).not.toBe(first.body.data[0].id);
  });

  it("continua recusando entrada inválida nas listagens", async () => {
    const server = app.getHttpServer();
    await auth(request(server).get("/api/v1/patients?limit=1000")).expect(400);
    await auth(request(server).get("/api/v1/patients?page=0")).expect(400);
    await auth(request(server).get("/api/v1/appointments?status=FOO")).expect(
      400,
    );
    await auth(request(server).get("/api/v1/professionals?foo=1")).expect(400);
    await auth(
      request(server).get("/api/v1/notifications?appointmentId=nope"),
    ).expect(400);
  });

  it("ignora a própria consulta na checagem de disponibilidade", async () => {
    const created = await auth(
      request(app.getHttpServer()).post("/api/v1/appointments"),
    )
      .send({
        patientId,
        professionalId,
        date: nextWeekday(),
        time: "17:00",
        type: "CONSULTA",
      })
      .expect(201);

    const check = (extra: Record<string, string>) =>
      auth(
        request(app.getHttpServer()).post("/api/v1/appointments/availability"),
      )
        .send({ professionalId, date: nextWeekday(), time: "17:00", ...extra })
        .expect(200);

    expect((await check({})).body.conflicts).toHaveLength(1);
    expect(
      (await check({ excludeAppointmentId: created.body.id })).body.conflicts,
    ).toHaveLength(0);
    expect(
      (await check({ ignoreAppointmentId: created.body.id })).body.conflicts,
    ).toHaveLength(0);
  });

  it("desfaz o início do atendimento de uma consulta da semente", async () => {
    // A semente antiga gravava o check-in "das 09:32" mesmo rodando de
    // madrugada; ordenado por createdAt, esse evento futuro passava na frente
    // do "Iniciar" e o desfazer respondia 422 UNDO_NOT_ALLOWED.
    const server = app.getHttpServer();
    const today = new Intl.DateTimeFormat("en-CA", {
      timeZone: "America/Sao_Paulo",
    }).format(new Date());
    const waiting = await auth(
      request(server).get(
        `/api/v1/appointments?date=${today}&status=CHECK_IN&limit=50`,
      ),
    ).expect(200);
    const target = waiting.body.data[0];
    expect(target).toBeDefined();

    await auth(request(server).patch(`/api/v1/appointments/${target.id}/start`))
      .expect(200)
      .expect((res) => expect(res.body.status).toBe("EM_ATENDIMENTO"));

    const undone = await auth(
      request(server).post(`/api/v1/appointments/${target.id}/undo`),
    ).expect(200);
    expect(undone.body.status).toBe("CHECK_IN");
    expect(undone.body.startedAt).toBeNull();
  });

  it("reagenda com encaixe para um horário ocupado", async () => {
    const server = app.getHttpServer();
    const day = nextWeekday();
    const base = { patientId, professionalId, date: day, type: "CONSULTA" };

    const occupied = await auth(request(server).post("/api/v1/appointments"))
      .send({ ...base, time: "11:00" })
      .expect(201);
    const moving = await auth(request(server).post("/api/v1/appointments"))
      .send({ ...base, time: "11:30" })
      .expect(201);
    expect(moving.body.isOverbooked).toBe(false);

    const url = `/api/v1/appointments/${moving.body.id}/reschedule`;
    const conflict = await auth(request(server).patch(url))
      .send({ date: day, time: "11:00", reason: "Teste e2e" })
      .expect(409);
    expect(conflict.body.code).toBe("APPOINTMENT_SLOT_CONFLICT");

    const moved = await auth(request(server).patch(url))
      .send({
        date: day,
        time: "11:00",
        reason: "Teste e2e",
        allowOverbooking: true,
      })
      .expect(200);
    expect(moved.body.isOverbooked).toBe(true);

    for (const id of [occupied.body.id, moved.body.id]) {
      await auth(request(server).patch(`/api/v1/appointments/${id}/cancel`))
        .send({ reasonCode: "OUTRO", note: "Limpeza do teste e2e" })
        .expect(200);
    }
  });

  it("recusa com 409, e não 500, desfazer um cancelamento cujo horário foi ocupado", async () => {
    const server = app.getHttpServer();
    const slot = {
      patientId,
      professionalId,
      date: nextWeekday(),
      time: "12:00",
      type: "CONSULTA",
    };

    const cancelled = await auth(request(server).post("/api/v1/appointments"))
      .send(slot)
      .expect(201);
    await auth(
      request(server).patch(`/api/v1/appointments/${cancelled.body.id}/cancel`),
    )
      .send({ reasonCode: "PACIENTE_DESMARCOU" })
      .expect(200);
    const taker = await auth(request(server).post("/api/v1/appointments"))
      .send(slot)
      .expect(201);

    const undo = await auth(
      request(server).post(`/api/v1/appointments/${cancelled.body.id}/undo`),
    ).expect(409);
    expect(undo.body.code).toBe("APPOINTMENT_SLOT_CONFLICT");
    expect(undo.body.message).toContain("Não dá para desfazer");

    await auth(
      request(server).patch(`/api/v1/appointments/${taker.body.id}/cancel`),
    )
      .send({ reasonCode: "OUTRO", note: "Limpeza do teste e2e" })
      .expect(200);
  });

  it("desfazer um reagendamento cancela a consulta nova", async () => {
    const original = await auth(
      request(app.getHttpServer()).post("/api/v1/appointments"),
    )
      .send({
        patientId,
        professionalId,
        date: nextWeekday(),
        time: "15:00",
        type: "CONSULTA",
      })
      .expect(201);

    const rescheduled = await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${original.body.id}/reschedule`,
      ),
    )
      .send({ date: nextWeekday(), time: "15:30", reason: "Teste e2e" })
      .expect(200);
    expect(rescheduled.body.id).not.toBe(original.body.id);

    const undone = await auth(
      request(app.getHttpServer()).post(
        `/api/v1/appointments/${original.body.id}/undo`,
      ),
    ).expect(200);
    expect(undone.body.status).toBe("AGENDADA");

    const successor = await auth(
      request(app.getHttpServer()).get(
        `/api/v1/appointments/${rescheduled.body.id}`,
      ),
    ).expect(200);
    expect(successor.body.status).toBe("CANCELADA");

    // O vínculo único foi solto: a original pode ser reagendada de novo.
    await auth(
      request(app.getHttpServer()).patch(
        `/api/v1/appointments/${original.body.id}/reschedule`,
      ),
    )
      .send({ date: nextWeekday(), time: "15:30", reason: "Segunda tentativa" })
      .expect(200);
  });

  function auth(req: request.Test): request.Test {
    return req.set("Authorization", `Bearer ${accessToken}`);
  }
});

/** Próximo dia útil, para cair dentro da grade de atendimento semeada. */
function nextWeekday(): string {
  const date = new Date();
  do {
    date.setDate(date.getDate() + 1);
  } while (date.getDay() === 0 || date.getDay() === 6);
  return date.toISOString().slice(0, 10);
}
