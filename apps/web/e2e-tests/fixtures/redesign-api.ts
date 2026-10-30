import type { Page, Route } from "@playwright/test";

const API_PREFIX = "/api/v1";

export const clinicToday = new Intl.DateTimeFormat("en-CA", {
  timeZone: "America/Sao_Paulo",
  year: "numeric",
  month: "2-digit",
  day: "2-digit",
}).format(new Date());

const user = {
  id: "u-manager",
  name: "Marta Vasconcelos",
  email: "gestao@clinicaviver.com.br",
  role: "GESTOR",
  professionalId: null,
  roleLabel: "Gestão",
};

const professional = {
  id: "d1",
  name: "Dra. Helena Prado",
  specialty: "Clínica Geral",
  credential: "Clínica Geral (CRM 142.890)",
  workdaysLabel: "Seg, Ter, Qua, Qui, Sex",
  isActive: true,
  defaultDurationMinutes: 30,
  todayAppointmentsCount: 8,
  openTasksCount: 2,
  userId: null,
};

const professionals = [
  professional,
  {
    ...professional,
    id: "d2",
    name: "Dr. Rafael Antunes",
    specialty: "Cardiologia",
    credential: "Cardiologia (CRM 119.450)",
    workdaysLabel: "Seg, Qua, Sex",
    todayAppointmentsCount: 6,
    openTasksCount: 1,
  },
  {
    ...professional,
    id: "d3",
    name: "Dra. Camila Sousa",
    specialty: "Dermatologia",
    credential: "Dermatologia (CRM 187.324)",
    workdaysLabel: "Ter, Qui",
    todayAppointmentsCount: 4,
    openTasksCount: 0,
  },
];

const patient = {
  id: "p1",
  name: "Maria Silva Rodrigues",
  age: 45,
  phone: "(11) 98432-1190",
  lastVisitAt: `${clinicToday}T12:00:00.000Z`,
  nextVisitAt: `${clinicToday}T15:00:00.000Z`,
  openTasksCount: 1,
  cpf: "123.456.789-00",
  birthDate: "1981-03-19",
  email: "maria.rodrigues@example.com",
  notes: "Prefere contato por WhatsApp.",
  createdAt: "2024-03-12T12:00:00.000Z",
};

const patients = [
  patient,
  {
    ...patient,
    id: "p2",
    name: "Carlos Eduardo Dias",
    age: 61,
    phone: "(11) 97711-2030",
    email: "carlos.dias@example.com",
    openTasksCount: 0,
  },
  {
    ...patient,
    id: "p3",
    name: "Luiza Fernandes Rocha",
    age: 41,
    phone: "(11) 96650-7781",
    email: "luiza.rocha@example.com",
    openTasksCount: 2,
  },
  ...[
    "Ana Beatriz Moraes",
    "Anderson Lopes Ferreira",
    "Beatriz Nogueira Alves",
    "Caio Ribeiro Mendes",
    "Daniela Costa Farias",
  ].map((name, index) => ({
    ...patient,
    id: `p${index + 4}`,
    name,
    age: 30 + index,
    phone: `(11) 99120-447${index}`,
  })),
];

function appointment(input: {
  id: string;
  code: number;
  time: string;
  status: string;
  stateLabel: string;
  patientId: string;
  patientName: string;
  professionalId: string;
  professionalName: string;
  type?: string;
  room?: string | null;
  notes?: string | null;
  allowedTransitions?: string[];
}) {
  const [hours, minutes] = input.time.split(":").map(Number);
  const startsAt = `${clinicToday}T${String((hours ?? 9) + 3).padStart(2, "0")}:${String(minutes ?? 0).padStart(2, "0")}:00.000Z`;
  return {
    id: input.id,
    code: input.code,
    startsAt,
    endsAt: new Date(Date.parse(startsAt) + 30 * 60_000).toISOString(),
    time: input.time,
    durationMinutes: 30,
    type: input.type ?? "CONSULTA",
    status: input.status,
    derivedState: input.status,
    stateLabel: input.stateLabel,
    waitingMinutes: input.status === "CHECK_IN" ? 18 : null,
    lateMinutes: null,
    patientId: input.patientId,
    patientName: input.patientName,
    patientPhone: patients.find((item) => item.id === input.patientId)?.phone,
    professionalId: input.professionalId,
    professionalName: input.professionalName,
    room: input.room ?? "Sala 3",
    notes: input.notes ?? null,
    allowedTransitions: input.allowedTransitions ?? [],
    isOverbooked: false,
  };
}

