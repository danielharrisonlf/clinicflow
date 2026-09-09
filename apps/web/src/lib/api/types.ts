/**
 * Espelho dos DTOs de `apps/api`. Escrito à mão de propósito: o front consome
 * um contrato estável, e um tipo gerado por script esconderia divergência atrás
 * de `any`. Quando um DTO mudar lá, este arquivo tem que doer aqui.
 */

export const APPOINTMENT_STATUS = [
  "AGENDADA",
  "CONFIRMADA",
  "CHECK_IN",
  "EM_ATENDIMENTO",
  "CONCLUIDA",
  "CANCELADA",
  "REAGENDADA",
] as const;
export type AppointmentStatus = (typeof APPOINTMENT_STATUS)[number];

/** ATRASADA não existe no banco: é leitura do relógio sobre um estado real. */
export type DerivedState = AppointmentStatus | "ATRASADA";

export const APPOINTMENT_TYPE = [
  "PRIMEIRA_CONSULTA",
  "CONSULTA",
  "RETORNO",
  "AVALIACAO",
] as const;
export type AppointmentType = (typeof APPOINTMENT_TYPE)[number];

export const CANCEL_REASON = [
  "PACIENTE_DESMARCOU",
  "NO_SHOW",
  "INDISPONIBILIDADE_CLINICA",
  "OUTRO",
] as const;
export type CancelReason = (typeof CANCEL_REASON)[number];

export const DOCUMENT_TYPE = [
  "EXAME_LABORATORIAL",
  "EXAME_IMAGEM",
  "ATESTADO",
  "ENCAMINHAMENTO",
  "LAUDO",
  "RECEITA",
  "OUTRO",
] as const;
export type DocumentType = (typeof DOCUMENT_TYPE)[number];

export const TASK_TYPE = [
  "RETORNO_A_AGENDAR",
  "CONFIRMACAO_PENDENTE",
  "RESGATE_NO_SHOW",
  "ENVIO_DOCUMENTO",
  "AGUARDANDO_EXAME",
  "OUTRO",
] as const;
export type TaskType = (typeof TASK_TYPE)[number];

export type TaskStatus = "ABERTA" | "EM_ANDAMENTO" | "RESOLVIDA" | "CANCELADA";
export type Channel = "WEB" | "WHATSAPP" | "TELEFONE" | "SISTEMA";
export type Role = "RECEPCAO" | "PROFISSIONAL" | "GESTOR";

export interface PageMeta {
  page: number;
  limit: number;
  itemCount: number;
  pageCount: number;
  hasPreviousPage: boolean;
  hasNextPage: boolean;
}

export interface Page<T> {
  data: T[];
  meta: PageMeta;
}

export interface CursorMeta {
  hasNextPage: boolean;
  nextCursor: string | null;
}

export interface CursorPage<T> {
  data: T[];
  meta: CursorMeta;
}

export interface PageOptions {
  page?: number;
  limit?: number;
  order?: "ASC" | "DESC";
  orderBy?: string;
  search?: string;
}

/** Envelope único do `AllExceptionsFilter`. */
export interface ErrorEnvelope {
  statusCode: number;
  code: string;
  message: string;
  details?: string[];
  path: string;
  timestamp: string;
}

export interface SessionUser {
  id: string;
  name: string;
  email: string;
  role: Role;
  professionalId: string | null;
  /** Rótulo exibido sob o nome na barra lateral ("Recepção"). */
  roleLabel: string;
}

export interface AuthResponse {
  accessToken: string;
  refreshToken: string;
  user: SessionUser;
}

export interface AppointmentListItem {
  id: string;
  code: number;
  startsAt: string;
  endsAt: string;
  time: string;
  durationMinutes: number;
  type: AppointmentType;
  status: AppointmentStatus;
  derivedState: DerivedState;
  /** Rótulo pronto do backend: "Atrasada 27min", "Aguardando 18min". */
  stateLabel: string;
  waitingMinutes: number | null;
  lateMinutes: number | null;
  patientId: string;
  patientName: string;
  patientPhone: string;
  professionalId: string;
  professionalName: string;
  room: string | null;
  notes: string | null;
  /** O front acende só os botões válidos — a máquina de estados mora no backend. */
  allowedTransitions: AppointmentStatus[];
}

export interface AppointmentDetail extends AppointmentListItem {
  confirmedAt: string | null;
  checkedInAt: string | null;
  startedAt: string | null;
  completedAt: string | null;
  cancelledAt: string | null;
  cancelReason: CancelReason | null;
  cancelNote: string | null;
  documentsCount: number;
  rescheduledFromId: string | null;
}

export interface AppointmentEvent {
  id: string;
  fromStatus: AppointmentStatus | null;
  toStatus: AppointmentStatus;
  title: string;
  actorName: string | null;
  channel: Channel;
  reason: string | null;
  createdAt: string;
}

export interface CalendarSlot {
  id: string;
  date: string;
  time: string;
  startsAt: string;
  durationMinutes: number;
  patientName: string;
  professionalId: string;
  professionalName: string;
  status: AppointmentStatus;
  derivedState: DerivedState;
}

export interface CalendarDay {
  date: string;
  weekdayLabel: string;
  slots: CalendarSlot[];
}

export interface AvailabilityResult {
  available: boolean;
  conflicts: AppointmentListItem[];
  withinSchedule: boolean;
  message: string | null;
}

