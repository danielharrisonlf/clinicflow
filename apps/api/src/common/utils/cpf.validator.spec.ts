import { isValidCpf, normalizeCpf } from "./cpf.validator";

describe("isValidCpf", () => {
  it("aceita o CPF formatado com pontuação", () => {
    expect(isValidCpf("529.982.247-25")).toBe(true);
  });

  it("aceita o mesmo CPF sem pontuação", () => {
    expect(isValidCpf("52998224725")).toBe(true);
  });

  it("recusa dígito verificador errado", () => {
    expect(isValidCpf("529.982.247-26")).toBe(false);
  });

  it("recusa sequências repetidas, que passam no cálculo mas não são CPF", () => {
    expect(isValidCpf("111.111.111-11")).toBe(false);
    expect(isValidCpf("000.000.000-00")).toBe(false);
  });

  it("recusa comprimento diferente de 11 dígitos", () => {
    expect(isValidCpf("529.982.247")).toBe(false);
  });
});

describe("normalizeCpf", () => {
  it("guarda apenas dígitos", () => {
    expect(normalizeCpf("412.907.338-20")).toBe("41290733820");
  });
});
