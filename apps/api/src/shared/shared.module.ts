import { Global, Module } from "@nestjs/common";
import { AuditService } from "./audit/audit.service";
import { ClockService } from "./clock/clock.service";
import { HttpClientService } from "./http-client/http-client.service";
import { MailService } from "./mail/mail.service";

/**
 * Serviços transversais usados por praticamente todo módulo de domínio.
 * Global para não repetir o import em doze módulos — e só isto é global:
 * regra de negócio nenhuma mora aqui.
 */
@Global()
@Module({
  providers: [ClockService, HttpClientService, AuditService, MailService],
  exports: [ClockService, HttpClientService, AuditService, MailService],
})
export class SharedModule {}