const appointments = [
  appointment({
    id: "a1",
    code: 1038,
    time: "09:00",
    status: "EM_ATENDIMENTO",
    stateLabel: "Em atendimento",
    patientId: "p1",
    patientName: "Maria Silva Rodrigues",
    professionalId: "d2",
    professionalName: "Dr. Rafael Antunes",
    allowedTransitions: ["CONCLUIDA", "CANCELADA"],
  }),
  appointment({
    id: "a2",
    code: 1039,
    time: "09:15",
    status: "CHECK_IN",
    stateLabel: "Aguardando 18min",
    patientId: "p2",
    patientName: "Carlos Eduardo Dias",
    professionalId: "d1",
    professionalName: "Dra. Helena Prado",
    type: "PRIMEIRA_CONSULTA",
    allowedTransitions: ["EM_ATENDIMENTO", "CANCELADA"],
  }),
  appointment({
    id: "a3",
    code: 1040,
    time: "09:30",
    status: "CONFIRMADA",
    stateLabel: "Confirmada",
    patientId: "p3",
    patientName: "Luiza Fernandes Rocha",
    professionalId: "d1",
    professionalName: "Dra. Helena Prado",
    type: "RETORNO",
    allowedTransitions: ["CHECK_IN", "CANCELADA"],
  }),
  appointment({
    id: "a4",
    code: 1041,
    time: "10:00",
    status: "AGENDADA",
    stateLabel: "A confirmar",
    patientId: "p1",
    patientName: "Maria Silva Rodrigues",
    professionalId: "d2",
    professionalName: "Dr. Rafael Antunes",
    allowedTransitions: ["CONFIRMADA", "CHECK_IN", "REAGENDADA", "CANCELADA"],
  }),
  appointment({
    id: "a5",
    code: 1042,
    time: "10:30",
    status: "CONCLUIDA",
    stateLabel: "Concluída",
    patientId: "p3",
    patientName: "Luiza Fernandes Rocha",
    professionalId: "d3",
    professionalName: "Dra. Camila Sousa",
    type: "RETORNO",
  }),
  appointment({
    id: "a6",
    code: 1043,
    time: "11:00",
    status: "CANCELADA",
    stateLabel: "Cancelada",
    patientId: "p2",
    patientName: "Carlos Eduardo Dias",
    professionalId: "d1",
    professionalName: "Dra. Helena Prado",
  }),
];

const pageTwoAppointment = appointment({
  id: "a_page2",
  code: 1090,
  time: "15:00",
  status: "AGENDADA",
  stateLabel: "A confirmar",
  patientId: "p4",
  patientName: "Ana Beatriz Moraes",
  professionalId: "d1",
  professionalName: "Dra. Helena Prado",
  allowedTransitions: ["CONFIRMADA", "REAGENDADA", "CANCELADA"],
});

