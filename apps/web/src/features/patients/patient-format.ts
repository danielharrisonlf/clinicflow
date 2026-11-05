/**
 * Formatação e validação de dados cadastrais do paciente. O backend guarda o
 * CPF só com dígitos e valida o dígito verificador; a tela repete a conta para
 * a recepção saber do erro antes de mandar — o paciente ainda está no balcão.
 */

export function cpfDigits(value: string): string {
  return value.replace(/\D/g, "").slice(0, 11);
}

/** "41290733820" → "412.907.338-20". Parcial enquanto digita. */
export function formatCpf(value: string | null | undefined): string {
  if (!value) return "";
  const d = cpfDigits(value);
  if (d.length <= 3) return d;
  if (d.length <= 6) return `${d.slice(0, 3)}.${d.slice(3)}`;
  if (d.length <= 9) return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6)}`;
  return `${d.slice(0, 3)}.${d.slice(3, 6)}.${d.slice(6, 9)}-${d.slice(9)}`;
}

/** Mesmo cálculo do `cpf.validator` da API. */
export function isValidCpf(value: string): boolean {
  const cpf = cpfDigits(value);
  if (cpf.length !== 11) return false;
  // Sequência repetida passa no cálculo, mas não é CPF.
  if (/^(\d)\1{10}$/.test(cpf)) return false;
  const digits = cpf.split("").map(Number);
  for (const [length, position] of [
    [9, 10],
    [10, 11],
  ] as const) {
    let sum = 0;
    for (let index = 0; index < length; index += 1) {
      sum += (digits[index] ?? 0) * (position - index);
    }
    const remainder = (sum * 10) % 11;
    const expected = remainder === 10 ? 0 : remainder;
    if (expected !== digits[length]) return false;
  }
  return true;
}

/** Mesma regra do backend: dígitos, espaço, parênteses, + e -. */
export const PHONE_PATTERN = /^[\d\s()+-]{8,20}$/;

/**
 * Máscara leve de telefone brasileiro enquanto digita. Só reformata quando o
 * que foi digitado é só número local (10–11 dígitos); DDI e formatos fora do
 * padrão passam como vieram, para não brigar com quem cola "+351 …".
 */
export function formatPhoneInput(value: string): string {
  if (/[^\d\s()-]/.test(value)) return value;
  const d = value.replace(/\D/g, "");
  if (d.length < 10 || d.length > 11) return value;
  const ddd = d.slice(0, 2);
  const rest = d.slice(2);
  const split = rest.length === 9 ? 5 : 4;
  return `(${ddd}) ${rest.slice(0, split)}-${rest.slice(split)}`;
}

/** "1 ano", "34 anos" — ou nada, quando a data não foi informada. */
export function ageLabel(age: number | null | undefined): string | null {
  if (age === null || age === undefined) return null;
  return age === 1 ? "1 ano" : `${age} anos`;
}
