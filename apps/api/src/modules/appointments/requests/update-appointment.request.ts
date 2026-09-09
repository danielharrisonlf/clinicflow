import { ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

export const UpdateAppointmentSchema = z.object({
  notes: z.string().max(1000).optional(),
  room: z.string().max(40).optional(),
});

export type UpdateAppointment = z.infer<typeof UpdateAppointmentSchema>;

export class UpdateAppointmentRequest implements UpdateAppointment {
  @ApiPropertyOptional({
    description: "Observação operacional",
    example: "Paciente solicitou aviso por WhatsApp quando o médico chamar",
  })
  notes?: string;

  @ApiPropertyOptional({
    description: "Sala de atendimento",
    example: "Consultório 2",
  })
  room?: string;
}
