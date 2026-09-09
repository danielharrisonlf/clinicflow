import { Injectable } from "@nestjs/common";

/**
 * "Agora" injetável.
 *
 * Tudo que depende do relógio — espera de 27 min na sala, tolerância de atraso,
 * janela de 30 s do desfazer — passa por aqui. Sem isso, os testes desses casos
 * viram `setTimeout` e ficam intermitentes.
 */
@Injectable()
export class ClockService {
  now(): Date {
    return new Date();
  }

  nowMs(): number {
    return Date.now();
  }
}
