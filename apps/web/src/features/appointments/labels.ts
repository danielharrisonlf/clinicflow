import type {
  AppointmentType,
  CancelReason,
  Channel,
  DocumentType,
  TaskType,
} from "@/lib/api/types";

/**
 * Enum do banco → palavra que a recepção usa. O nome técnico nunca vaza para a
 * tela: quem atende não fala "PRIMEIRA_CONSULTA".
 */
export const APPOINTMENT_TYPE_LABEL: Record<AppointmentType, string> = {
  PRIMEIRA_CONSULTA: "Primeira consulta",
  CONSULTA: "Consulta",
  RETORNO: "Retorno",
  AVALIACAO: "Avaliação",
};

export const CANCEL_REASON_LABEL: Record<CancelReason, string> = {
  PACIENTE_DESMARCOU: "Paciente desmarcou",
  NO_SHOW: "Paciente não compareceu",
  INDISPONIBILIDADE_CLINICA: "Indisponibilidade da clínica",
  OUTRO: "Outro motivo",
};

export const CHANNEL_LABEL: Record<Channel, string> = {
  WEB: "pelo sistema",
  WHATSAPP: "via WhatsApp",
  TELEFONE: "por telefone",
  SISTEMA: "automaticamente",
};

export const DOCUMENT_TYPE_LABEL: Record<DocumentType, string> = {
  EXAME_LABORATORIAL: "Exame laboratorial",
  EXAME_IMAGEM: "Exame de imagem",
  ATESTADO: "Atestado médico",
  ENCAMINHAMENTO: "Encaminhamento",
  LAUDO: "Laudo",
  RECEITA: "Receita",
  OUTRO: "Outro",
};

export const TASK_TYPE_LABEL: Record<TaskType, string> = {
  RETORNO_A_AGENDAR: "Retorno a agendar",
  CONFIRMACAO_PENDENTE: "Confirmação pendente",
  RESGATE_NO_SHOW: "Resgate de falta",
  ENVIO_DOCUMENTO: "Envio de documento",
  AGUARDANDO_EXAME: "Aguardando exame",
  OUTRO: "Outro",
};

const MONTHS = [
  "jan",
  "fev",
  "mar",
  "abr",
  "mai",
  "jun",
  "jul",
  "ago",
  "set",
  "out",
  "nov",
  "dez",
];

/**
 * ISO → "11 set 2026". Montado à mão porque `toLocaleDateString("pt-BR")` com
 * mês curto devolve "11 de set. de 2026" — que quebra em duas linhas numa
 * coluna de tabela e enche a célula de preposição.
 */
export function formatDate(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return `${String(date.getDate()).padStart(2, "0")} ${MONTHS[date.getMonth()]} ${date.getFullYear()}`;
}

/** ISO → "11 set 2026 às 09:30". */
export function formatDateTime(iso: string | null): string {
  if (!iso) return "—";
  const date = new Date(iso);
  return `${formatDate(iso)} às ${date.toLocaleTimeString("pt-BR", {
    hour: "2-digit",
    minute: "2-digit",
  })}`;
}

export function todayISO(): string {
  const now = new Date();
  const offset = now.getTimezoneOffset() * 60_000;
  return new Date(now.getTime() - offset).toISOString().slice(0, 10);
}
