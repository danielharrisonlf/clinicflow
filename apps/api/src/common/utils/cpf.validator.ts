import {
  registerDecorator,
  ValidationArguments,
  ValidationOptions,
  ValidatorConstraint,
  ValidatorConstraintInterface,
} from "class-validator";

/** Remove pontuação: o formulário digita "412.907.338-20", o banco guarda dígitos. */
export function normalizeCpf(value: string): string {
  return value.replace(/\D/g, "");
}

export function isValidCpf(value: string): boolean {
  const cpf = normalizeCpf(value);
  if (cpf.length !== 11) return false;
  // Sequências repetidas passam no cálculo dos dígitos, mas não são CPF.
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

@ValidatorConstraint({ name: "isCpf", async: false })
class IsCpfConstraint implements ValidatorConstraintInterface {
  validate(value: unknown): boolean {
    return typeof value === "string" && isValidCpf(value);
  }

  defaultMessage(args: ValidationArguments): string {
    return `${args.property} deve ser um CPF válido.`;
  }
}

export function IsCpf(validationOptions?: ValidationOptions) {
  return (object: object, propertyName: string): void => {
    registerDecorator({
      target: object.constructor,
      propertyName,
      options: validationOptions,
      validator: IsCpfConstraint,
    });
  };
}
