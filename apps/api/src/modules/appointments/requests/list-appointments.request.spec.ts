import { ArgumentMetadata } from "@nestjs/common";
import { AppointmentStatus } from "@prisma/client";
import { ZodValidationPipe } from "../../../common/pipes/zod-validation.pipe";
import {
  ListPatientsQueryRequest,
  ListPatientsQuerySchema,
} from "../../patients/requests/list-patients.request";
import {
  ListAppointmentsQueryRequest,
  ListAppointmentsQuerySchema,
} from "./list-appointments.request";

const meta = (metatype: ArgumentMetadata["metatype"]): ArgumentMetadata => ({
  type: "query",
  metatype,
});

describe("ListAppointmentsQueryRequest", () => {
  const pipe = new ZodValidationPipe(ListAppointmentsQuerySchema);
  const parse = (value: Record<string, unknown>) =>
    pipe.transform(
      value,
      meta(ListAppointmentsQueryRequest),
    ) as ListAppointmentsQueryRequest;

  it("aceita status único e normaliza para lista (compatível com o cliente antigo)", () => {
    expect(parse({ status: "AGENDADA" }).status).toEqual([
      AppointmentStatus.AGENDADA,
    ]);
  });

  it("aceita status repetido", () => {
    expect(
      parse({ status: ["AGENDADA", "CONFIRMADA", "CHECK_IN"] }).status,
    ).toEqual([
      AppointmentStatus.AGENDADA,
      AppointmentStatus.CONFIRMADA,
      AppointmentStatus.CHECK_IN,
    ]);
  });

  it("recusa status desconhecido", () => {
    expect(() => parse({ status: ["AGENDADA", "FOO"] })).toThrow();
  });

  it("pagina de verdade: a página 2 pula a primeira", () => {
    const query = parse({ page: "2", limit: "3", date: "2026-10-02" });
    expect(query.skip).toBe(3);
    expect(query.direction).toBe("asc");
  });

  it("respeita a direção pedida", () => {
    expect(parse({ direction: "desc" }).direction).toBe("desc");
  });
});

describe("ListPatientsQueryRequest", () => {
  const pipe = new ZodValidationPipe(ListPatientsQuerySchema);

  it("entrega skip e direction a partir de page/order", () => {
    const query = pipe.transform(
      { page: "2", limit: "5", order: "desc", hasPendencies: "true" },
      meta(ListPatientsQueryRequest),
    ) as ListPatientsQueryRequest;

    expect(query.skip).toBe(5);
    expect(query.direction).toBe("desc");
    expect(query.orderBy).toBe("name");
    expect(query.hasPendencies).toBe(true);
  });
});
