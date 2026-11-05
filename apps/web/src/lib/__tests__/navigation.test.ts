import type { Location } from "react-router";
import { describe, expect, it } from "vitest";
import { appointmentBackground } from "../navigation";

const background: Location = {
  pathname: "/agenda",
  search: "?visao=dia&data=2026-10-04",
  hash: "",
  state: null,
  key: "agenda-1",
};
const detail: Location = {
  pathname: "/consultas/a1",
  search: "",
  hash: "",
  state: { backgroundLocation: background },
  key: "detail-1",
};

describe("detalhe contextual", () => {
  it("preserva a rota e os filtros da agenda de origem", () => {
    expect(appointmentBackground(detail)).toBe(background);
  });

  it("deixa links diretos e a nova consulta como páginas próprias", () => {
    expect(appointmentBackground({ ...detail, state: null })).toBeUndefined();
    expect(
      appointmentBackground({ ...detail, pathname: "/consultas/nova" }),
    ).toBeUndefined();
    expect(
      appointmentBackground({ ...detail, pathname: "/pacientes/p1" }),
    ).toBeUndefined();
  });

  it("descarta origens incompletas, externas ou recursivas", () => {
    for (const invalid of [
      "https://example.com",
      { ...background, pathname: "//example.com" },
      { pathname: "/agenda" },
      { ...background, pathname: detail.pathname },
    ]) {
      expect(
        appointmentBackground({
          ...detail,
          state: { backgroundLocation: invalid },
        }),
      ).toBeUndefined();
    }
  });
});
