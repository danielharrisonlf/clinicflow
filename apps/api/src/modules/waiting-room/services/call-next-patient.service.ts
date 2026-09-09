import { Injectable } from "@nestjs/common";
import type { AuthenticatedUser } from "../../../common/interfaces/authenticated-user.interface";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { WaitingRoomItemDto } from "../waiting-room.service";
import { ListWaitingRoomService } from "./list-waiting-room.service";

@Injectable()
export class CallNextPatientService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
    private readonly listService: ListWaitingRoomService,
  ) {}

  /**
   * "Chamar próximo" / atalho [Espaço].
   */
  async execute(actor: AuthenticatedUser): Promise<WaitingRoomItemDto | null> {
    const queue = await this.listService.execute();
    const next = queue.find((item) => !item.wasCalled) ?? queue[0];
    if (!next) return null;

    await this.prisma.appointment.update({
      where: { id: next.appointmentId },
      data: { calledAt: this.clock.now() },
    });

    void actor;
    return { ...next, wasCalled: true };
  }
}
