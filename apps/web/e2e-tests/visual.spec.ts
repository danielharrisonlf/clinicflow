import { expect, test } from "@playwright/test";

/**
 * Captura visual com a API mockada. Não substitui os testes de comportamento:
 * existe para que dê para *olhar* o resultado sem subir o backend — foi assim
 * que apareceram o telefone quebrando em duas linhas e o selo estourando a
 * altura da linha, defeitos que nenhuma asserção numérica pegou.
 *
 * As imagens caem em `shots/` (fora do versionamento).
 */
const user = {
  id: "u1",
  name: "Renata Souza",
  email: "renata@clinicaviver.com.br",
  role: "RECEPCAO",
  professionalId: null,
  roleLabel: "Recepção",
};

function appt(o: Record<string, unknown>) {
  return {
    id: o.id,
    code: o.code,
    startsAt: `2026-09-11T${o.time}:00.000Z`,
    endsAt: `2026-09-11T${o.time}:00.000Z`,
    time: o.time,
    durationMinutes: 30,
    type: o.type ?? "CONSULTA",
    status: o.status,
    derivedState: o.derivedState ?? o.status,
    stateLabel: o.stateLabel,
    waitingMinutes: null,
    lateMinutes: null,
    patientId: "p1",
    patientName: o.patientName,
    patientPhone: "(11) 98432-1190",
    professionalId: "d1",
    professionalName: o.professionalName,
    room: "Sala 3",
    notes: null,
    allowedTransitions: o.allowedTransitions,
  };
}

const appointments = [
  appt({
    id: "a1",
    code: 1038,
    time: "09:00",
    status: "EM_ATENDIMENTO",
    stateLabel: "Em atendimento",
    patientName: "Maria Silva Rodrigues",
    professionalName: "Dr. Rafael Antunes",
    allowedTransitions: ["CONCLUIDA", "CANCELADA"],
  }),
  appt({
    id: "a2",
    code: 1039,
    time: "09:15",
    status: "CHECK_IN",
    derivedState: "ATRASADA",
    stateLabel: "Atrasada 27min",
    type: "PRIMEIRA_CONSULTA",
    patientName: "Carlos Eduardo Dias",
    professionalName: "Dra. Helena Prado",
    allowedTransitions: ["EM_ATENDIMENTO", "CANCELADA"],
  }),
  appt({
    id: "a3",
    code: 1040,
    time: "09:30",
    status: "CHECK_IN",
    stateLabel: "Aguardando 18min",
    type: "RETORNO",
    patientName: "Luiza Fernandes Rocha",
    professionalName: "Dra. Helena Prado",
    allowedTransitions: ["EM_ATENDIMENTO", "CANCELADA"],
  }),
  appt({
    id: "a4",
    code: 1041,
    time: "10:00",
    status: "CONFIRMADA",
    stateLabel: "Confirmada",
    patientName: "João Pereira Lima",
    professionalName: "Dr. Rafael Antunes",
    allowedTransitions: ["CHECK_IN", "CANCELADA"],
  }),
  appt({
    id: "a5",
    code: 1042,
    time: "10:30",
    status: "AGENDADA",
    stateLabel: "Agendada",
    type: "AVALIACAO",
    patientName: "Beatriz Nogueira Alves",
    professionalName: "Dra. Camila Sousa",
    allowedTransitions: ["CONFIRMADA", "CHECK_IN", "CANCELADA"],
  }),
  appt({
    id: "a6",
    code: 1043,
    time: "08:00",
    status: "CONCLUIDA",
    stateLabel: "Concluída",
    type: "RETORNO",
    patientName: "Ana Beatriz Moraes",
    professionalName: "Dra. Helena Prado",
    allowedTransitions: [],
  }),
];

