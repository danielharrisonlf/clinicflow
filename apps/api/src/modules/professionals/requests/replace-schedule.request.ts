import { ApiProperty, ApiPropertyOptional } from "@nestjs/swagger";
import { z } from "zod";

const TIME_PATTERN = /^([01]\d|2[0-3]):[0-5]\d$/;

export const ScheduleWindowSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z
    .string()
    .regex(TIME_PATTERN, "Horário inicial deve estar no formato HH:mm."),
  endTime: z
    .string()
    .regex(TIME_PATTERN, "Horário final deve estar no formato HH:mm."),
  room: z.string().max(40).optional(),
});

export const ReplaceScheduleSchema = z.object({
  windows: z
    .array(ScheduleWindowSchema)
    .max(30, "Máximo de 30 janelas de atendimento."),
});

export type ScheduleWindow = z.infer<typeof ScheduleWindowSchema>;
export type ReplaceSchedule = z.infer<typeof ReplaceScheduleSchema>;

export class ScheduleWindowRequest implements ScheduleWindow {
  @ApiProperty({
    minimum: 0,
    maximum: 6,
    description: "0 = domingo … 6 = sábado",
  })
  weekday!: number;

  @ApiProperty({ example: "08:00" })
  startTime!: string;

  @ApiProperty({ example: "17:00" })
  endTime!: string;

  @ApiPropertyOptional({ example: "Sala 2" })
  room?: string;
}

export class ReplaceScheduleRequest implements ReplaceSchedule {
  @ApiProperty({ type: [ScheduleWindowRequest] })
  windows!: ScheduleWindowRequest[];
}
