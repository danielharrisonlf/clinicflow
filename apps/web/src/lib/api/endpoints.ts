import { ApiError, request, resolveFileUrl } from "./client";
import type {
  AppointmentDetail,
  AppointmentEvent,
  AppointmentListItem,
  AuthResponse,
  AvailabilityResult,
  CalendarDay,
  CancelInput,
  CheckAvailabilityInput,
  CreateAppointmentInput,
  CreateDocumentInput,
  CreatePatientInput,
  CreateTaskInput,
  CursorPage,
  DocumentDownload,
  DocumentItem,
  DocumentType,
  ListAppointmentsQuery,
  ListDocumentsQuery,
  ListPatientsQuery,
  ListTasksQuery,
  Page,
  PageOptions,
  PatientDetail,
  PatientListItem,
  PatientSummary,
  Professional,
  ProfessionalSchedule,
  RescheduleInput,
  SearchResult,
  SessionUser,
  Settings,
  TaskItem,
  TaskSummary,
  TimeSlot,
  TodaySummary,
  UpdateSettingsInput,
  UploadTicket,
  WaitingRoomItem,
  WaitingRoomMetrics,
  WhatsappSettings,
} from "./types";

export const authApi = {
  login: (email: string, password: string) =>
    request<AuthResponse>("/auth/login", {
      method: "POST",
      body: { email, password },
      anonymous: true,
    }),
  logout: (refreshToken: string) =>
    request<void>("/auth/logout", { method: "POST", body: { refreshToken } }),
  me: () => request<SessionUser>("/auth/me"),
  forgotPassword: (email: string) =>
    request<void>("/auth/forgot-password", {
      method: "POST",
      body: { email },
      anonymous: true,
    }),
  resetPassword: (token: string, password: string) =>
    request<void>("/auth/reset-password", {
      method: "POST",
      body: { token, password },
      anonymous: true,
    }),
};

export const dashboardApi = {
  today: (date?: string, professionalId?: string) =>
    request<TodaySummary>("/dashboard/today", {
      query: { date, professionalId },
    }),
};

export const appointmentsApi = {
  list: (query: ListAppointmentsQuery = {}) =>
    request<Page<AppointmentListItem>>("/appointments", {
      query: query as Record<string, string | number | boolean | string[]>,
    }),
  calendar: (from: string, to: string, professionalId?: string) =>
    request<CalendarDay[]>("/appointments/calendar", {
      query: { from, to, professionalId },
    }),
  slots: (
    professionalId: string,
    date: string,
    durationMinutes?: number,
    excludeAppointmentId?: string,
  ) =>
    request<TimeSlot[]>("/appointments/slots", {
      query: { professionalId, date, durationMinutes, excludeAppointmentId },
    }),
  checkAvailability: (body: CheckAvailabilityInput) =>
    request<AvailabilityResult>("/appointments/availability", {
      method: "POST",
      body,
    }),
  detail: (id: string) => request<AppointmentDetail>(`/appointments/${id}`),
  audit: (id: string, cursor?: string) =>
    request<CursorPage<AppointmentEvent>>(`/appointments/${id}/audit`, {
      query: { cursor, limit: 20 },
    }),
  create: (body: CreateAppointmentInput) =>
    request<AppointmentDetail>("/appointments", { method: "POST", body }),
  update: (id: string, body: { notes?: string; room?: string }) =>
    request<AppointmentDetail>(`/appointments/${id}`, {
      method: "PATCH",
      body,
    }),
  confirm: (id: string) =>
    request<AppointmentDetail>(`/appointments/${id}/confirm`, {
      method: "PATCH",
    }),
  checkIn: (id: string) =>
    request<AppointmentDetail>(`/appointments/${id}/check-in`, {
      method: "PATCH",
    }),
  start: (id: string) =>
    request<AppointmentDetail>(`/appointments/${id}/start`, {
      method: "PATCH",
    }),
  complete: (id: string) =>
    request<AppointmentDetail>(`/appointments/${id}/complete`, {
      method: "PATCH",
    }),
  reschedule: (id: string, body: RescheduleInput) =>
    request<AppointmentDetail>(`/appointments/${id}/reschedule`, {
      method: "PATCH",
      body,
    }),
  cancel: (id: string, body: CancelInput) =>
    request<AppointmentDetail>(`/appointments/${id}/cancel`, {
      method: "PATCH",
      body,
    }),
  /** Janela curta do "Desfazer [Z]" do toast — o backend define o prazo. */
  undo: (id: string) =>
    request<AppointmentDetail>(`/appointments/${id}/undo`, { method: "POST" }),
};

export const waitingRoomApi = {
  list: () => request<WaitingRoomItem[]>("/waiting-room"),
  metrics: () => request<WaitingRoomMetrics>("/waiting-room/metrics"),
  callNext: () =>
    request<WaitingRoomItem | null>("/waiting-room/call-next", {
      method: "POST",
    }),
  start: (appointmentId: string) =>
    request<AppointmentDetail>(`/waiting-room/${appointmentId}/start`, {
      method: "PATCH",
    }),
};