const detail = (id: string, pageTwoConfirmed = false) => {
  const row =
    id === "a_page2"
      ? pageTwoConfirmed
        ? {
            ...pageTwoAppointment,
            status: "CONFIRMADA",
            derivedState: "CONFIRMADA",
            stateLabel: "Confirmada",
            allowedTransitions: ["CHECK_IN", "REAGENDADA", "CANCELADA"],
          }
        : pageTwoAppointment
      : (appointments.find((item) => item.id === id) ?? appointments[0]);
  return {
    ...row,
    confirmedAt: row.status === "CONFIRMADA" ? row.startsAt : null,
    checkedInAt: row.status === "CHECK_IN" ? row.startsAt : null,
    startedAt: row.status === "EM_ATENDIMENTO" ? row.startsAt : null,
    completedAt: row.status === "CONCLUIDA" ? row.startsAt : null,
    cancelledAt: row.status === "CANCELADA" ? row.startsAt : null,
    cancelReason: row.status === "CANCELADA" ? "PACIENTE_DESMARCOU" : null,
    cancelNote: null,
    documentsCount: 2,
    rescheduledFromId: null,
  };
};

const appointmentEvents = [
  {
    id: "evt1",
    fromStatus: null,
    toStatus: "AGENDADA",
    title: "Consulta agendada",
    actorName: "Marta Vasconcelos",
    channel: "WEB",
    reason: null,
    createdAt: `${clinicToday}T11:00:00.000Z`,
  },
  {
    id: "evt2",
    fromStatus: "AGENDADA",
    toStatus: "CONFIRMADA",
    title: "Consulta confirmada",
    actorName: "Marta Vasconcelos",
    channel: "WHATSAPP",
    reason: null,
    createdAt: `${clinicToday}T12:00:00.000Z`,
  },
];

const documents = [
  {
    id: "doc1",
    fileName: "hemograma-maria.pdf",
    format: "PDF",
    type: "EXAME_LABORATORIAL",
    typeLabel: "Exame laboratorial",
    byteSize: 204_800,
    sizeLabel: "200 KB",
    patientId: "p1",
    patientName: "Maria Silva Rodrigues",
    appointmentId: "a1",
    source: "Recepção",
    createdAt: `${clinicToday}T12:00:00.000Z`,
  },
  {
    id: "doc2",
    fileName: "receita-maria.png",
    format: "PNG",
    type: "RECEITA",
    typeLabel: "Receita",
    byteSize: 102_400,
    sizeLabel: "100 KB",
    patientId: "p1",
    patientName: "Maria Silva Rodrigues",
    appointmentId: "a1",
    source: "Dr. Rafael Antunes",
    createdAt: `${clinicToday}T13:00:00.000Z`,
  },
  {
    id: "doc3",
    fileName: "atestado-carlos.pdf",
    format: "PDF",
    type: "ATESTADO",
    typeLabel: "Atestado médico",
    byteSize: 88_000,
    sizeLabel: "86 KB",
    patientId: "p2",
    patientName: "Carlos Eduardo Dias",
    appointmentId: null,
    source: null,
    createdAt: `${clinicToday}T14:00:00.000Z`,
  },
];

const tasks = [
  {
    id: "t1",
    patientId: "p1",
    patientName: "Maria Silva Rodrigues",
    patientPhone: patient.phone,
    appointmentId: "a1",
    type: "RETORNO_A_AGENDAR",
    status: "ABERTA",
    title: "Agendar retorno em 30 dias",
    dueAt: `${clinicToday}T23:59:00.000Z`,
    dueLabel: "Urgente (hoje)",
    isUrgent: true,
    notes: "Confirmar disponibilidade no período da manhã.",
    suggestedAction: "Agendar retorno",
    lastContactAt: null,
    createdAt: `${clinicToday}T10:00:00.000Z`,
  },
  {
    id: "t2",
    patientId: "p2",
    patientName: "Carlos Eduardo Dias",
    patientPhone: patients[1]?.phone,
    appointmentId: "a4",
    type: "CONFIRMACAO_PENDENTE",
    status: "EM_ANDAMENTO",
    title: "Confirmar consulta de amanhã",
    dueAt: `${clinicToday}T23:59:00.000Z`,
    dueLabel: "Até hoje",
    isUrgent: false,
    notes: null,
    suggestedAction: "Confirmar",
    lastContactAt: null,
    createdAt: `${clinicToday}T10:30:00.000Z`,
  },
];

