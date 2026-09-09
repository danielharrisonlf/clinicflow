import { Role } from "@prisma/client";

/**
 * Identidade da requisição. Sai do token e só dele — nenhum handler lê
 * `body.userId`. Ver `JwtAuthGuard.rejectClientSuppliedIdentity`.
 */
export interface AuthenticatedUser {
  id: string;
  email: string;
  name: string;
  role: Role;
  /** Preenchido quando o usuário é um profissional de saúde. */
  professionalId?: string;
}
