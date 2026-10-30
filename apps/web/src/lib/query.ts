import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "./api/client";
import type {
  CheckAvailabilityInput,
  ListAppointmentsQuery,
  ListDocumentsQuery,
  ListPatientsQuery,
  ListTasksQuery,
  PageOptions,
} from "./api/types";

/**
 * Fábrica de chaves. Hierárquica de propósito: `invalidateQueries({ queryKey:
 * qk.appointments.all })` derruba lista, detalhe e auditoria de uma vez, sem
 * ninguém precisar lembrar de listar as três.
 */
export const qk = {
  dashboard: {
    all: ["dashboard"] as const,
    today: (date?: string, professionalId?: string) =>
      ["dashboard", "today", { date, professionalId }] as const,
  },

  appointments: {
    all: ["appointments"] as const,
    list: (query: ListAppointmentsQuery) =>
      ["appointments", "list", query] as const,
    detail: (id: string) => ["appointments", "detail", id] as const,
    audit: (id: string) => ["appointments", "detail", id, "audit"] as const,
    calendar: (from: string, to: string, professionalId?: string) =>
      ["appointments", "calendar", { from, to, professionalId }] as const,
    slots: (
      professionalId: string,
      date: string,
      durationMinutes?: number,
      excludeAppointmentId?: string,
    ) =>
      [
        "appointments",
        "slots",
        { professionalId, date, durationMinutes, excludeAppointmentId },
      ] as const,
    availability: (input: CheckAvailabilityInput) =>
      ["appointments", "availability", input] as const,
  },

  waitingRoom: {
    all: ["waiting-room"] as const,
    list: ["waiting-room", "list"] as const,
    metrics: ["waiting-room", "metrics"] as const,
  },

  patients: {
    all: ["patients"] as const,
    list: (query: ListPatientsQuery) => ["patients", "list", query] as const,
    detail: (id: string) => ["patients", "detail", id] as const,
    summary: (id: string) => ["patients", "detail", id, "summary"] as const,
    appointments: (id: string) =>
      ["patients", "detail", id, "appointments"] as const,
    documents: (id: string, page?: number) =>
      ["patients", "detail", id, "documents", { page }] as const,
    tasks: (id: string, page?: number) =>
      ["patients", "detail", id, "tasks", { page }] as const,
  },

  professionals: {
    all: ["professionals"] as const,
    list: (options: PageOptions) => ["professionals", "list", options] as const,
    detail: (id: string) => ["professionals", "detail", id] as const,
    schedule: (id: string) =>
      ["professionals", "detail", id, "schedule"] as const,
    agenda: (id: string, from: string, to: string) =>
      ["professionals", "detail", id, "agenda", { from, to }] as const,
  },

  documents: {
    all: ["documents"] as const,
    list: (query: ListDocumentsQuery) => ["documents", "list", query] as const,
  },

  tasks: {
    all: ["tasks"] as const,
    list: (query: ListTasksQuery) => ["tasks", "list", query] as const,
    summary: ["tasks", "summary"] as const,
  },

  settings: {
    all: ["settings"] as const,
    general: ["settings", "general"] as const,
    whatsapp: ["settings", "whatsapp"] as const,
  },
  search: (q: string) => ["search", q] as const,
} as const;

export function createQueryClient(): QueryClient {
  return new QueryClient({
    defaultOptions: {
      queries: {
        // O balcão olha a tela em rajadas de 1 a 3 segundos. 30s de frescor
        // evita refetch a cada foco de janela sem deixar o painel mentir.
        staleTime: 30_000,
        gcTime: 5 * 60_000,
        refetchOnWindowFocus: true,
        retry: (failureCount, error) => {
          // 4xx é resposta, não falha de rede: repetir só atrasa o erro na tela.
          if (error instanceof ApiError && error.statusCode < 500) return false;
          return failureCount < 2;
        },
      },
      mutations: {
        retry: false,
      },
    },
  });
}
