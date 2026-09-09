import { ApiProperty } from "@nestjs/swagger";
import { IsNotEmpty, IsString, MaxLength } from "class-validator";

export class WhatsappWebhookDto {
  @ApiProperty({ example: "+5511984321190", description: "Número do paciente" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(30)
  readonly from!: string;

  @ApiProperty({ example: "SIM" })
  @IsString()
  @IsNotEmpty()
  @MaxLength(500)
  readonly message!: string;

  @ApiProperty({ example: "2026-09-09T17:02:00.000Z" })
  @IsString()
  @IsNotEmpty()
  readonly receivedAt!: string;
}
