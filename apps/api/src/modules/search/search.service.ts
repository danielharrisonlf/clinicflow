import { Injectable } from "@nestjs/common";
import { ApiProperty } from "@nestjs/swagger";
import { AppointmentStatus } from "@prisma/client";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import { ClockService } from "../../shared/clock/clock.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import {
  APPOINTMENT_INCLUDE,
  toAppointmentListItem,
} from "../appointments/appointment.mapper";
import { SettingsService } from "../settings/settings.service";

const GROUP_LIMIT = 5;
const MIN_QUERY_LENGTH = 2;

export class SearchActionDto {
  @ApiProperty({ example: "new-appointment" }) id!: string;
  @ApiProperty({ example: "Nova consulta" }) title!: string;
  @ApiProperty() subtitle!: string;
  @ApiProperty({ example: "N", description: "Tecla de atalho" })
  shortcut!: string;
}

export class SearchPatientDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() phone!: string;
  @ApiProperty({
    nullable: true,
    type: String,
    example: "Dra. Helena Prado (Retorno)",
    description: "Consulta de hoje, se houver",
  })
  subtitle!: string | null;
  @ApiProperty({ nullable: true, type: String, example: "Aguardando" })
  stateLabel!: string | null;
}

export class SearchProfessionalDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() subtitle!: string;
}

export class SearchResultDto {
  @ApiProperty({ type: [SearchActionDto] }) actions!: SearchActionDto[];
  @ApiProperty({ type: [SearchPatientDto] }) patients!: SearchPatientDto[];
  @ApiProperty({ type: [SearchProfessionalDto] })
  professionals!: SearchProfessionalDto[];
}

/**
 * Paleta de comandos ⌘K (busca unificada).
 *
 * Sem paginação: cinco itens por grupo, teto fixo. A paleta é para acertar de
 * primeira com o teclado; uma segunda página aqui significaria que a busca
 * falhou.
 */
@Injectable()
export class SearchService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly settings: SettingsService,
    private readonly clock: ClockService,
  ) {}

  async search(rawQuery: string | undefined): Promise<SearchResultDto> {
    const query = rawQuery?.trim() ?? "";
    const now = this.clock.now();
    const { start, end } = ClinicTime.dayRange(ClinicTime.isoDateOf(now));
    const settings = await this.settings.get();

    const waitingCount = await this.prisma.appointment.count({
      where: {
        status: AppointmentStatus.CHECK_IN,
        startsAt: { gte: start, lt: end },
      },
    });

    const actions = this.buildActions(query, waitingCount);

    // Abaixo de 2 caracteres a busca não discrimina nada: a paleta abre com os
    // pacientes que estão na clínica agora, que é o que a recepção quer ver.
    const patientsQuery =
      query.length < MIN_QUERY_LENGTH
        ? this.prisma.appointment.findMany({
            where: {
              startsAt: { gte: start, lt: end },
              status: {
                in: [
                  AppointmentStatus.CHECK_IN,
                  AppointmentStatus.EM_ATENDIMENTO,
                  AppointmentStatus.CONFIRMADA,
                ],
              },
            },
            include: APPOINTMENT_INCLUDE,
            orderBy: { startsAt: "asc" },
            take: GROUP_LIMIT,
          })
        : null;

    if (patientsQuery) {
      const recent = await patientsQuery;
      return {
        actions,
        patients: recent.map((appointment) => {
          const item = toAppointmentListItem(
            appointment,
            now,
            settings.lateToleranceMinutes,
          );
          return {
            id: item.patientId,
            name: item.patientName,
            phone: item.patientPhone,
            subtitle: `${item.professionalName} (${friendlyType(item.type)})`,
            stateLabel: item.stateLabel,
          };
        }),
        professionals: [],
      };
    }

    const digits = query.replace(/\D/g, "");

    const [patients, professionals] = await Promise.all([
      this.prisma.patient.findMany({
        where: {
          deletedAt: null,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            ...(digits.length >= 3
              ? [{ phone: { contains: digits } }, { cpf: { contains: digits } }]
              : []),
          ],
        },
        include: {
          appointments: {
            where: { startsAt: { gte: start, lt: end } },
            include: APPOINTMENT_INCLUDE,
            orderBy: { startsAt: "asc" },
            take: 1,
          },
        },
        orderBy: { name: "asc" },
        take: GROUP_LIMIT,
      }),
      this.prisma.professional.findMany({
        where: {
          isActive: true,
          OR: [
            { name: { contains: query, mode: "insensitive" } },
            { specialty: { contains: query, mode: "insensitive" } },
          ],
        },
        orderBy: { name: "asc" },
        take: GROUP_LIMIT,
      }),
    ]);

    return {
      actions,
      patients: patients.map((patient) => {
        const todays = patient.appointments[0];
        const item = todays
          ? toAppointmentListItem(todays, now, settings.lateToleranceMinutes)
          : null;
        return {
          id: patient.id,
          name: patient.name,
          phone: patient.phone,
          subtitle: item
            ? `${item.professionalName} (${friendlyType(item.type)})`
            : null,
          stateLabel: item?.stateLabel ?? null,
        };
      }),
      professionals: professionals.map((professional) => ({
        id: professional.id,
        name: professional.name,
        subtitle: `${professional.specialty} (${professional.councilType} ${professional.councilNumber})`,
      })),
    };
  }

  /** As "AÇÕES OPERACIONAIS" da paleta, filtradas pelo que foi digitado. */
  private buildActions(query: string, waitingCount: number): SearchActionDto[] {
    const all: SearchActionDto[] = [
      {
        id: "new-appointment",
        title: "Nova consulta",
        subtitle:
          "Agendar paciente com validação instantânea de horários livres",
        shortcut: "N",
      },
      {
        id: "open-waiting-room",
        title: "Abrir Sala de espera",
        subtitle: `${waitingCount} paciente(s) aguardando no balcão`,
        shortcut: "S",
      },
      {
        id: "new-patient",
        title: "Cadastrar paciente",
        subtitle: "Cadastro ágil para agendamento na recepção",
        shortcut: "P",
      },
    ];

    if (query.length < MIN_QUERY_LENGTH) return all.slice(0, 2);

    const term = query.toLowerCase();
    return all
      .filter((action) => action.title.toLowerCase().includes(term))
      .slice(0, GROUP_LIMIT);
  }
}

const TYPE_LABEL: Record<string, string> = {
  PRIMEIRA_CONSULTA: "Primeira consulta",
  CONSULTA: "Consulta",
  RETORNO: "Retorno",
  AVALIACAO: "Avaliação",
};

function friendlyType(type: string): string {
  return TYPE_LABEL[type] ?? type;
}
