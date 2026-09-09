import { INestApplication, ValidationPipe } from "@nestjs/common";
import { Test, TestingModule } from "@nestjs/testing";
import request from "supertest";
import { AppModule } from "@/app.module";
import { AllExceptionsFilter } from "@/common/filters/all-exceptions.filter";

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
    app.useGlobalPipes(
      new ValidationPipe({
        whitelist: true,
        forbidNonWhitelisted: true,
        transform: true,
      }),
    );
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
    const response = await auth(
      request(app.getHttpServer()).get("/api/v1/search?q=Luiza"),
    ).expect(200);

    expect(response.body.actions.length).toBeGreaterThan(0);
    expect(response.body.patients.length).toBeGreaterThan(0);
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