export interface TimeSlot {
  time: string;
  startsAt: string;
  available: boolean;
}

export interface ListAppointmentsQuery extends PageOptions {
  date?: string;
  from?: string;
  to?: string;
  professionalId?: string;
  patientId?: string;
  status?: AppointmentStatus[];
  type?: AppointmentType;
  onlyLate?: boolean;
}

export interface CreateAppointmentInput {
  patientId: string;
  professionalId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  type: AppointmentType;
  notes?: string;
  room?: string;
  allowOverbooking?: boolean;
}

export interface RescheduleInput {
  date: string;
  time: string;
  durationMinutes?: number;
  reason: string;
  allowOverbooking?: boolean;
}

export interface CancelInput {
  reasonCode: CancelReason;
  note?: string;
}

export interface CheckAvailabilityInput {
  professionalId: string;
  date: string;
  time: string;
  durationMinutes?: number;
  ignoreAppointmentId?: string;
}

export interface TodaySummary {
  date: string;
  dateLabel: string;
  scheduled: number;
  confirmed: number;
  waiting: number;
  inProgress: number;
  completed: number;
  late: number;
  cancelled: number;
}

export interface WaitingRoomItem {
  appointmentId: string;
  patientId: string;
  patientName: string;
  professionalName: string;
  waitingMinutes: number;
  waitingLabel: string;
  checkedInAtLabel: string;
  scheduledAtLabel: string;
  state: string;
  wasCalled: boolean;
}

export interface WaitingRoomMetrics {
  waitingCount: number;
  averageWaitMinutes: number;
  longestWaitMinutes: number;
}

export interface PatientListItem {
  id: string;
  name: string;
  age: number | null;
  phone: string;
  lastVisitAt: string | null;
  nextVisitAt: string | null;
  openTasksCount: number;
}

export interface PatientDetail extends PatientListItem {
  cpf: string | null;
  birthDate: string | null;
  email: string | null;
  notes: string | null;
  createdAt: string;
}

export interface PatientSummary {
  appointmentsCount: number;
  cancelledCount: number;
  documentsCount: number;
  openTasksCount: number;
}

export interface CreatePatientInput {
  name: string;
  birthDate?: string;
  cpf?: string;
  phone: string;
  email?: string;
  notes?: string;
}

export interface ListPatientsQuery extends PageOptions {
  hasPendencies?: boolean;
}

export interface Professional {
  id: string;
  name: string;
  specialty: string;
  councilType: string;
  councilNumber: string;
  active: boolean;
  defaultDurationMinutes: number;
  todayAppointmentsCount: number;
  openTasksCount: number;
}

export interface ScheduleWindow {
  weekday: number;
  startTime: string;
  endTime: string;
  room?: string;
}

export interface ProfessionalSchedule {
  professionalId: string;
  windows: ScheduleWindow[];
  /** Rótulo pronto: "Seg, Qua, Qui, Sex". */
  summary: string;
}

export interface DocumentItem {
  id: string;
  fileName: string;
  format: string;
  type: DocumentType;
  sizeBytes: number;
  sizeLabel: string;
  patientId: string | null;
  patientName: string | null;
  appointmentId: string | null;
  source: string | null;
  createdAt: string;
}

export interface ListDocumentsQuery extends PageOptions {
  type?: DocumentType;
  patientId?: string;
  appointmentId?: string;
  from?: string;
  to?: string;
}

export interface TaskItem {
  id: string;
  patientId: string;
  patientName: string;
  appointmentId: string | null;
  type: TaskType;
  status: TaskStatus;
  title: string;
  dueAt: string | null;
  /** Rótulo pronto: "Urgente (hoje)", "Até 15 set". */
  dueLabel: string;
  isUrgent: boolean;
  notes: string | null;
  /** Ação sugerida do funil: "WhatsApp", "Agendar", "Enviar guia". */
  suggestedAction: string;
}

export interface TaskSummary {
  returnsToSchedule: number;
  pendingConfirmations: number;
  noShowsToRecover: number;
  resolvedToday: number;
}

export interface ListTasksQuery extends PageOptions {
  type?: TaskType[];
  status?: TaskStatus[];
  dueBefore?: string;
}

export interface Settings {
  clinicName: string;
  timezone: string;
  defaultDurationMinutes: number;
  confirmationLeadHours: number;
  returnWindowDays: number;
  lateToleranceMinutes: number;
}

/**
 * Só estes quatro são editáveis. `clinicName` e `timezone` vêm na resposta mas
 * não existem no `UpdateSettingsDto` do backend: são leitura.
 */
export interface UpdateSettingsInput {
  defaultDurationMinutes?: number;
  confirmationLeadHours?: number;
  returnWindowDays?: number;
  lateToleranceMinutes?: number;
}

export interface WhatsappSettings {
  whatsappEnabled: boolean;
  whatsappTemplate: string;
  transport: string;
}

export interface SearchAction {
  id: string;
  label: string;
  shortcut: string;
}

export interface SearchPatient {
  id: string;
  name: string;
  subtitle: string | null;
  stateLabel: string | null;
}

export interface SearchProfessional {
  id: string;
  name: string;
  specialty: string;
}

export interface SearchResult {
  patients: SearchPatient[];
  professionals: SearchProfessional[];
  actions: SearchAction[];
}
