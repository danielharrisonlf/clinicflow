import { HttpStatus, Injectable, PipeTransform } from "@nestjs/common";
import { ZodError, ZodSchema } from "zod";
import { AppException } from "../exceptions/app.exception";

type ZodValidationErrorMessages = Readonly<Record<string, string>>;

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(
    private readonly schema: ZodSchema<unknown>,
    private readonly errorMessages?: ZodValidationErrorMessages,
  ) {}

  transform(value: unknown) {
    try {
      return this.schema.parse(value);
    } catch (err) {
      if (err instanceof ZodError) {
        const errorMessages = this.errorMessages;
        const issue = errorMessages
          ? err.issues.find((item) => item.message in errorMessages)
          : undefined;

        if (issue && errorMessages) {
          throw new AppException({
            code: "VALIDATION_FAILED",
            message: errorMessages[issue.message] ?? issue.message,
            status: HttpStatus.BAD_REQUEST,
            details: { issues: err.errors },
          });
        }

        throw new AppException({
          code: "VALIDATION_FAILED",
          message: "Dados enviados estão incorretos.",
          status: HttpStatus.BAD_REQUEST,
          details: {
            issues: err.errors.map((error) => ({
              path: error.path.join("."),
              message: error.message,
              code: error.code,
            })),
          },
        });
      }
      throw err;
    }
  }
}
