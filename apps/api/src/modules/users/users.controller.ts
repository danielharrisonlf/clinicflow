import {
  Body,
  Controller,
  Get,
  HttpCode,
  HttpStatus,
  Param,
  ParseUUIDPipe,
  Patch,
  Post,
  Query,
} from "@nestjs/common";
import { ApiBearerAuth, ApiOperation, ApiTags } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import { ApiPageResponse } from "../../common/decorators/api-paginated-response.decorator";
import { CurrentUser } from "../../common/decorators/current-user.decorator";
import { Roles } from "../../common/decorators/roles.decorator";
import { PageOptionsDto } from "../../common/dto/page-options.dto";
import type { AuthenticatedUser } from "../../common/interfaces/authenticated-user.interface";
import {
  ChangeRoleDto,
  CreateUserDto,
  ResetPasswordDto,
  UpdateUserDto,
  UserResponseDto,
} from "./dto/user.dto";
import { UsersService } from "./users.service";

@ApiTags("Perfis de acesso")
@ApiBearerAuth()
@Roles(Role.GESTOR)
@Controller("users")
export class UsersController {
  constructor(private readonly usersService: UsersService) {}

  @Get()
  @ApiOperation({ summary: "Listar acessos da clínica" })
  @ApiPageResponse(UserResponseDto)
  findAll(@Query() options: PageOptionsDto) {
    return this.usersService.findAll(options);
  }

  @Post()
  @HttpCode(HttpStatus.CREATED)
  @ApiOperation({ summary: "Criar acesso" })
  create(@Body() dto: CreateUserDto, @CurrentUser() actor: AuthenticatedUser) {
    return this.usersService.create(dto, actor);
  }

  @Patch(":id")
  @ApiOperation({ summary: "Editar nome, e-mail ou situação do acesso" })
  update(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: UpdateUserDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.update(id, dto, actor);
  }

  @Patch(":id/role")
  @ApiOperation({ summary: "Trocar o perfil de acesso" })
  changeRole(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ChangeRoleDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.changeRole(id, dto.role, actor);
  }

  @Patch(":id/password")
  @HttpCode(HttpStatus.NO_CONTENT)
  @ApiOperation({
    summary: "Definir nova senha administrativamente",
  })
  resetPassword(
    @Param("id", ParseUUIDPipe) id: string,
    @Body() dto: ResetPasswordDto,
    @CurrentUser() actor: AuthenticatedUser,
  ) {
    return this.usersService.resetPassword(id, dto.password, actor);
  }
}
