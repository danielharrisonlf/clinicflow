import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";
import { isValidCpf, normalizeCpf } from "../../../common/utils/cpf.validator";

export const CreatePatientSchema = z.object({
  name: z
    .string({ required_error: "Nome é obrigatório." })
    .trim()
    .min(1, "Nome não pode ser vazio.")
    .max(150, "Nome deve ter no máximo 150 caracteres."),
  birthDate: z
    .string()
    .regex(
      /^\d{4}-\d{2}-\d{2}$/,
      "Data de nascimento deve seguir o formato AAAA-MM-DD.",
    )
    .optional(),
  cpf: z
    .string()
    .trim()
    .transform((val) => normalizeCpf(val))
    .refine((val) => isValidCpf(val), { message: "CPF inválido." })
    .optional(),
  phone: z
    .string({ required_error: "Telefone é obrigatório." })
    .trim()
    .regex(/^[\d\s()+-]{8,20}$/, "Telefone inválido."),
  email: z.string().trim().toLowerCase().email("E-mail inválido.").optional(),
  notes: z
    .string()
    .max(2000, "Observações devem ter no máximo 2000 caracteres.")
    .optional(),
});

export type CreatePatient = z.infer<typeof CreatePatientSchema>;

/** Requisição de cadastro ágil de paciente. */
export class CreatePatientRequest implements CreatePatient {
  @ApiProperty({ example: "Marcos Vinícius Reis" })
  name!: string;

  @ApiPropertyOptional({ example: "1992-04-18", description: "AAAA-MM-DD" })
  birthDate?: string;

  @ApiPropertyOptional({ example: "412.907.338-20" })
  cpf?: string;

  @ApiProperty({ example: "(11) 99721-4408" })
  phone!: string;

  @ApiPropertyOptional({ example: "marcos.reis@email.com" })
  email?: string;

  @ApiPropertyOptional({ example: "Alergia a dipirona e anti-inflamatórios" })
  notes?: string;
}
