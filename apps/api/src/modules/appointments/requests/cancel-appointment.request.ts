import { ApiPropertyOptional } from "@nestjs/swagger";
import { CancelReason } from "@prisma/client";
import { z } from "zod";

export const CancelAppointmentSchema = z
  .object({
    reason: z
      .nativeEnum(CancelReason, {
        errorMap: () => ({ message: "Motivo de cancelamento inválido." }),
      })
      .optional(),
    reasonCode: z
      .nativeEnum(CancelReason, {
        errorMap: () => ({ message: "Motivo de cancelamento inválido." }),
      })
      .optional(),
    notes: z.string().max(500).optional(),
    note: z.string().max(500).optional(),
  })
  .superRefine((val, ctx) => {
    const reason = val.reason ?? val.reasonCode;
    const note = val.notes ?? val.note;
    if (!reason) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["reason"],
        message: "Motivo de cancelamento é obrigatório.",
      });
    }
    if (reason === CancelReason.OUTRO && (!note || note.trim().length < 3)) {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        path: ["notes"],
        message:
          'Quando o motivo for "Outro", o detalhamento é obrigatório (mín. 3 caracteres).',
      });
    }
  });

export type CancelAppointment = z.infer<typeof CancelAppointmentSchema>;

export class CancelAppointmentRequest implements CancelAppointment {
  @ApiPropertyOptional({
    enum: CancelReason,
    description: "Motivo do cancelamento (obrigatório, auditado)",
    example: CancelReason.PACIENTE_DESMARCOU,
  })
  reason?: CancelReason;

  @ApiPropertyOptional({
    enum: CancelReason,
    description: "Alias para reason",
  })
  reasonCode?: CancelReason;

  @ApiPropertyOptional({
    description:
      'Detalhamento obrigatório se reason = "OUTRO", opcional nos outros casos',
    example: "Paciente avisou que teve imprevisto pessoal.",
  })
  notes?: string;

  @ApiPropertyOptional({
    description: "Alias para notes",
  })
  note?: string;
}
