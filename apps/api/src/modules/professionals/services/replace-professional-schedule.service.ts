import { Injectable } from "@nestjs/common";
import { uuidv7 } from "uuidv7";
import { AppException } from "../../../common/exceptions/app.exception";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { minutesOfDay } from "../../../common/utils/clinic-time.util";
import { AuditService } from "../../../shared/audit/audit.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ProfessionalScheduleDto } from "../dto/professional.dto";
import { ReplaceScheduleRequest } from "../requests/replace-schedule.request";
import { FindProfessionalByIdService } from "./find-professional-by-id.service";
import { GetProfessionalScheduleService } from "./get-professional-schedule.service";
import { WEEKDAY_SHORT } from "./professional-enricher.service";

@Injectable()
export class ReplaceProfessionalScheduleService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
    private readonly findByIdService: FindProfessionalByIdService,
    private readonly getScheduleService: GetProfessionalScheduleService,
  ) {}

  /**
   * Substitui a grade inteira em uma transação.
   */
  async execute(
    id: string,
    dto: ReplaceScheduleRequest,
    actor: AuthenticatedUser,
  ): Promise<ProfessionalScheduleDto> {
    await this.findByIdService.getOrThrow(id);

    for (const window of dto.windows) {
      if (minutesOfDay(window.endTime) <= minutesOfDay(window.startTime)) {
        throw AppException.unprocessable(
          "VALIDATION_FAILED",
          `Janela inválida em ${WEEKDAY_SHORT[window.weekday]}: ${window.startTime} – ${window.endTime}.`,
        );
      }
    }

    await this.prisma.$transaction([
      this.prisma.scheduleWindow.deleteMany({ where: { professionalId: id } }),
      this.prisma.scheduleWindow.createMany({
        data: dto.windows.map((window) => ({
          id: uuidv7(),
          professionalId: id,
          weekday: window.weekday,
          startTime: window.startTime,
          endTime: window.endTime,
          room: window.room ?? null,
        })),
      }),
    ]);

    await this.audit.record({
      actor,
      action: "professional.schedule_replaced",
      entity: "Professional",
      entityId: id,
      after: { windows: dto.windows.length },
    });

    return this.getScheduleService.execute(id);
  }
}