const settings = {
  clinicName: "Clínica Viver",
  timezone: "America/Sao_Paulo",
  defaultDurationMinutes: 30,
  confirmationLeadHours: 48,
  returnWindowDays: 30,
  lateToleranceMinutes: 15,
};

function pageOf<T>(data: T[], query: URLSearchParams, defaultLimit = 15) {
  const page = Number(query.get("page") ?? 1) || 1;
  const limit = Number(query.get("limit") ?? defaultLimit) || defaultLimit;
  return {
    data,
    meta: {
      page,
      limit,
      itemCount: data.length,
      pageCount: Math.max(1, Math.ceil(data.length / limit)),
      hasPreviousPage: page > 1,
      hasNextPage: false,
    },
  };
}

export interface RedesignApiOptions {
  /** API realista: o registro existe, mas o armazenamento não tem seus bytes. */
  missingFile?: boolean;
}

export interface RedesignApi {
  unknownRequests: string[];
  requested: string[];
}

/** Respostas tipadas por endpoint; todo caminho desconhecido vira falha visível. */
export async function installRedesignApi(
  page: Page,
  options: RedesignApiOptions = {},
): Promise<RedesignApi> {
  const state: RedesignApi = { unknownRequests: [], requested: [] };
  let pageTwoConfirmed = false;

  await page.route("**/api/v1/**", async (route: Route) => {
    const request = route.request();
    const url = new URL(request.url());
    const method = request.method();
    const path = url.pathname.replace(API_PREFIX, "");
    state.requested.push(`${method} ${path}${url.search}`);
    const json = (body: unknown, status = 200) =>
      route.fulfill({
        status,
        contentType: "application/json",
        body: JSON.stringify(body),
      });
    if (path === "/dashboard/stream" || path === "/waiting-room/stream")
      return route.abort();
    if (path === "/auth/me") return json(user);
    if (path === "/dashboard/today") {
      return json({
        date: clinicToday,
        dateLabel: "Hoje · Clínica Viver",
        total: 24,
        open: 15,
        rescheduled: 2,
        unconfirmed: 4,
        nextArrival: appointments[3],
        scheduled: 24,
        confirmed: 9,
        waiting: 3,
        inProgress: 1,
        completed: 8,
        late: 2,
        cancelled: 1,
      });
    }
    if (path === "/waiting-room/metrics")
      return json({
        waitingCount: 2,
        averageWaitMinutes: 16,
        longestWaitMinutes: 27,
        inProgressCount: 1,
      });
    if (path === "/waiting-room" && method === "GET") {
      return json([
        {
          appointmentId: "a2",
          patientId: "p2",
          patientName: "Carlos Eduardo Dias",
          patientPhone: patients[1]?.phone,
          type: "PRIMEIRA_CONSULTA",
          professionalName: "Dra. Helena Prado",
          waitingMinutes: 27,
          waitingLabel: "27 min",
          checkedInAtLabel: "09:00",
          scheduledAtLabel: "09:15",
          state: "Atrasada",
          isLate: true,
          wasCalled: false,
        },
        {
          appointmentId: "a3",
          patientId: "p3",
          patientName: "Luiza Fernandes Rocha",
          patientPhone: patients[2]?.phone,
          type: "RETORNO",
          professionalName: "Dra. Helena Prado",
          waitingMinutes: 18,
          waitingLabel: "18 min",
          checkedInAtLabel: "09:12",
          scheduledAtLabel: "09:30",
          state: "Aguardando",
          isLate: false,
          wasCalled: false,
        },
      ]);
    }
    if (path === "/appointments/calendar") {
      const from = url.searchParams.get("from") ?? clinicToday;
      const to = url.searchParams.get("to") ?? from;
      const days: { date: string; weekdayLabel: string; slots: unknown[] }[] =
        [];
      for (
        let time = from;
        time <= to;
        time = new Date(Date.parse(`${time}T12:00:00Z`) + 86_400_000)
          .toISOString()
          .slice(0, 10)
      ) {
        const slots = appointments
          .filter((item) => item.startsAt.startsWith(time))
          .map((item) => ({
            id: item.id,
            date: time,
            time: item.time,
            startsAt: item.startsAt,
            durationMinutes: item.durationMinutes,
            patientName: item.patientName,
            professionalId: item.professionalId,
            professionalName: item.professionalName,
            status: item.status,
            derivedState: item.derivedState,
          }));
        days.push({
          date: time,
          weekdayLabel: new Intl.DateTimeFormat("pt-BR", {
            weekday: "long",
            timeZone: "UTC",
          }).format(new Date(`${time}T12:00:00Z`)),
          slots,
        });
      }
      return json(days);
    }
    if (path === "/appointments/slots")
      return json(
        ["09:00", "09:30", "10:00", "10:30", "11:00"].map((time, index) => ({
          time,
          startsAt: `${clinicToday}T${String(Number(time.slice(0, 2)) + 3).padStart(2, "0")}:${time.slice(3)}:00.000Z`,
          available: index !== 1,
        })),
      );
    if (path === "/appointments/availability" && method === "POST")
      return json({
        available: true,
        conflicts: [],
        withinSchedule: true,
        message: null,
      });
    if (path === "/appointments" && method === "GET") {
      if (
        url.searchParams.has("date") &&
        url.searchParams.get("page") === "2"
      ) {
        return pageTwoConfirmed
          ? json({
              data: [],
              meta: {
                page: 2,
                limit: 50,
                itemCount: 50,
                pageCount: 1,
                hasPreviousPage: true,
                hasNextPage: false,
              },
            })
          : json({
              data: [pageTwoAppointment],
              meta: {
                page: 2,
                limit: 50,
                itemCount: 51,
                pageCount: 2,
                hasPreviousPage: true,
                hasNextPage: false,
              },
            });
      }
      const wanted = url.searchParams.getAll("status");
      const search = (url.searchParams.get("search") ?? "").toLocaleLowerCase(
        "pt-BR",
      );
      const found = appointments.filter(
        (item) =>
          (!wanted.length || wanted.includes(item.status)) &&
          (!search ||
            item.patientName.toLocaleLowerCase("pt-BR").includes(search)),
      );
      return json(pageOf(found, url.searchParams));
    }
    if (path === "/appointments" && method === "POST")
      return json(detail("a4"), 201);
    const appointmentSubroute = path.match(
      /^\/appointments\/([^/]+)\/(audit|confirm|check-in|start|complete|reschedule|cancel|undo)$/,
    );
    if (appointmentSubroute) {
      const [, id, action] = appointmentSubroute;
      if (id === "a_page2" && action === "confirm") pageTwoConfirmed = true;
      if (action === "audit")
        return json({
          data: appointmentEvents,
          meta: { hasNextPage: false, nextCursor: null },
        });
      return json(detail(id ?? "a4", pageTwoConfirmed));
    }
    const appointmentDetail = path.match(/^\/appointments\/([^/]+)$/);
    if (appointmentDetail && method === "GET")
      return json(detail(appointmentDetail[1] ?? "a4", pageTwoConfirmed));
    if (appointmentDetail && method === "PATCH")
      return json(detail(appointmentDetail[1] ?? "a4", pageTwoConfirmed));
    if (path === "/patients" && method === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLocaleLowerCase(
        "pt-BR",
      );
      const found = patients.filter(
        (item) =>
          (!search ||
            item.name.toLocaleLowerCase("pt-BR").includes(search) ||
            item.phone.includes(search)) &&
          (url.searchParams.get("hasPendencies") !== "true" ||
            item.openTasksCount > 0),
      );
      return json(pageOf(found, url.searchParams, 10));
    }
    if (path === "/patients" && method === "POST") return json(patient, 201);
    const patientSubroute = path.match(
      /^\/patients\/([^/]+)\/(summary|appointments|documents|tasks)$/,
    );
    if (patientSubroute) {
      const [, id, section] = patientSubroute;
      if (section === "summary")
        return json({
          appointmentsCount: 12,
          cancelledCount: 1,
          documentsCount: 2,
          openTasksCount: 1,
        });
      if (section === "appointments")
        return json({
          data: appointments,
          meta: { hasNextPage: false, nextCursor: null },
        });
      if (section === "documents")
        return json(
          pageOf(
            documents.filter((item) => item.patientId === id),
            url.searchParams,
            10,
          ),
        );
      return json(
        pageOf(
          tasks.filter((item) => item.patientId === id),
          url.searchParams,
          10,
        ),
      );
    }
    const patientDetail = path.match(/^\/patients\/([^/]+)$/);
    if (patientDetail && method === "GET")
      return json(
        patients.find((item) => item.id === patientDetail[1]) ?? patient,
      );
    if (patientDetail && method === "PATCH") return json(patient);
    if (path === "/professionals" && method === "GET") {
      const search = (url.searchParams.get("search") ?? "").toLocaleLowerCase(
        "pt-BR",
      );
      return json(
        pageOf(
          professionals.filter(
            (item) =>
              !search ||
              item.name.toLocaleLowerCase("pt-BR").includes(search) ||
              item.specialty.toLocaleLowerCase("pt-BR").includes(search),
          ),
          url.searchParams,
          100,
        ),
      );
    }
    const professionalSubroute = path.match(
      /^\/professionals\/([^/]+)\/(schedule|appointments)$/,
    );
    if (professionalSubroute) {
      if (professionalSubroute[2] === "schedule")
        return json({
          professionalId: professionalSubroute[1],
          windows: [
            {
              weekday: 1,
              startTime: "08:00",
              endTime: "17:00",
              room: "Sala 3",
            },
            {
              weekday: 3,
              startTime: "08:00",
              endTime: "17:00",
              room: "Sala 3",
            },
            {
              weekday: 5,
              startTime: "08:00",
              endTime: "15:00",
              room: "Sala 3",
            },
          ],
          summary: "Seg, Qua, Sex",
        });
      return json([
        {
          date: clinicToday,
          weekdayLabel: "hoje",
          slots: appointments
            .filter((item) => item.professionalId === professionalSubroute[1])
            .map((item) => ({
              id: item.id,
              date: clinicToday,
              time: item.time,
              startsAt: item.startsAt,
              durationMinutes: item.durationMinutes,
              patientName: item.patientName,
              professionalId: item.professionalId,
              professionalName: item.professionalName,
              status: item.status,
              derivedState: item.derivedState,
            })),
        },
      ]);
    }
    const professionalDetail = path.match(/^\/professionals\/([^/]+)$/);
    if (professionalDetail && method === "GET")
      return json(
        professionals.find((item) => item.id === professionalDetail[1]) ??
          professional,
      );
    if (path === "/documents" && method === "GET") {
      const term = (url.searchParams.get("search") ?? "").toLocaleLowerCase(
        "pt-BR",
      );
      const type = url.searchParams.get("type");
      return json(
        pageOf(
          documents.filter(
            (item) =>
              (!term ||
                `${item.fileName} ${item.patientName}`
                  .toLocaleLowerCase("pt-BR")
                  .includes(term)) &&
              (!type || item.type === type),
          ),
          url.searchParams,
        ),
      );
    }
    if (path === "/documents" && method === "POST")
      return json(documents[0], 201);
    const documentDownload = path.match(/^\/documents\/([^/]+)\/download$/);
    if (documentDownload && method === "GET")
      return json({
        url: `${API_PREFIX}/uploads/local/${documentDownload[1]}`,
        fileName:
          documents.find((item) => item.id === documentDownload[1])?.fileName ??
          "documento.pdf",
        expiresIn: 300,
      });
    const documentFile = path.match(/^\/uploads\/local\/([^/]+)$/);
    if (documentFile) {
      if (options.missingFile)
        return route.fulfill({
          status: 404,
          contentType: "application/octet-stream",
          body: "missing",
        });
      if (documentFile[1]?.includes("doc2")) {
        return route.fulfill({
          status: 200,
          contentType: "image/png",
          body: Buffer.from(
            "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+j5eQAAAAASUVORK5CYII=",
            "base64",
          ),
        });
      }
      return route.fulfill({
        status: 200,
        contentType: "application/pdf",
        body: "%PDF-1.4\n1 0 obj<</Type/Catalog>>endobj\n%%EOF",
      });
    }
    if (path === "/tasks" && method === "GET") {
      const types = url.searchParams.getAll("type");
      const found = tasks.filter(
        (item) => !types.length || types.includes(item.type),
      );
      return json(pageOf(found, url.searchParams));
    }
    if (path === "/tasks" && method === "POST") return json(tasks[0], 201);
    if (path === "/tasks/summary")
      return json({
        returnsToSchedule: 6,
        pendingConfirmations: 4,
        noShowsToRecover: 2,
        resolvedToday: 3,
      });
    const taskAction = path.match(/^\/tasks\/([^/]+)\/(resolve|contact)$/);
    if (taskAction)
      return json(tasks.find((item) => item.id === taskAction[1]) ?? tasks[0]);
    if (path === "/settings" && method === "GET") return json(settings);
    if (path === "/settings" && method === "PATCH") return json(settings);
    if (path === "/settings/whatsapp" && method === "GET")
      return json({
        whatsappEnabled: true,
        whatsappTemplate:
          "Olá {{paciente}}, sua consulta com {{profissional}} é {{data}} às {{hora}}.",
        transport: "log",
      });
    if (path === "/settings/whatsapp" && method === "PUT")
      return json({
        whatsappEnabled: true,
        whatsappTemplate: "Olá {{paciente}}",
        transport: "log",
      });
    if (path === "/search") {
      const query = (url.searchParams.get("q") ?? "").toLocaleLowerCase(
        "pt-BR",
      );
      return json({
        actions: [
          {
            id: "new-appointment",
            title: "Nova consulta",
            subtitle: null,
            shortcut: "N",
          },
          {
            id: "open-waiting-room",
            title: "Sala de espera",
            subtitle: null,
            shortcut: "S",
          },
        ],
        patients: patients
          .filter(
            (item) =>
              !query || item.name.toLocaleLowerCase("pt-BR").includes(query),
          )
          .slice(0, 4)
          .map((item) => ({
            id: item.id,
            name: item.name,
            phone: item.phone,
            subtitle: "Consulta hoje",
            stateLabel: "Confirmada",
          })),
        professionals: professionals
          .filter(
            (item) =>
              !query || item.name.toLocaleLowerCase("pt-BR").includes(query),
          )
          .map((item) => ({
            id: item.id,
            name: item.name,
            subtitle: item.credential,
          })),
      });
    }

    const unknown = `${method} ${path}${url.search}`;
    state.unknownRequests.push(unknown);
    return json(
      {
        statusCode: 501,
        code: "E2E_UNMOCKED_ENDPOINT",
        message: `Unmocked endpoint in redesign suite: ${unknown}`,
        path,
        timestamp: new Date().toISOString(),
      },
      501,
    );
  });

  return state;
}

export async function prepareAuthenticatedPage(page: Page) {
  await page.addInitScript(() => {
    const selectedTheme =
      new URLSearchParams(location.search).get("e2eTheme") === "dark"
        ? "dark"
        : "light";
    localStorage.setItem("clinicflow.theme", selectedTheme);
    if (
      ["/entrar", "/recuperar-senha", "/redefinir-senha"].includes(
        location.pathname,
      )
    ) {
      localStorage.removeItem("clinicflow.access");
      localStorage.removeItem("clinicflow.refresh");
    } else {
      localStorage.setItem("clinicflow.access", "redesign-test-token");
      localStorage.setItem("clinicflow.refresh", "redesign-test-refresh");
    }
  });
}
