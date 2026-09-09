import { ApiProperty } from "@nestjs/swagger";
import {
  IsIn,
  IsInt,
  IsNotEmpty,
  IsString,
  MaxLength,
  Min,
} from "class-validator";

export class CreateUploadUrlDto {
  @ApiProperty({ enum: ["DOCUMENT"], default: "DOCUMENT" })
  @IsIn(["DOCUMENT"])
  readonly purpose!: "DOCUMENT";

  @ApiProperty({ example: "Hemograma completo.pdf" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(180)
  readonly fileName!: string;

  @ApiProperty({ example: "application/pdf" })
  @IsString()
  @IsNotEmpty()
  readonly mimeType!: string;

  @ApiProperty({ example: 1_258_291, description: "Tamanho em bytes" })
  @IsInt()
  @Min(1)
  readonly byteSize!: number;
}

export class ConfirmUploadDto {
  @ApiProperty({ example: "documents/2026-09/018f....pdf" })
  @IsString()
  @IsNotEmpty()
  readonly objectKey!: string;
}
