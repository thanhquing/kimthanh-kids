import { BadRequestException, PipeTransform } from "@nestjs/common";
import { ZodSchema } from "zod";

/** Pipe validate body/query bằng Zod schema. */
export class ZodValidationPipe<T> implements PipeTransform {
  constructor(private readonly schema: ZodSchema<T>) {}

  transform(value: unknown): T {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new BadRequestException({
        code: "VALIDATION_FAILED",
        message: "Dữ liệu không hợp lệ",
        details: result.error.flatten(),
      });
    }
    return result.data;
  }
}
