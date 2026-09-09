import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { DocumentType } from "@prisma/client";
import {
  IsEnum,
  IsISO8601,
  IsNotEmpty,
  IsOptional,
  IsString,
  IsUUID,
  MaxLength,
} from "class-validator";
import { PageOptionsDto } from "../../../common/dto/page-options.dto";

/** Confirma o upload feito contra a URL assinada e cria o metadado. */
export class CreateDocumentDto {
  @ApiProperty({ example: "documents/2026-09/018f....pdf" })
  @IsString()
  @IsNotEmpty()
  readonly objectKey!: string;

  @ApiProperty() @IsUUID() readonly patientId!: string;

  @ApiPropertyOptional({
    description: "Vincula também a uma consulta",
  })
  @IsUUID()
  @IsOptional()
  readonly appointmentId?: string;

  @ApiProperty({ example: "Hemograma completo.pdf" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  readonly fileName!: string;

  @ApiPropertyOptional({
    enum: DocumentType,
    description: "Se omitido, é classificado pelo nome do arquivo.",
  })
  @IsEnum(DocumentType)
  @IsOptional()
  readonly type?: DocumentType;

  @ApiPropertyOptional({ example: "Laboratório São Lucas" })
  @IsString()
  @MaxLength(120)
  @IsOptional()
  readonly source?: string;
}

export class UpdateDocumentDto {
  @ApiPropertyOptional({ enum: DocumentType })
  @IsEnum(DocumentType)
  @IsOptional()
  readonly type?: DocumentType;

  @ApiPropertyOptional() @IsUUID() @IsOptional() readonly patientId?: string;
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  readonly appointmentId?: string;
  @ApiPropertyOptional()
  @IsString()
  @MaxLength(120)
  @IsOptional()
  readonly source?: string;
}

export class ListDocumentsQueryDto extends PageOptionsDto {
  @ApiPropertyOptional({ enum: DocumentType })
  @IsEnum(DocumentType)
  @IsOptional()
  readonly type?: DocumentType;

  @ApiPropertyOptional() @IsUUID() @IsOptional() readonly patientId?: string;
  @ApiPropertyOptional()
  @IsUUID()
  @IsOptional()
  readonly appointmentId?: string;

  @ApiPropertyOptional({ example: "2026-08-01" })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly from?: string;

  @ApiPropertyOptional({ example: "2026-09-30" })
  @IsISO8601({ strict: true })
  @IsOptional()
  readonly to?: string;
}

/** DTO de resposta de documento. */
export class DocumentResponseDto {
  @ApiProperty() id!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty({ example: "PDF", description: "Selo de formato da linha" })
  format!: string;
  @ApiProperty({ enum: DocumentType }) type!: DocumentType;
  @ApiProperty({ example: "Exame laboratorial" }) typeLabel!: string;
  @ApiProperty() patientId!: string;
  @ApiProperty() patientName!: string;
  @ApiProperty({ nullable: true, type: String }) appointmentId!: string | null;
  @ApiProperty() byteSize!: number;
  @ApiProperty({ example: "1,2 MB" }) sizeLabel!: string;
  @ApiProperty({ nullable: true, type: String }) source!: string | null;
  @ApiProperty() createdAt!: string;
}

export class DocumentDownloadDto {
  @ApiProperty({ description: "URL assinada, válida por tempo limitado" })
  url!: string;
  @ApiProperty() fileName!: string;
  @ApiProperty() expiresIn!: number;
}