export const patientsApi = {
  list: (query: ListPatientsQuery = {}) =>
    request<Page<PatientListItem>>("/patients", {
      query: query as Record<string, string | number | boolean>,
    }),
  detail: (id: string) => request<PatientDetail>(`/patients/${id}`),
  summary: (id: string) => request<PatientSummary>(`/patients/${id}/summary`),
  appointments: (id: string, cursor?: string, limit = 20) =>
    request<CursorPage<AppointmentListItem>>(`/patients/${id}/appointments`, {
      query: { cursor, limit },
    }),
  documents: (id: string, options: PageOptions = {}) =>
    request<Page<DocumentItem>>(`/patients/${id}/documents`, {
      query: options as Record<string, string | number>,
    }),
  tasks: (id: string, options: PageOptions = {}) =>
    request<Page<TaskItem>>(`/patients/${id}/tasks`, {
      query: options as Record<string, string | number>,
    }),
  create: (body: CreatePatientInput) =>
    request<PatientDetail>("/patients", { method: "POST", body }),
  update: (id: string, body: Partial<CreatePatientInput>) =>
    request<PatientDetail>(`/patients/${id}`, { method: "PATCH", body }),
};

export const professionalsApi = {
  list: (options: PageOptions = {}) =>
    request<Page<Professional>>("/professionals", {
      query: options as Record<string, string | number>,
    }),
  detail: (id: string) => request<Professional>(`/professionals/${id}`),
  schedule: (id: string) =>
    request<ProfessionalSchedule>(`/professionals/${id}/schedule`),
  appointments: (id: string, from: string, to: string) =>
    request<CalendarDay[]>(`/professionals/${id}/appointments`, {
      query: { from, to },
    }),
};

export const documentsApi = {
  list: (query: ListDocumentsQuery = {}) =>
    request<Page<DocumentItem>>("/documents", {
      query: query as Record<string, string | number>,
    }),
  download: (id: string) =>
    request<DocumentDownload>(`/documents/${id}/download`),
  update: (id: string, body: { type?: DocumentType; source?: string | null }) =>
    request<DocumentItem>(`/documents/${id}`, { method: "PATCH", body }),
  remove: (id: string) =>
    request<void>(`/documents/${id}`, { method: "DELETE" }),
  /**
   * Upload em três passos: assina, manda os bytes direto para o storage e
   * registra o documento. O PUT não passa pelo `request` porque o destino pode
   * ser o S3, que não conhece o nosso Bearer.
   */
  upload: async (
    file: File,
    meta: Omit<CreateDocumentInput, "objectKey" | "fileName">,
  ) => {
    const ticket = await request<UploadTicket>("/uploads/sign", {
      method: "POST",
      body: {
        purpose: "DOCUMENT",
        fileName: file.name,
        // Alguns sistemas não informam o tipo; o backend só aceita estes quatro.
        mimeType: file.type || mimeFromName(file.name),
        byteSize: file.size,
      },
    });
    const put = await fetch(resolveFileUrl(ticket.uploadUrl), {
      method: "PUT",
      headers: ticket.headers,
      body: file,
    }).catch(() => null);
    if (!put?.ok) {
      throw new ApiError({
        statusCode: put?.status ?? 0,
        code: "UPLOAD_FAILED",
        message: "O envio do arquivo falhou. Tente de novo.",
        path: "/uploads",
        timestamp: new Date().toISOString(),
      });
    }
    return request<DocumentItem>("/documents", {
      method: "POST",
      body: { ...meta, objectKey: ticket.objectKey, fileName: file.name },
    });
  },
};

const MIME_BY_EXTENSION: Record<string, string> = {
  pdf: "application/pdf",
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
};

function mimeFromName(name: string): string {
  const extension = name.split(".").pop()?.toLowerCase() ?? "";
  return MIME_BY_EXTENSION[extension] ?? "application/octet-stream";
}

export const tasksApi = {
  list: (query: ListTasksQuery = {}) =>
    request<Page<TaskItem>>("/tasks", {
      query: query as Record<string, string | number | string[]>,
    }),
  summary: () => request<TaskSummary>("/tasks/summary"),
  resolve: (id: string, notes?: string) =>
    request<TaskItem>(`/tasks/${id}/resolve`, {
      method: "PATCH",
      body: { notes },
    }),
  /** Registra a tentativa de contato: a tarefa passa a "em andamento". */
  contact: (id: string) =>
    request<TaskItem>(`/tasks/${id}/contact`, { method: "POST" }),
  create: (body: CreateTaskInput) =>
    request<TaskItem>("/tasks", { method: "POST", body }),
};

export const settingsApi = {
  get: () => request<Settings>("/settings"),
  update: (body: UpdateSettingsInput) =>
    request<Settings>("/settings", { method: "PATCH", body }),
  whatsapp: () => request<WhatsappSettings>("/settings/whatsapp"),
  updateWhatsapp: (body: {
    whatsappEnabled: boolean;
    whatsappTemplate: string;
  }) =>
    request<WhatsappSettings>("/settings/whatsapp", { method: "PUT", body }),
};

export const searchApi = {
  query: (q: string, signal?: AbortSignal) =>
    request<SearchResult>("/search", { query: { q }, signal }),
};
