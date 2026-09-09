import { Injectable } from "@nestjs/common";
import { Channel, Prisma } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { PrismaService } from "../prisma/prisma.service";

export interface RecordAuditParams {
  actor?: AuthenticatedUser | null;
  action: string;
  entity: string;
  entityId: string;
  channel?: Channel;
  before?: Prisma.InputJsonValue;
  after?: Prisma.InputJsonValue;
  ip?: string;
}

/**
 * Trilha de auditoria geral da clínica.
 *
 * Distinta do `AppointmentEvent`: aquele é a linha do tempo que a recepção lê
 * no painel da consulta, este é o registro administrativo de quem mudou o quê,
 * incluindo configuração e perfis de acesso.
 */
@Injectable()
export class AuditService {
  constructor(private readonly prisma: PrismaService) {}

  async record(params: RecordAuditParams): Promise<void> {
    await this.prisma.auditLog.create({
      data: {
        id: uuidv7(),
        actorId: params.actor?.id ?? null,
        actorName: params.actor?.name ?? null,
        action: params.action,
        entity: params.entity,
        entityId: params.entityId,
        channel: params.channel ?? Channel.WEB,
        ...(params.before === undefined ? {} : { before: params.before }),
        ...(params.after === undefined ? {} : { after: params.after }),
        ip: params.ip ?? null,
      },
    });
  }
}
