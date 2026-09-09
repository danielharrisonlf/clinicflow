import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { AppointmentsService } from "../../appointments/appointments.service";

@Injectable()
export class StartAttendanceService {
  constructor(private readonly appointments: AppointmentsService) {}

  /** Inicia o atendimento do paciente selecionado na sala de espera. */
  execute(appointmentId: string, actor: AuthenticatedUser) {
    return this.appointments.start(appointmentId, actor);
  }
}
