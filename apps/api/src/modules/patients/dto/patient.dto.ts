import { ApiProperty, ApiPropertyOptional, PartialType } from "@nestjs/swagger";
import { Transform, Type } from "class-transformer";
import {
  IsBoolean,
  IsDateString,
  IsEmail,
  IsNotEmpty,
  IsOptional,
  IsString,
  Matches,
  MaxLength,
} from "class-validator";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";
import { IsCpf, normalizeCpf } from "../../../common/utils/cpf.validator";

/** DTO de criação de paciente. */
export class CreatePatientDto {
  @ApiProperty({ example: "Marcos Vinícius Reis" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(150)
  readonly name!: string;

  @ApiPropertyOptional({ example: "1992-04-18", description: "AAAA-MM-DD" })
  @IsDateString()
  @IsOptional()
  readonly birthDate?: string;

  @ApiPropertyOptional({ example: "412.907.338-20" })
  @IsCpf()
  @IsOptional()
  @Transform(({ value }) =>
    typeof value === "string" ? normalizeCpf(value) : value,
  )
  readonly cpf?: string;

  @ApiProperty({ example: "(11) 99721-4408" })
  @IsString()
  @Matches(/^[\d\s()+-]{8,20}$/, { message: "Telefone inválido." })
  readonly phone!: string;

  @ApiPropertyOptional({ example: "marcos.reis@email.com" })
  @IsEmail()
  @IsOptional()
  readonly email?: string;

  @ApiPropertyOptional({ example: "Alergia a dipirona e anti-inflamatórios" })
  @IsString()
  @MaxLength(2000)
  @IsOptional()
  readonly notes?: string;
}

export class UpdatePatientDto extends PartialType(CreatePatientDto) {}

export class ListPatientsQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ description: "Apenas pacientes com pendência aberta" })
  @Type(() => Boolean)
  @IsBoolean()
  @IsOptional()
  readonly hasPendencies?: boolean;
}

/** DTO de resposta para item da listagem de pacientes. */
export class PatientListItemDto {
  @ApiProperty() id!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ nullable: true, type: Number }) age!: number | null;
  @ApiProperty() phone!: string;
  @ApiProperty({ nullable: true, type: String }) lastVisitAt!: string | null;
  @ApiProperty({ nullable: true, type: String }) nextVisitAt!: string | null;
  @ApiProperty({ description: "Tarefas em aberto do paciente" })
  openTasksCount!: number;
}

export class PatientDetailDto extends PatientListItemDto {
  @ApiProperty({ nullable: true, type: String }) cpf!: string | null;
  @ApiProperty({ nullable: true, type: String }) birthDate!: string | null;
  @ApiProperty({ nullable: true, type: String }) email!: string | null;
  @ApiProperty({ nullable: true, type: String }) notes!: string | null;
  @ApiProperty() createdAt!: string;
}

/** Contadores consolidados e métricas do paciente. */
export class PatientSummaryDto {
  @ApiProperty() appointmentsCount!: number;
  @ApiProperty() cancelledCount!: number;
  @ApiProperty() documentsCount!: number;
  @ApiProperty() openTasksCount!: number;
}
