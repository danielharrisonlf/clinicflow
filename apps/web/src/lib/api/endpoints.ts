import { request } from "./client";
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
  CreatePatientInput,
  CursorPage,
  DocumentItem,
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
  slots: (professionalId: string, date: string, durationMinutes?: number) =>
    request<TimeSlot[]>("/appointments/slots", {
      query: { professionalId, date, durationMinutes },
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
    request<void>(`/waiting-room/${appointmentId}/start`, { method: "PATCH" }),
};

export const patientsApi = {
  list: (query: ListPatientsQuery = {}) =>
    request<Page<PatientListItem>>("/patients", {
      query: query as Record<string, string | number | boolean>,
    }),
  detail: (id: string) => request<PatientDetail>(`/patients/${id}`),
  summary: (id: string) => request<PatientSummary>(`/patients/${id}/summary`),
  appointments: (id: string, cursor?: string) =>
    request<CursorPage<AppointmentListItem>>(`/patients/${id}/appointments`, {
      query: { cursor, limit: 20 },
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
    request<{ url: string }>(`/documents/${id}/download`),
};

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
  contact: (id: string) =>
    request<TaskItem>(`/tasks/${id}/contact`, { method: "POST" }),
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
