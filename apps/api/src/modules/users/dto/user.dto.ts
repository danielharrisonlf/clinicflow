import {
  ApiProperty,
  ApiPropertyOptional,
  OmitType,
  PartialType,
} from "@nestjs/swagger";
import { Role } from "@prisma/client";
import {
  IsBoolean,
  IsEmail,
  IsEnum,
  IsNotEmpty,
  IsOptional,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class CreateUserDto {
  @ApiProperty({ example: "Renata Souza" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(120)
  readonly name!: string;

  @ApiProperty({ example: "renata.souza@clinicaviver.com.br" })
  @IsEmail()
  readonly email!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly password!: string;

  @ApiProperty({ enum: Role, default: Role.RECEPCAO })
  @IsEnum(Role)
  readonly role!: Role;
}

/** Sem `password` nem `role`: cada um tem seu endpoint dedicado, com auditoria própria. */
export class UpdateUserDto extends PartialType(
  OmitType(CreateUserDto, ["password", "role"] as const),
) {
  @ApiPropertyOptional()
  @IsBoolean()
  @IsOptional()
  readonly isActive?: boolean;
}

export class ChangeRoleDto {
  @ApiProperty({ enum: Role })
  @IsEnum(Role)
  readonly role!: Role;
}

export class ResetPasswordDto {
  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8)
  @MaxLength(128)
  readonly password!: string;
}

export class UserResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty() isActive!: boolean;
  @ApiProperty({ nullable: true, type: String }) lastLoginAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) professionalId!: string | null;
}
