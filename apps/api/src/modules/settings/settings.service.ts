import { Injectable } from "@nestjs/common";
import { Channel, ClinicSettings, Prisma } from "@prisma/client";
import { uuidv7 } from "uuidv7";
import { config } from "../../common/config";
import { CursorPageDto } from "../../common/dto/cursor-page.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import { ClinicTime } from "../../common/utils/clinic-time.util";
import { paginateByCursor } from "../../common/utils/paginate.util";
import { AuditService } from "../../shared/audit/audit.service";
import { PrismaService } from "../../shared/prisma/prisma.service";
import {
  AuditLogItemDto,
  AuditLogQueryDto,
  SettingsResponseDto,
  UpdateSettingsDto,
  UpdateWhatsappSettingsDto,
  WhatsappSettingsResponseDto,
} from "./dto/settings.dto";

const CACHE_TTL_MS = 30_000;

/**
 * Parâmetros operacionais e configurações da clínica.
 *
 * Lido em quase toda requisição de consulta — a tolerância de atraso decide o
 * selo "Atrasada" de cada linha do painel. Por isso o cache curto em memória:
 * sem ele, desenhar uma tabela de dez linhas custaria uma ida extra ao banco
 * a cada 5 segundos de polling.
 */
@Injectable()
export class SettingsService {
  private cache: { value: ClinicSettings; expiresAt: number } | null = null;

  constructor(
    private readonly prisma: PrismaService,
    private readonly audit: AuditService,
  ) {}

  async get(): Promise<ClinicSettings> {
    if (this.cache && this.cache.expiresAt > Date.now()) {
      return this.cache.value;
    }

    const settings =
      (await this.prisma.clinicSettings.findFirst()) ??
      (await this.bootstrap());
    this.cache = { value: settings, expiresAt: Date.now() + CACHE_TTL_MS };
    return settings;
  }

  async getForScreen(): Promise<SettingsResponseDto> {
    const settings = await this.get();
    const clinic = await this.prisma.clinic.findUnique({
      where: { id: settings.clinicId },
    });
    return {
      clinicName: clinic?.name ?? "Clínica",
      timezone: clinic?.timezone ?? config.timezone,
      defaultDurationMinutes: settings.defaultDurationMinutes,
      confirmationLeadHours: settings.confirmationLeadHours,
      returnWindowDays: settings.returnWindowDays,
      lateToleranceMinutes: settings.lateToleranceMinutes,
    };
  }

  async update(
    dto: UpdateSettingsDto,
    actor: AuthenticatedUser,
  ): Promise<SettingsResponseDto> {
    const before = await this.get();

    const updated = await this.prisma.clinicSettings.update({
      where: { id: before.id },
      data: {
        ...(dto.defaultDurationMinutes === undefined
          ? {}
          : { defaultDurationMinutes: dto.defaultDurationMinutes }),
        ...(dto.confirmationLeadHours === undefined
          ? {}
          : { confirmationLeadHours: dto.confirmationLeadHours }),
        ...(dto.returnWindowDays === undefined
          ? {}
          : { returnWindowDays: dto.returnWindowDays }),
        ...(dto.lateToleranceMinutes === undefined
          ? {}
          : { lateToleranceMinutes: dto.lateToleranceMinutes }),
      },
    });

    this.invalidate(updated);

    await this.audit.record({
      actor,
      action: "settings.updated",
      entity: "ClinicSettings",
      entityId: updated.id,
      before: {
        defaultDurationMinutes: before.defaultDurationMinutes,
        confirmationLeadHours: before.confirmationLeadHours,
        returnWindowDays: before.returnWindowDays,
        lateToleranceMinutes: before.lateToleranceMinutes,
      },
      after: { ...dto },
    });

    return this.getForScreen();
  }

  async getWhatsapp(): Promise<WhatsappSettingsResponseDto> {
    const settings = await this.get();
    return {
      whatsappEnabled: settings.whatsappEnabled,
      whatsappTemplate: settings.whatsappTemplate,
      transport: config.notifications.transport,
    };
  }

  async updateWhatsapp(
    dto: UpdateWhatsappSettingsDto,
    actor: AuthenticatedUser,
  ): Promise<WhatsappSettingsResponseDto> {
    const before = await this.get();
    const updated = await this.prisma.clinicSettings.update({
      where: { id: before.id },
      data: {
        whatsappEnabled: dto.whatsappEnabled,
        whatsappTemplate: dto.whatsappTemplate,
      },
    });
    this.invalidate(updated);

    await this.audit.record({
      actor,
      action: "settings.whatsapp_updated",
      entity: "ClinicSettings",
      entityId: updated.id,
      before: { whatsappEnabled: before.whatsappEnabled },
      after: { whatsappEnabled: updated.whatsappEnabled },
    });

    return this.getWhatsapp();
  }

  /** Aba "Log de Auditoria" — cursor, porque a tabela só cresce. */
  async auditLog(
    query: AuditLogQueryDto,
  ): Promise<CursorPageDto<AuditLogItemDto>> {
    const where: Prisma.AuditLogWhereInput = {
      ...(query.actorId ? { actorId: query.actorId } : {}),
      ...(query.entity ? { entity: query.entity } : {}),
      ...(query.action ? { action: query.action } : {}),
    };

    if (query.from || query.to) {
      const range = ClinicTime.rangeOf(
        query.from ?? query.to ?? "",
        query.to ?? query.from ?? "",
        366,
      );
      where.createdAt = { gte: range.start, lt: range.end };
    }

    const page = await paginateByCursor(
      query,
      ({ take, cursor }) =>
        this.prisma.auditLog.findMany({
          take,
          where: cursor
            ? {
                ...where,
                // Seek composto: a coluna temporal mais o id como desempate.
                OR: [
                  { createdAt: { lt: cursor.at } },
                  { createdAt: cursor.at, id: { lt: cursor.id } },
                ],
              }
            : where,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
        }),
      (row) => ({ at: row.createdAt, id: row.id }),
    );

    return new CursorPageDto(
      page.data.map((row) => ({
        id: row.id,
        actorName: row.actorName,
        action: row.action,
        entity: row.entity,
        entityId: row.entityId,
        channel: row.channel as Channel,
        createdAt: row.createdAt.toISOString(),
      })),
      page.meta,
    );
  }

  /** Primeira execução: cria a clínica e os padrões operacionais iniciais. */
  private async bootstrap(): Promise<ClinicSettings> {
    const clinic = await this.prisma.clinic.create({
      data: {
        id: uuidv7(),
        name: "Clínica Viver",
        timezone: config.timezone,
        settings: { create: { id: uuidv7() } },
      },
      include: { settings: true },
    });
    // `create` acima sempre materializa o relacionamento; o `?? throw` só existe
    // porque o tipo gerado admite null.
    if (!clinic.settings)
      throw new Error("Falha ao inicializar as configurações da clínica.");
    return clinic.settings;
  }

  private invalidate(value: ClinicSettings): void {
    this.cache = { value, expiresAt: Date.now() + CACHE_TTL_MS };
  }
}
