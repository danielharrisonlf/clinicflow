import { Injectable } from "@nestjs/common";
import { AppException } from "../../../common/exceptions/app.exception";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TaskWithPatient } from "../task.mapper";

@Injectable()
export class FindTaskByIdService {
  constructor(private readonly prisma: PrismaService) {}

  async getOrThrow(id: string): Promise<TaskWithPatient> {
    const task = await this.prisma.task.findUnique({
      where: { id },
      include: { patient: { select: { id: true, name: true, phone: true } } },
    });
    if (!task) throw AppException.notFound("Pendência", id);
    return task;
  }
}
