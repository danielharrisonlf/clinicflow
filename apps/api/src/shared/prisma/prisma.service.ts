import {
  Injectable,
  Logger,
  OnModuleDestroy,
  OnModuleInit,
} from "@nestjs/common";
import { Prisma, PrismaClient } from "@prisma/client";

@Injectable()
export class PrismaService
  extends PrismaClient
  implements OnModuleInit, OnModuleDestroy
{
  private readonly logger = new Logger(PrismaService.name);

  constructor() {
    super({
      log:
        process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
    });
  }

  async onModuleInit(): Promise<void> {
    await this.$connect();
    this.logger.log("Conectado ao PostgreSQL.");
  }

  async onModuleDestroy(): Promise<void> {
    await this.$disconnect();
  }

  /**
   * Traduz a violação da constraint `appointments_no_overlap` (EXCLUDE gist)
   * num sinal que o serviço de consultas entende.
   *
   * A trava vive no banco porque duas recepcionistas podem confirmar o mesmo
   * horário no mesmo instante — a checagem prévia em SQL não vê a transação
   * concorrente, o índice de exclusão vê.
   */
  static isOverlapViolation(error: unknown): boolean {
    return (
      error instanceof Prisma.PrismaClientKnownRequestError &&
      error.code === "P2010" &&
      String(error.meta?.message ?? "").includes("appointments_no_overlap")
    );
  }
}
