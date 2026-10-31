import type {
  AppointmentType,
  CancelReason,
  Channel,
  DocumentType,
  NotificationStatus,
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

export const NOTIFICATION_STATUS_LABEL: Record<NotificationStatus, string> = {
  PENDENTE: "Pendente",
  SIMULADA: "Simulada",
  ENVIADA: "Enviada",
  FALHOU: "Falhou",
  RESPONDIDA: "Respondida",
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

const MONTHS_LONG = [
  "janeiro",
  "fevereiro",
  "março",
  "abril",
  "maio",
  "junho",
  "julho",
  "agosto",
  "setembro",
  "outubro",
  "novembro",
  "dezembro",
];

const WEEKDAYS_SHORT = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const WEEKDAYS_LONG = [
  "Domingo",
  "Segunda-feira",
  "Terça-feira",
  "Quarta-feira",
  "Quinta-feira",
  "Sexta-feira",
  "Sábado",
];

/**
 * Fuso da clínica, não do navegador. O backend calcula "hoje" e "09:30" em
 * `America/Sao_Paulo`; um notebook em outro fuso mostraria outro horário para
 * a mesma consulta. A casca atualiza com o valor de `/settings`.
 */
let clinicTimeZone = "America/Sao_Paulo";

export function setClinicTimeZone(timeZone: string | undefined) {
  if (!timeZone) return;
  try {
    new Intl.DateTimeFormat("pt-BR", { timeZone });
    clinicTimeZone = timeZone;
  } catch {
    // Fuso desconhecido pelo navegador: mantém o padrão.
  }
}

interface Parts {
  year: number;
  month: number;
  day: number;
  hour: number;
  minute: number;
  weekday: number;
}

const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

/** Partes de data no fuso da clínica. Data pura (`YYYY-MM-DD`) não sofre fuso. */
function partsOf(value: string): Parts {
  if (DATE_ONLY.test(value)) {
    const [year, month, day] = value.split("-").map(Number) as [
      number,
      number,
      number,
    ];
    const weekday = new Date(Date.UTC(year, month - 1, day)).getUTCDay();
    return { year, month, day, hour: 0, minute: 0, weekday };
  }
  const formatter = new Intl.DateTimeFormat("en-US", {
    timeZone: clinicTimeZone,
    year: "numeric",
    month: "numeric",
    day: "numeric",
    hour: "numeric",
    minute: "numeric",
    weekday: "short",
    hourCycle: "h23",
  });
  const map: Record<string, string> = {};
  for (const part of formatter.formatToParts(new Date(value))) {
    map[part.type] = part.value;
  }
  const weekdays = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"];
  return {
    year: Number(map.year),
    month: Number(map.month),
    day: Number(map.day),
    hour: Number(map.hour) % 24,
    minute: Number(map.minute),
    weekday: weekdays.indexOf(map.weekday ?? "Sun"),
  };
}

const pad = (value: number) => String(value).padStart(2, "0");

/**
 * ISO → "11 set 2026". Montado à mão porque `toLocaleDateString("pt-BR")` com
 * mês curto devolve "11 de set. de 2026" — que quebra em duas linhas numa
 * coluna de tabela e enche a célula de preposição.
 */
export function formatDate(value: string | null | undefined): string {
  if (!value) return "—";
  const p = partsOf(value);
  return `${pad(p.day)} ${MONTHS[p.month - 1]} ${p.year}`;
}

/** ISO → "09:30" no fuso da clínica. */
export function formatTime(value: string | null | undefined): string {
  if (!value) return "—";
  const p = partsOf(value);
  return `${pad(p.hour)}:${pad(p.minute)}`;
}

/** ISO → "11 set 2026 às 09:30". */
export function formatDateTime(value: string | null | undefined): string {
  if (!value) return "—";
  return `${formatDate(value)} às ${formatTime(value)}`;
}

/** "Qui, 11 set" — cabeçalho de dia na agenda e nas listas. */
export function formatDayShort(value: string): string {
  const p = partsOf(value);
  return `${WEEKDAYS_SHORT[p.weekday]}, ${pad(p.day)} ${MONTHS[p.month - 1]}`;
}

/** "Quinta-feira, 11 de setembro" */
export function formatDayLong(value: string): string {
  const p = partsOf(value);
  return `${WEEKDAYS_LONG[p.weekday]}, ${p.day} de ${MONTHS_LONG[p.month - 1]}`;
}

/** "setembro de 2026" */
export function formatMonthYear(value: string): string {
  const p = partsOf(value);
  return `${MONTHS_LONG[p.month - 1]} de ${p.year}`;
}

export function weekdayOf(value: string): number {
  return partsOf(value).weekday;
}

/** Hoje no fuso da clínica, como `YYYY-MM-DD`. */
export function todayISO(): string {
  const p = partsOf(new Date().toISOString());
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Soma dias numa data pura, sem passar por fuso. */
export function addDays(date: string, days: number): string {
  const [year, month, day] = date.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const next = new Date(Date.UTC(year, month - 1, day + days));
  return next.toISOString().slice(0, 10);
}

/** Data ISO completa → `YYYY-MM-DD` no fuso da clínica. */
export function toDateKey(value: string): string {
  const p = partsOf(value);
  return `${p.year}-${pad(p.month)}-${pad(p.day)}`;
}

/** Idade em anos a partir da data de nascimento (`YYYY-MM-DD`). */
export function ageFrom(birthDate: string | null | undefined): number | null {
  if (!birthDate || !DATE_ONLY.test(birthDate)) return null;
  const today = todayISO();
  const [by, bm, bd] = birthDate.split("-").map(Number) as [
    number,
    number,
    number,
  ];
  const [ty, tm, td] = today.split("-").map(Number) as [number, number, number];
  return ty - by - (tm < bm || (tm === bm && td < bd) ? 1 : 0);
}

/** Tempo relativo curto: "agora", "há 5 min", "há 2 h", "ontem", "11 set 2026". */
export function formatRelative(value: string | null | undefined): string {
  if (!value) return "—";
  const diff = Date.now() - new Date(value).getTime();
  const minutes = Math.round(diff / 60_000);
  if (minutes < 1) return "agora";
  if (minutes < 60) return `há ${minutes} min`;
  const hours = Math.round(minutes / 60);
  if (hours < 24 && toDateKey(value) === todayISO()) return `há ${hours} h`;
  if (toDateKey(value) === addDays(todayISO(), -1)) return "ontem";
  return formatDate(value);
}
