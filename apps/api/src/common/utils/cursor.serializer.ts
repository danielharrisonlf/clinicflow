import { AppException } from "../exceptions/app.exception";

export interface CursorPayload {
  /** Coluna de ordenação (createdAt, startsAt…), em ISO. */
  at: string;
  /** Tie-breaker único. Sem ele, dois registros do mesmo milissegundo se perdem. */
  id: string;
}

/**
 * Cursor opaco em Base64URL.
 *
 * Opaco de propósito: o cliente não deve saber que ali dentro existe um
 * `createdAt` — se souber, alguém vai construir cursores à mão e travar a
 * evolução do índice.
 */
export const CursorSerializer = {
  encode(payload: { at: Date; id: string }): string {
    const raw = JSON.stringify({
      at: payload.at.toISOString(),
      id: payload.id,
    });
    return Buffer.from(raw, "utf-8").toString("base64url");
  },

  decode(cursor: string): CursorPayload {
    try {
      const raw = Buffer.from(cursor, "base64url").toString("utf-8");
      const parsed = JSON.parse(raw) as Partial<CursorPayload>;
      if (typeof parsed.at !== "string" || typeof parsed.id !== "string") {
        throw new Error("payload incompleto");
      }
      if (Number.isNaN(Date.parse(parsed.at))) {
        throw new Error("data inválida");
      }
      return { at: parsed.at, id: parsed.id };
    } catch {
      throw new AppException({
        code: "VALIDATION_FAILED",
        message: "Cursor de paginação inválido.",
      });
    }
  },
};