test("captura as telas de referência", async ({ page }) => {
  await page.route("**/api/v1/**", async (route) => {
    const url = route.request().url();
    const json = (body: unknown) => route.fulfill({ json: body });

    if (url.includes("/auth/me")) return json(user);
    if (
      url.includes("/dashboard/stream") ||
      url.includes("/waiting-room/stream")
    ) {
      return route.abort();
    }
    if (url.includes("/dashboard/today")) {
      return json({
        date: "2026-09-11",
        dateLabel: "Quinta-feira, 11 de setembro de 2026",
        scheduled: 24,
        confirmed: 9,
        waiting: 3,
        inProgress: 1,
        completed: 8,
        late: 2,
        cancelled: 1,
      });
    }
    if (url.includes("/appointments")) {
      return json({
        data: appointments,
        meta: {
          page: 1,
          limit: 50,
          itemCount: 24,
          pageCount: 1,
          hasPreviousPage: false,
          hasNextPage: false,
        },
      });
    }
    if (url.includes("/waiting-room/metrics")) {
      return json({
        waitingCount: 3,
        averageWaitMinutes: 16,
        longestWaitMinutes: 27,
      });
    }
    if (url.includes("/waiting-room")) {
      return json([
        {
          appointmentId: "a2",
          patientId: "p1",
          patientName: "Carlos Eduardo Dias",
          professionalName: "Dra. Helena Prado",
          waitingMinutes: 27,
          waitingLabel: "27min",
          checkedInAtLabel: "08:48",
          scheduledAtLabel: "09:15",
          state: "Atrasada",
          wasCalled: false,
        },
        {
          appointmentId: "a3",
          patientId: "p2",
          patientName: "Luiza Fernandes Rocha",
          professionalName: "Dra. Helena Prado",
          waitingMinutes: 18,
          waitingLabel: "18min",
          checkedInAtLabel: "09:32",
          scheduledAtLabel: "09:30",
          state: "Aguardando",
          wasCalled: false,
        },
        {
          appointmentId: "a7",
          patientId: "p3",
          patientName: "Patrícia Muniz",
          professionalName: "Dra. Camila Sousa",
          waitingMinutes: 4,
          waitingLabel: "4min",
          checkedInAtLabel: "09:56",
          scheduledAtLabel: "10:00",
          state: "Aguardando",
          wasCalled: true,
        },
      ]);
    }
    if (url.includes("/patients")) {
      return json({
        data: Array.from({ length: 8 }, (_, i) => ({
          id: `p${i}`,
          name: [
            "Ana Beatriz Moraes",
            "Anderson Lopes Ferreira",
            "Carlos Eduardo Dias",
            "Luiza Fernandes Rocha",
            "Maria Silva Rodrigues",
            "Beatriz Nogueira Alves",
            "Caio Ribeiro Mendes",
            "Daniela Costa Farias",
          ][i],
          age: [34, 48, 61, 41, 45, 29, 52, 37][i],
          phone: "(11) 99120-4471",
          lastVisitAt: "2026-08-12T12:00:00.000Z",
          nextVisitAt: i % 3 === 0 ? "2026-09-11T12:00:00.000Z" : null,
          openTasksCount: i % 4 === 1 ? 1 : 0,
        })),
        meta: {
          page: 1,
          limit: 15,
          itemCount: 1248,
          pageCount: 84,
          hasPreviousPage: false,
          hasNextPage: true,
        },
      });
    }
    return json({
      data: [],
      meta: {
        page: 1,
        limit: 10,
        itemCount: 0,
        pageCount: 0,
        hasPreviousPage: false,
        hasNextPage: false,
      },
    });
  });

  await page.addInitScript(() => {
    localStorage.setItem("clinicflow.access", "fake");
    localStorage.setItem("clinicflow.refresh", "fake");
  });

  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await expect(page.getByText("Maria Silva Rodrigues").first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/01-painel-desktop.png" });

  await page.goto("/sala-de-espera");
  await expect(page.getByText("Carlos Eduardo Dias").first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/02-espera-desktop.png" });

  await page.goto("/pacientes");
  await expect(page.getByText("Anderson Lopes Ferreira").first()).toBeVisible();
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/03-pacientes-desktop.png" });

  await page.setViewportSize({ width: 390, height: 844 });
  await page.goto("/");
  await expect(page.getByRole("article").first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/04-painel-mobile.png" });

  await page.setViewportSize({ width: 768, height: 1024 });
  await page.goto("/");
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/05-painel-tablet.png" });

  // Paleta de comandos: o anel de foco do input colava nas bordas do diálogo.
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  await page.keyboard.press("Control+k");
  await page.waitForTimeout(400);
  await page.screenshot({ path: "shots/06-paleta.png" });
  await page.keyboard.press("Escape");

  // Tema escuro.
  await page.evaluate(() => localStorage.setItem("clinicflow.theme", "dark"));
  await page.goto("/");
  await expect(page.getByText("Maria Silva Rodrigues").first()).toBeVisible();
  await page.waitForTimeout(600);
  await page.screenshot({ path: "shots/07-painel-escuro.png" });

  await page.evaluate(() => localStorage.removeItem("clinicflow.theme"));
});

test("captura o login, sem sessão", async ({ page }) => {
  await page.setViewportSize({ width: 1280, height: 800 });
  await page.goto("/entrar");
  await expect(page.getByRole("heading", { name: "Entrar" })).toBeVisible();
  await page.screenshot({ path: "shots/08-login.png" });

  await page.goto("/recuperar-senha");
  await expect(
    page.getByRole("heading", { name: "Recuperar senha" }),
  ).toBeVisible();
  await page.screenshot({ path: "shots/09-recuperar-senha.png" });
});

test("captura configurações no perfil de gestão", async ({ page }) => {
  await page.addInitScript(() => {
    localStorage.setItem("clinicflow.access", "fake");
    localStorage.setItem("clinicflow.refresh", "fake");
  });
  await page.route("**/api/v1/**", (route) => {
    const url = route.request().url();
    if (url.includes("/stream")) return route.abort();
    if (url.includes("/auth/me")) {
      return route.fulfill({
        json: {
          id: "u9",
          name: "Marta Vasconcelos",
          email: "gestao@clinicaviver.com.br",
          role: "GESTOR",
          professionalId: null,
          roleLabel: "Gestão",
        },
      });
    }
    if (url.includes("/settings/whatsapp")) {
      return route.fulfill({
        json: {
          whatsappEnabled: true,
          whatsappTemplate:
            "Olá {{paciente}}, sua consulta com {{profissional}} é {{data}} às {{hora}}. Responda SIM para confirmar.",
          transport: "log",
        },
      });
    }
    if (url.includes("/settings")) {
      return route.fulfill({
        json: {
          clinicName: "Clínica Viver",
          timezone: "America/Sao_Paulo",
          defaultDurationMinutes: 30,
          confirmationLeadHours: 48,
          returnWindowDays: 30,
          lateToleranceMinutes: 15,
        },
      });
    }
    return route.fulfill({ json: { data: [], meta: {} } });
  });

  await page.setViewportSize({ width: 1280, height: 1000 });
  await page.goto("/configuracoes");
  await expect(page.getByLabel("Duração padrão da consulta")).toBeVisible();
  await page.waitForTimeout(300);
  await page.screenshot({ path: "shots/10-configuracoes.png" });
});
