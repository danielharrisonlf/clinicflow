import { Injectable } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { PageDto } from "../../../common/dto/page.dto";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { paginate } from "../../../common/utils/paginate.util";
import { ClockService } from "../../../shared/clock/clock.service";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { TaskResponseDto } from "../dto/task.dto";
import { ListTasksQueryRequest } from "../requests/list-tasks.request";
import { OPEN_STATUSES, toTaskResponse } from "../task.mapper";

@Injectable()
export class FindAllTasksService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly clock: ClockService,
  ) {}

  async execute(
    query: ListTasksQueryRequest | PageOptionsDto,
    overrides: { patientId?: string } = {},
  ): Promise<PageDto<TaskResponseDto>> {
    const filters = query as ListTasksQueryRequest;
    const where: Prisma.TaskWhereInput = {};

    where.status = {
      in: filters.status?.length ? filters.status : OPEN_STATUSES,
    };

    if (filters.type?.length) where.type = { in: filters.type };
    if (overrides.patientId ?? filters.patientId) {
      where.patientId = overrides.patientId ?? filters.patientId;
    }
    if (filters.assigneeId) where.assigneeId = filters.assigneeId;
    if (filters.dueBefore) {
      where.dueAt = { lte: ClinicTime.dayRange(filters.dueBefore).end };
    }
    if (filters.search) {
      where.OR = [
        { title: { contains: filters.search, mode: "insensitive" } },
        {
          patient: { name: { contains: filters.search, mode: "insensitive" } },
        },
      ];
    }

    const page = await paginate(
      query,
      (args) =>
        this.prisma.task.findMany({
          ...args,
          where,
          include: {
            patient: { select: { id: true, name: true, phone: true } },
          },
          orderBy: [{ dueAt: { sort: "asc", nulls: "last" } }, { id: "asc" }],
        }),
      () => this.prisma.task.count({ where }),
    );

    const now = this.clock.now();
    return new PageDto(
      page.data.map((task) => toTaskResponse(task, now)),
      page.meta,
    );
  }
}
