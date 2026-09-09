import { Controller, Get } from "@nestjs/common";
import { ApiOperation, ApiTags } from "@nestjs/swagger";
import {
  HealthCheck,
  HealthCheckService,
  PrismaHealthIndicator,
} from "@nestjs/terminus";
import { Public } from "../../common/decorators/public.decorator";
import { PrismaService } from "../../shared/prisma/prisma.service";

@ApiTags("Saúde do serviço")
@Controller("health")
export class HealthController {
  constructor(
    private readonly health: HealthCheckService,
    private readonly prismaIndicator: PrismaHealthIndicator,
    private readonly prisma: PrismaService,
  ) {}

  /**
   * Liveness: só diz que o processo responde. É o alvo do HEALTHCHECK do
   * Docker — se dependesse do banco, uma queda momentânea do Postgres faria o
   * orquestrador matar um contêiner que estava perfeitamente vivo.
   */
  @Public()
  @Get()
  @ApiOperation({ summary: "Liveness (usado pelo HEALTHCHECK do contêiner)" })
  live(): { status: string; uptime: number } {
    return { status: "ok", uptime: Math.round(process.uptime()) };
  }

  @Public()
  @Get("ready")
  @HealthCheck()
  @ApiOperation({ summary: "Readiness: banco acessível" })
  ready() {
    return this.health.check([
      () => this.prismaIndicator.pingCheck("database", this.prisma),
    ]);
  }
}
