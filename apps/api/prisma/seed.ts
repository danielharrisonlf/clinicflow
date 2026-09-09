/**
 * Semente da Clínica Viver — dados iniciais realistas para desenvolvimento e testes.
 */
import {
  AppointmentStatus,
  AppointmentType,
  Patient,
  PrismaClient,
  Professional,
  Role,
  TaskType,
} from "@prisma/client";
import { hash } from "bcryptjs";
import { DateTime } from "luxon";
import { uuidv7 } from "uuidv7";

const prisma = new PrismaClient();
const ZONE = "America/Sao_Paulo";
const PASSWORD = "clinicflow123";

/** Hoje na hora local da clínica: a semente serve para qualquer dia de execução. */
const today = DateTime.now().setZone(ZONE).startOf("day");

function at(time: string, dayOffset = 0): Date {
  const [hours, minutes] = time.split(":");
  return today
    .plus({ days: dayOffset })
    .set({ hour: Number(hours), minute: Number(minutes) })
    .toUTC()
    .toJSDate();
}

function plusMinutes(date: Date, minutes: number): Date {
  return new Date(date.getTime() + minutes * 60_000);
}

async function main(): Promise<void> {
  console.log("🌱 Semeando a Clínica Viver…");

  await prisma.appointmentEvent.deleteMany();
  await prisma.notification.deleteMany();
  await prisma.task.deleteMany();
  await prisma.document.deleteMany();
  await prisma.appointment.deleteMany();
  await prisma.scheduleWindow.deleteMany();
  await prisma.professional.deleteMany();
  await prisma.patient.deleteMany();
  await prisma.refreshToken.deleteMany();
  await prisma.user.deleteMany();
  await prisma.clinicSettings.deleteMany();
  await prisma.clinic.deleteMany();
  await prisma.auditLog.deleteMany();

  const clinicId = uuidv7();
  await prisma.clinic.create({
    data: {
      id: clinicId,
      name: "Clínica Viver",
      timezone: ZONE,
      settings: { create: { id: uuidv7() } },
    },
  });

  const passwordHash = await hash(PASSWORD, 12);

  const [recepcao, gestor, helenaUser, rafaelUser] = await Promise.all([
    prisma.user.create({
      data: {
        id: uuidv7(),
        name: "Renata Souza",
        email: "renata.souza@clinicaviver.com.br",
        passwordHash,
        role: Role.RECEPCAO,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv7(),
        name: "Marta Vasconcelos",
        email: "gestao@clinicaviver.com.br",
        passwordHash,
        role: Role.GESTOR,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv7(),
        name: "Dra. Helena Prado",
        email: "helena.prado@clinicaviver.com.br",
        passwordHash,
        role: Role.PROFISSIONAL,
      },
    }),
    prisma.user.create({
      data: {
        id: uuidv7(),
        name: "Dr. Rafael Antunes",
        email: "rafael.antunes@clinicaviver.com.br",
        passwordHash,
        role: Role.PROFISSIONAL,
      },
    }),
  ]);

  const professionalSeeds = [
    {
      name: "Dra. Helena Prado",
      specialty: "Clínica Geral",
      councilType: "CRM",
      councilNumber: "142.890",
      userId: helenaUser.id,
      weekdays: [1, 3, 4, 5],
    },
    {
      name: "Dr. Rafael Antunes",
      specialty: "Cardiologia",
      councilType: "CRM",
      councilNumber: "119.450",
      userId: rafaelUser.id,
      weekdays: [1, 2, 3, 4, 5],
    },
    {
      name: "Dra. Camila Sousa",
      specialty: "Dermatologia",
      councilType: "CRM",
      councilNumber: "168.201",
      weekdays: [2, 4],
    },
    {
      name: "Dr. Bruno Almeida",
      specialty: "Ortopedia",
      councilType: "CRM",
      councilNumber: "133.780",
      weekdays: [3, 5],
    },
    {
      name: "Dra. Marina Reis",
      specialty: "Nutrição Clínica",
      councilType: "CRN",
      councilNumber: "44.910",
      weekdays: [1, 2, 3],
    },
  ];

  const professionals: Professional[] = [];
  for (const seed of professionalSeeds) {
    const professional = await prisma.professional.create({
      data: {
        id: uuidv7(),
        name: seed.name,
        specialty: seed.specialty,
        councilType: seed.councilType,
        councilNumber: seed.councilNumber,
        userId: seed.userId ?? null,
        scheduleWindows: {
          create: seed.weekdays.map((weekday) => ({
            id: uuidv7(),
            weekday,
            startTime: "08:00",
            endTime: "17:00",
          })),
        },
      },
    });
    professionals.push(professional);
  }

  const [helena, rafael] = professionals;
  if (!helena || !rafael)
    throw new Error("Profissionais base não foram criados.");

  // Pacientes de teste para preencher a listagem e validar paginação.
  const patientSeeds = [
    ["Ana Beatriz Moraes", "(11) 99120-4471", "1992-05-14"],
    ["Anderson Lopes Ferreira", "(11) 98220-1180", "1978-02-03"],
    ["Beatriz Camargo", "(11) 97444-2019", "1997-11-21"],
    ["Carlos Eduardo Dias", "(11) 99887-3312", "1965-07-09"],
    ["Fernanda Tavares Lima", "(11) 98010-7755", "1989-03-30"],
    ["João Pereira Lima", "(11) 99330-6612", "1974-09-12"],
    ["Luiza Fernandes Rocha", "(11) 98432-1190", "1985-03-12"],
    ["Marcos Vinícius Reis", "(11) 99721-4408", "1992-04-18"],
    ["Maria Silva Rodrigues", "(11) 99441-2093", "1981-01-25"],
    ["Patrícia Muniz", "(11) 98776-5510", "2000-06-08"],
    ["Roberto Nogueira Alves", "(11) 99002-8845", "1968-12-02"],
    ["Sérgio Barbosa", "(11) 98333-9021", "1987-08-19"],
    ["Camila Souza Prado", "(11) 99555-1234", "1994-10-05"],
    ["Bruno Almeida Costa", "(11) 98444-9080", "1983-04-27"],
    ["Helena Ribeiro", "(11) 99777-3311", "1971-06-14"],
    ["Paulo Henrique Matos", "(11) 98111-2233", "1990-02-11"],
    ["Juliana Castro", "(11) 99666-4455", "1996-09-23"],
    ["Ricardo Menezes", "(11) 98999-1122", "1962-11-30"],
    ["Tatiane Oliveira", "(11) 99888-7766", "1988-07-17"],
    ["Eduardo Lins", "(11) 98222-3344", "1975-05-06"],
    ["Sandra Vieira", "(11) 99444-5566", "1969-03-08"],
    ["Otávio Freitas", "(11) 98555-6677", "1993-12-19"],
    ["Larissa Pontes", "(11) 99333-7788", "1999-01-14"],
    ["Gustavo Barreto", "(11) 98666-8899", "1980-10-29"],
  ] as const;

  const patients: Patient[] = [];
  for (const [name, phone, birthDate] of patientSeeds) {
    patients.push(
      await prisma.patient.create({
        data: {
          id: uuidv7(),
          name,
          phone,
          birthDate: new Date(birthDate),
          email: `${name.split(" ")[0]?.toLowerCase()}@email.com`,
          notes:
            name === "Marcos Vinícius Reis"
              ? "Alergia a dipirona e anti-inflamatórios"
              : null,
        },
      }),
    );
  }

  function byName(name: string): Patient {
    const patient = patients.find((p) => p.name === name);
    if (!patient) throw new Error(`Paciente não semeado: ${name}`);
    return patient;
  }

  /** Consultas do dia, cobrindo os diferentes estados operacionais. */
  const todaysAppointments: Array<{
    patient: string;
    professional: typeof helena;
    time: string;
    durationMinutes?: number;
    type: AppointmentType;
    status: AppointmentStatus;
    checkInOffsetMinutes?: number;
  }> = [
    {
      patient: "Ana Beatriz Moraes",
      professional: helena,
      time: "08:00",
      type: AppointmentType.RETORNO,
      status: AppointmentStatus.CONCLUIDA,
    },
    {
      patient: "Roberto Nogueira Alves",
      professional: rafael,
      time: "08:30",
      type: AppointmentType.CONSULTA,
      status: AppointmentStatus.CONCLUIDA,
    },
    {
      patient: "Maria Silva Rodrigues",
      professional: rafael,
      time: "09:00",
      type: AppointmentType.CONSULTA,
      status: AppointmentStatus.EM_ATENDIMENTO,
      checkInOffsetMinutes: -5,
    },
    {
      patient: "Carlos Eduardo Dias",
      professional: helena,
      time: "09:15",
      durationMinutes: 15,
      type: AppointmentType.PRIMEIRA_CONSULTA,
      status: AppointmentStatus.CONFIRMADA,
    },
    {
      patient: "Luiza Fernandes Rocha",
      professional: helena,
      time: "09:30",
      type: AppointmentType.RETORNO,
      status: AppointmentStatus.CHECK_IN,
      checkInOffsetMinutes: 2,
    },
    {
      patient: "João Pereira Lima",
      professional: rafael,
      time: "10:00",
      type: AppointmentType.CONSULTA,
      status: AppointmentStatus.CONFIRMADA,
    },
    {
      patient: "Patrícia Muniz",
      professional: helena,
      time: "10:15",
      type: AppointmentType.AVALIACAO,
      status: AppointmentStatus.CHECK_IN,
      checkInOffsetMinutes: -4,
    },
    {
      patient: "Sérgio Barbosa",
      professional: rafael,
      time: "10:30",
      type: AppointmentType.RETORNO,
      status: AppointmentStatus.CONFIRMADA,
    },
    {
      patient: "Fernanda Tavares Lima",
      professional: helena,
      time: "11:00",
      type: AppointmentType.CONSULTA,
      status: AppointmentStatus.AGENDADA,
    },
    {
      patient: "Beatriz Camargo",
      professional: helena,
      time: "13:00",
      type: AppointmentType.PRIMEIRA_CONSULTA,
      status: AppointmentStatus.CANCELADA,
    },
    {
      patient: "Marcos Vinícius Reis",
      professional: rafael,
      time: "14:00",
      type: AppointmentType.CONSULTA,
      status: AppointmentStatus.AGENDADA,
    },
    {
      patient: "Anderson Lopes Ferreira",
      professional: helena,
      time: "15:00",
      type: AppointmentType.RETORNO,
      status: AppointmentStatus.AGENDADA,
    },
  ];

  let luizaAppointmentId = "";

  for (const seed of todaysAppointments) {
    const patient = byName(seed.patient);
    const startsAt = at(seed.time);
    const id = uuidv7();

    if (seed.patient === "Luiza Fernandes Rocha") luizaAppointmentId = id;

    await prisma.appointment.create({
      data: {
        id,
        patientId: patient.id,
        professionalId: seed.professional.id,
        startsAt,
        endsAt: plusMinutes(startsAt, seed.durationMinutes ?? 30),
        type: seed.type,
        status: seed.status,
        createdById: recepcao.id,
        confirmedAt:
          seed.status === AppointmentStatus.AGENDADA
            ? null
            : plusMinutes(startsAt, -2880),
        checkedInAt:
          seed.checkInOffsetMinutes === undefined
            ? null
            : plusMinutes(startsAt, seed.checkInOffsetMinutes),
        startedAt:
          seed.status === AppointmentStatus.EM_ATENDIMENTO ||
          seed.status === AppointmentStatus.CONCLUIDA
            ? plusMinutes(startsAt, 3)
            : null,
        completedAt:
          seed.status === AppointmentStatus.CONCLUIDA
            ? plusMinutes(startsAt, 28)
            : null,
        cancelledAt:
          seed.status === AppointmentStatus.CANCELADA
            ? plusMinutes(startsAt, -600)
            : null,
        cancelReason:
          seed.status === AppointmentStatus.CANCELADA
            ? "PACIENTE_DESMARCOU"
            : null,
        events: {
          create: [
            {
              id: uuidv7(),
              toStatus: AppointmentStatus.AGENDADA,
              actorId: recepcao.id,
              actorName: recepcao.name,
              channel: "WEB",
              createdAt: plusMinutes(startsAt, -4320),
            },
            ...(seed.status === AppointmentStatus.AGENDADA
              ? []
              : [
                  {
                    id: uuidv7(),
                    fromStatus: AppointmentStatus.AGENDADA,
                    toStatus: AppointmentStatus.CONFIRMADA,
                    actorName: "WhatsApp automatizado",
                    channel: "WHATSAPP" as const,
                    createdAt: plusMinutes(startsAt, -2880),
                  },
                ]),
            ...(seed.checkInOffsetMinutes === undefined
              ? []
              : [
                  {
                    id: uuidv7(),
                    fromStatus: AppointmentStatus.CONFIRMADA,
                    toStatus: AppointmentStatus.CHECK_IN,
                    actorId: recepcao.id,
                    actorName: recepcao.name,
                    channel: "WEB" as const,
                    createdAt: plusMinutes(startsAt, seed.checkInOffsetMinutes),
                  },
                ]),
          ],
        },
      },
    });
  }

  // Grade da semana para consultas futuras.
  const upcoming = [
    {
      patient: "Camila Souza Prado",
      professional: helena,
      time: "10:00",
      day: 1,
    },
    {
      patient: "Bruno Almeida Costa",
      professional: rafael,
      time: "12:00",
      day: 1,
    },
    { patient: "Helena Ribeiro", professional: helena, time: "11:00", day: 2 },
    {
      patient: "Paulo Henrique Matos",
      professional: rafael,
      time: "09:00",
      day: 3,
    },
    { patient: "Juliana Castro", professional: helena, time: "15:00", day: 4 },
    { patient: "Ricardo Menezes", professional: rafael, time: "08:30", day: 5 },
  ];

  for (const seed of upcoming) {
    const startsAt = at(seed.time, seed.day);
    await prisma.appointment.create({
      data: {
        id: uuidv7(),
        patientId: byName(seed.patient).id,
        professionalId: seed.professional.id,
        startsAt,
        endsAt: plusMinutes(startsAt, 30),
        type: AppointmentType.CONSULTA,
        status: AppointmentStatus.AGENDADA,
        createdById: recepcao.id,
        events: {
          create: {
            id: uuidv7(),
            toStatus: AppointmentStatus.AGENDADA,
            actorId: recepcao.id,
            actorName: recepcao.name,
          },
        },
      },
    });
  }

  // Documentos vinculados a consultas e pacientes.
  await prisma.document.createMany({
    data: [
      {
        id: uuidv7(),
        patientId: byName("Luiza Fernandes Rocha").id,
        appointmentId: luizaAppointmentId,
        objectKey: `documents/seed/${uuidv7()}.pdf`,
        fileName: "Hemograma completo.pdf",
        mimeType: "application/pdf",
        byteSize: 1_258_291,
        type: "EXAME_LABORATORIAL",
        source: "Laboratório São Lucas",
        uploadedById: recepcao.id,
      },
      {
        id: uuidv7(),
        patientId: byName("Luiza Fernandes Rocha").id,
        objectKey: `documents/seed/${uuidv7()}.pdf`,
        fileName: "Encaminhamento cardiologia.pdf",
        mimeType: "application/pdf",
        byteSize: 524_288,
        type: "ENCAMINHAMENTO",
        source: "Dr. Rafael Antunes",
        uploadedById: recepcao.id,
      },
      {
        id: uuidv7(),
        patientId: byName("Roberto Nogueira Alves").id,
        objectKey: `documents/seed/${uuidv7()}.pdf`,
        fileName: "Raio-X torax AP-Perfil.pdf",
        mimeType: "application/pdf",
        byteSize: 5_033_164,
        type: "EXAME_IMAGEM",
        uploadedById: recepcao.id,
      },
    ],
  });

  // Funil de pendências e retornos operacionais.
  await prisma.task.createMany({
    data: [
      {
        id: uuidv7(),
        patientId: byName("Carlos Eduardo Dias").id,
        type: TaskType.RESGATE_NO_SHOW,
        title: "Primeira consulta desmarcada — reagendar",
        dueAt: today.endOf("day").toUTC().toJSDate(),
      },
      {
        id: uuidv7(),
        patientId: byName("Roberto Nogueira Alves").id,
        type: TaskType.RETORNO_A_AGENDAR,
        title: "Retorno 30 dias após ajuste medicamentoso",
        dueAt: today.plus({ days: 4 }).endOf("day").toUTC().toJSDate(),
      },
      {
        id: uuidv7(),
        patientId: byName("Luiza Fernandes Rocha").id,
        type: TaskType.ENVIO_DOCUMENTO,
        title: "Enviar guia de encaminhamento cardiológico",
        dueAt: today.plus({ days: 7 }).endOf("day").toUTC().toJSDate(),
      },
      {
        id: uuidv7(),
        patientId: byName("Anderson Lopes Ferreira").id,
        type: TaskType.CONFIRMACAO_PENDENTE,
        title: "Confirmação de consulta de amanhã pendente",
        dueAt: today.set({ hour: 18 }).toUTC().toJSDate(),
      },
      {
        id: uuidv7(),
        patientId: byName("Maria Silva Rodrigues").id,
        type: TaskType.AGUARDANDO_EXAME,
        title: "Aguardando resultado de exames complementares",
        dueAt: today.plus({ days: 11 }).endOf("day").toUTC().toJSDate(),
      },
    ],
  });

  console.log("✅ Pronto.");
  console.log(`   Recepção : ${recepcao.email} / ${PASSWORD}`);
  console.log(`   Gestão   : ${gestor.email} / ${PASSWORD}`);
  console.log(
    `   ${patients.length} pacientes, ${professionals.length} profissionais.`,
  );
}

main()
  .catch((error) => {
    console.error("❌ Falha ao semear:", error);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());
