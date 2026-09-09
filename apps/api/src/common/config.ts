/**
 * Configuração por variável de ambiente, lida uma vez no boot.
 * Sem `@nestjs/config`: o objeto é tipado, importável de qualquer lugar e
 * `requiredInProd()` derruba o processo na largada — não na primeira requisição.
 */

function required(name: string): string {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Variável de ambiente obrigatória ausente: ${name}`);
  }
  return value;
}

function optional(name: string, fallback: string): string {
  return process.env[name] ?? fallback;
}

function optionalNumber(name: string, fallback: number): number {
  const raw = process.env[name];
  if (!raw) return fallback;
  const parsed = Number(raw);
  return Number.isFinite(parsed) ? parsed : fallback;
}

function optionalBoolean(name: string, fallback: boolean): boolean {
  const raw = process.env[name];
  if (raw === undefined) return fallback;
  return raw === "true" || raw === "1";
}

export const config = {
  env: optional("NODE_ENV", "development"),
  get isProd(): boolean {
    return this.env === "production";
  },
  get isTest(): boolean {
    return this.env === "test";
  },
  port: optionalNumber("PORT", 3000),
  host: optional("HOST", "0.0.0.0"),
  apiPrefix: optional("API_PREFIX", "api/v1"),
  corsOrigin: optional("CORS_ORIGIN", ""),

  /** Fuso operacional da clínica. O banco guarda UTC; a borda traduz. */
  timezone: optional("CLINIC_TIMEZONE", "America/Sao_Paulo"),

  jwt: {
    secret: optional("JWT_SECRET", "dev-only-secret-nao-use-em-producao"),
    // O tipo do `expiresIn` do jsonwebtoken é um template literal ("15m", "7d").
    // O cast acontece uma vez aqui, e não em cada uso.
    accessTtl: optional(
      "JWT_ACCESS_TTL",
      "15m",
    ) as `${number}${"s" | "m" | "h" | "d"}`,
    refreshTtlDays: optionalNumber("JWT_REFRESH_TTL_DAYS", 30),
  },

  /**
   * Janela do "Desfazer [Z]" do toast do painel do dia. Curta de propósito:
   * é uma correção de clique errado, não um histórico editável.
   */
  undoWindowSeconds: optionalNumber("UNDO_WINDOW_SECONDS", 30),

  storage: {
    /** `local` grava em disco e assina a própria URL; `s3` usa presigned URL. */
    driver: optional("STORAGE_DRIVER", "local") as "local" | "s3",
    localDir: optional("STORAGE_LOCAL_DIR", "./storage"),
    /** Segredo que assina as URLs do driver local. */
    signingSecret: optional(
      "STORAGE_SIGNING_SECRET",
      "dev-only-storage-secret",
    ),
    uploadUrlTtlSeconds: optionalNumber("STORAGE_UPLOAD_TTL", 15 * 60),
    /** TTL longo na leitura para não invalidar o cache de preview a cada request. */
    readUrlTtlSeconds: optionalNumber("STORAGE_READ_TTL", 60 * 60),
    /** Limite máximo de upload de arquivo: 10 MB. */
    maxFileBytes: optionalNumber("STORAGE_MAX_FILE_BYTES", 10 * 1024 * 1024),

    s3: {
      endpoint: optional("S3_ENDPOINT", ""),
      region: optional("S3_REGION", "us-east-1"),
      bucket: optional("S3_BUCKET", "clinicflow"),
      accessKeyId: process.env.S3_ACCESS_KEY,
      secretAccessKey: process.env.S3_SECRET_KEY,
      forcePathStyle: optionalBoolean("S3_FORCE_PATH_STYLE", true),
    },
  },

  mail: {
    /** `log` escreve uma linha e não envia nada — o padrão em desenvolvimento. */
    transport: optional("MAIL_TRANSPORT", "log") as "log" | "smtp",
    from: optional("MAIL_FROM", "nao-responda@clinicaviver.com.br"),
  },

  /** Base do link que vai no e-mail de redefinição. */
  appBaseUrl: optional("APP_BASE_URL", "http://localhost:5173"),

  /** Janela do link de redefinição de senha. Curta: é credencial em trânsito. */
  passwordResetTtlMinutes: optionalNumber("PASSWORD_RESET_TTL_MINUTES", 30),

  notifications: {
    /** `log` escreve uma linha e não envia nada — o padrão em desenvolvimento. */
    transport: optional("NOTIFICATION_TRANSPORT", "log") as "log" | "http",
    whatsappBaseUrl: optional("WHATSAPP_BASE_URL", ""),
    whatsappToken: process.env.WHATSAPP_TOKEN,
    /** Segredo do HMAC do webhook de entrada. */
    webhookSecret: optional(
      "WHATSAPP_WEBHOOK_SECRET",
      "dev-only-webhook-secret",
    ),
  },

  /** Token do chamador de TV da sala de espera (rota pública, sem dado sensível). */
  displayToken: optional("WAITING_ROOM_DISPLAY_TOKEN", "dev-display-token"),

  jobs: {
    /** Desligado nos testes para os crons não competirem com as asserções. */
    enabled: optionalBoolean("JOBS_ENABLED", true),
  },

  http: {
    timeoutMs: optionalNumber("HTTP_CLIENT_TIMEOUT_MS", 8000),
    retries: optionalNumber("HTTP_CLIENT_RETRIES", 2),
  },

  requiredInProd(): void {
    if (process.env.NODE_ENV !== "production") return;
    required("DATABASE_URL");
    required("JWT_SECRET");
    required("STORAGE_SIGNING_SECRET");
    if (process.env.STORAGE_DRIVER === "s3") {
      required("S3_BUCKET");
      required("S3_ACCESS_KEY");
      required("S3_SECRET_KEY");
    }
  },
};
