import { HOMEROOM_CLASS_IMPORT_REQUIRED_HEADERS } from '@/modules/imports/constants/homeroom-classes-import.constants';
import type { HomeroomClassImportRowError } from '@/modules/imports/schemas/homeroom-classes-import.schema';

export function validateHomeroomClassImportHeaders(
  headers: string[],
): HomeroomClassImportRowError[] {
  const normalized = new Set(headers.map((header) => header.trim()));
  const errors: HomeroomClassImportRowError[] = [];

  for (const required of HOMEROOM_CLASS_IMPORT_REQUIRED_HEADERS) {
    if (!normalized.has(required)) {
      errors.push({
        row: 1,
        field: required,
        message: `Thiếu cột bắt buộc "${required}"`,
      });
    }
  }

  return errors;
}
