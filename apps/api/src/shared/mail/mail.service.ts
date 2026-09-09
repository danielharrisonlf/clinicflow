import { Injectable, Logger } from "@nestjs/common";
import { config } from "../../common/config";

export interface MailMessage {
  to: string;
  subject: string;
  body: string;
}

/**
 * Envio de e-mail. Mesmo desenho do transporte de notificação: `log` escreve
 * uma linha e não manda nada, que é o padrão em desenvolvimento e em teste.
 *
 * Trocar por SMTP ou por um provedor é implementar `deliver` e ligar a variável
 * de ambiente. O resto da aplicação não muda.
 */
@Injectable()
export class MailService {
  private readonly logger = new Logger(MailService.name);

  async send(message: MailMessage): Promise<void> {
    if (config.mail.transport === "log") {
      this.logger.log(
        `[e-mail:log] para=${message.to} assunto="${message.subject}"\n${message.body}`,
      );
      return;
    }

    throw new Error(
      `Transporte de e-mail "${config.mail.transport}" não implementado.`,
    );
  }
}
