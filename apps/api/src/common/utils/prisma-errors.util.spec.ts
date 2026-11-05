import { ArgumentsHost } from "@nestjs/common";
import { Prisma } from "@prisma/client";
import { AllExceptionsFilter } from "../filters/all-exceptions.filter";
import { isAppointmentOverlapViolation } from "./prisma-errors.util";

const CLIENT = { clientVersion: "6.19.3" };

const unknownOverlap = () =>
  new Prisma.PrismaClientUnknownRequestError(
    'ConnectorError(PostgresError { code: "23P01", message: "conflicting key value violates exclusion constraint \\"appointments_no_overlap\\"" })',
    CLIENT,
  );

describe("isAppointmentOverlapViolation", () => {
  it("reconhece a violação vinda de uma query do client (UnknownRequestError)", () => {
    expect(isAppointmentOverlapViolation(unknownOverlap())).toBe(true);
  });

  it("reconhece a violação vinda de query crua (P2010 com meta.code 23P01)", () => {
    const error = new Prisma.PrismaClientKnownRequestError(
      'Raw query failed. Code: `23P01`. Message: `conflicting key value violates exclusion constraint "appointments_no_overlap"`',
      { ...CLIENT, code: "P2010", meta: { code: "23P01" } },
    );
    expect(isAppointmentOverlapViolation(error)).toBe(true);
  });

  it("ignora outras constraints de exclusão e outros erros", () => {
    const otherExclusion = new Prisma.PrismaClientUnknownRequestError(
      'PostgresError { code: "23P01", message: "violates exclusion constraint \\"rooms_no_overlap\\"" }',
      CLIENT,
    );
    const unique = new Prisma.PrismaClientKnownRequestError("Unique", {
      ...CLIENT,
      code: "P2002",
    });
    expect(isAppointmentOverlapViolation(otherExclusion)).toBe(false);
    expect(isAppointmentOverlapViolation(unique)).toBe(false);
    expect(isAppointmentOverlapViolation(new Error("x"))).toBe(false);
  });
});

describe("AllExceptionsFilter com a trava de sobreposição", () => {
  it("responde 409 APPOINTMENT_SLOT_CONFLICT em vez de 500", () => {
    const json = jest.fn();
    const status = jest.fn().mockReturnValue({ json });
    const host = {
      switchToHttp: () => ({
        getResponse: () => ({ status }),
        getRequest: () => ({ url: "/appointments", method: "POST" }),
      }),
    } as unknown as ArgumentsHost;

    new AllExceptionsFilter().catch(unknownOverlap(), host);

    expect(status).toHaveBeenCalledWith(409);
    expect(json).toHaveBeenCalledWith(
      expect.objectContaining({
        statusCode: 409,
        code: "APPOINTMENT_SLOT_CONFLICT",
      }),
    );
  });
});
