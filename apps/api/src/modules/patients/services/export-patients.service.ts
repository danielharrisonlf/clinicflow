import { Readable } from "node:stream";
import { Injectable, StreamableFile } from "@nestjs/common";
import { ClinicTime } from "../../../common/utils/clinic-time.util";
import { PrismaService } from "../../../shared/prisma/prisma.service";
import { ListPatientsQueryRequest } from "../requests/list-patients.request";
import { FindAllPatientsService } from "./find-all-patients.service";

function csvCell(value: string): string {
  return `"${value.replace(/"/g, '""')}"`;
}

@Injectable()
export class ExportPatientsService {
  constructor(
    private readonly prisma: PrismaService,
    private readonly findAllService: FindAllPatientsService,
  ) {}

  /** Exportação da listagem de pacientes em CSV. */
  async execute(options: ListPatientsQueryRequest): Promise<StreamableFile> {
    const patients = await this.prisma.patient.findMany({
      where: this.findAllService.buildWhere(options),
      orderBy: [{ name: "asc" }, { id: "asc" }],
      take: 5000,
    });

    const header = "nome;cpf;telefone;email;nascimento\n";
    const rows = patients
      .map((p) =>
        [
          csvCell(p.name),
          csvCell(p.cpf ?? ""),
          csvCell(p.phone),
          csvCell(p.email ?? ""),
          p.birthDate ? ClinicTime.isoDateOf(p.birthDate) : "",
        ].join(";"),
      )
      .join("\n");

    return new StreamableFile(Readable.from([header + rows]), {
      type: "text/csv; charset=utf-8",
      disposition: 'attachment; filename="pacientes.csv"',
    });
  }
}
