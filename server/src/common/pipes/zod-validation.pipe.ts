import { Injectable, PipeTransform } from '@nestjs/common';
import type { ZodType } from 'zod';

import { ZodValidationException } from '@/common/exceptions/zod-validation.exception';

@Injectable()
export class ZodValidationPipe implements PipeTransform {
  constructor(private readonly schema: ZodType) {}

  transform(value: unknown) {
    const result = this.schema.safeParse(value);
    if (!result.success) {
      throw new ZodValidationException(result.error);
    }
    return result.data;
  }
}
