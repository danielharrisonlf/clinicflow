import { Body, Controller, Get, Patch, Put, Query } from "@nestjs/common";
import {
  ApiBearerAuth,
  ApiOkResponse,
  ApiOperation,
  ApiTags,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ApiCursorResponse } from "../../common/decorators/api-paginated-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import {
  AuditLogItemDto,
  AuditLogQueryDto,
  SettingsResponseDto,
  UpdateSettingsDto,
  UpdateWhatsappSettingsDto,
  WhatsappSettingsResponseDto,
} from "./dto/settings.dto";
import { SettingsService } from "./settings.service";

@ApiTags("Configurações")
@ApiBearerAuth()
@Controller("settings")
export class SettingsController {
  constructor(private readonly settingsService: SettingsService) {}

  @Get()
  @ApiOperation({ summary: "Parâmetros operacionais (aba Horários e Grade)" })
  @ApiOkResponse({ type: SettingsResponseDto })
  get(): Promise<SettingsResponseDto> {
    return this.settingsService.getForScreen();
  }

  @Patch()
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: "Salvar alterações dos parâmetros" })
  update(
    @Body() dto: UpdateSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.settingsService.update(dto, actor);
  }

  @Get("whatsapp")
  @ApiOperation({ summary: "Automação WhatsApp" })
  @ApiOkResponse({ type: WhatsappSettingsResponseDto })
  getWhatsapp(): Promise<WhatsappSettingsResponseDto> {
    return this.settingsService.getWhatsapp();
  }

  @Put("whatsapp")
  @Roles(Role.GESTOR)
  @ApiOperation({ summary: "Configurar a automação de confirmação" })
  updateWhatsapp(
    @Body() dto: UpdateWhatsappSettingsDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.settingsService.updateWhatsapp(dto, actor);
  }

  @Get("audit-log")
  @Roles(Role.GESTOR)
  @ApiOperation({
    summary: "Log de auditoria da clínica (paginação por cursor)",
  })
  @ApiCursorResponse(AuditLogItemDto)
  auditLog(@Query() query: AuditLogQueryDto) {
    return this.settingsService.auditLog(query);
  }
}
