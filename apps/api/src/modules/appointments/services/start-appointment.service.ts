import { Injectable } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { TransitionAppointmentService } from "./transition-appointment.service";

@Injectable()
export class StartAppointmentService {
  constructor(
    private readonly transitionService: TransitionAppointmentService,
  ) {}

  execute(id: string, actor: AuthenticatedUser): Promise<AppointmentDetailDto> {
    return this.transitionService.execute({
      id,
      to: AppointmentStatus.EM_ATENDIMENTO,
      actor,
    });
  }
}
