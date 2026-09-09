import { AppointmentStatus, CancelReason } from "@prisma/client";

/**
 * Eventos de domínio.
 *
 * São o que evita `forwardRef` entre consultas, pendências e notificações:
 * o serviço de consultas anuncia o que aconteceu e segue; quem se importa
 * escuta. Nenhum dos dois lados importa o módulo do outro.
 */
export const DomainEvent = {
  AppointmentStatusChanged: "appointment.status_changed",
  AppointmentCompleted: "appointment.completed",
  AppointmentCancelled: "appointment.cancelled",
  AppointmentCreated: "appointment.created",
  AppointmentCheckedIn: "appointment.checked_in",
  DocumentUploaded: "document.uploaded",
} as const;

export interface AppointmentStatusChangedPayload {
  appointmentId: string;
  patientId: string;
  professionalId: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  occurredAt: Date;
}

export interface AppointmentCompletedPayload {
  appointmentId: string;
  patientId: string;
  professionalId: string;
  completedAt: Date;
}

export interface AppointmentCancelledPayload {
  appointmentId: string;
  patientId: string;
  reasonCode: CancelReason;
}

export interface DocumentUploadedPayload {
  documentId: string;
  patientId: string;
  fileName: string;
}
