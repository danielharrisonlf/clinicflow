import { ApiProperty } from "@nestjs/swagger";
import { Role } from "@prisma/client";
import {
  IsEmail,
  IsNotEmpty,
  IsString,
  MaxLength,
  MinLength,
} from "class-validator";

export class LoginDto {
  @ApiProperty({ example: "renata.souza@clinicaviver.com.br" })
  @IsEmail({}, { message: "Informe um e-mail válido." })
  readonly email!: string;

  @ApiProperty({ example: "clinicflow123" })
  @IsString()
  @MinLength(8, { message: "A senha tem no mínimo 8 caracteres." })
  @MaxLength(128)
  readonly password!: string;
}

export class RefreshTokenDto {
  @ApiProperty()
  @IsString()
  @IsNotEmpty()
  readonly refreshToken!: string;
}

export class ForgotPasswordDto {
  @ApiProperty({ example: "gestao@clinicaviver.com.br" })
  @IsEmail()
  readonly email!: string;
}

export class ResetPasswordDto {
  @ApiProperty({ description: "Token recebido por e-mail" })
  @IsString()
  @IsNotEmpty()
  readonly token!: string;

  @ApiProperty({ minLength: 8 })
  @IsString()
  @MinLength(8, { message: "A senha precisa ter ao menos 8 caracteres." })
  readonly password!: string;
}

export class SessionUserDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty() email!: string;
  @ApiProperty({ enum: Role }) role!: Role;
  @ApiProperty({ required: false, nullable: true }) professionalId!:
    | string
    | null;
  /** Rótulo exibido na barra lateral, abaixo do nome ("Recepção"). */
  @ApiProperty() roleLabel!: string;
}

export class AuthResponseDto {
  @ApiProperty() accessToken!: string;
  @ApiProperty() refreshToken!: string;
  @ApiProperty({ type: SessionUserDto }) user!: SessionUserDto;
}
