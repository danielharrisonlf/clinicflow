import { Injectable } from "@nestjs/common";
import { AppointmentStatus, Channel } from "@prisma/client";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AppointmentDetailDto } from "../dto/appointment-response.dto";
import { TransitionAppointmentService } from "./transition-appointment.service";

@Injectable()
export class ConfirmAppointmentService {
  constructor(
    private readonly transitionService: TransitionAppointmentService,
  ) {}

  execute(
    id: string,
    actor: AuthenticatedUser,
    channel: Channel = Channel.WEB,
  ): Promise<AppointmentDetailDto> {
    return this.transitionService.execute({
      id,
      to: AppointmentStatus.CONFIRMADA,
      actor,
      channel,
    });
  }
}
