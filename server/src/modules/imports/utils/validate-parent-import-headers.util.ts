import { PARENT_IMPORT_REQUIRED_HEADERS } from '@/modules/imports/constants/parents-import.constants';
import type { ParentImportRowError } from '@/modules/imports/schemas/parents-import.schema';

export function validateParentImportHeaders(
  headers: string[],
): ParentImportRowError[] {
  const normalized = new Set(headers.map((header) => header.trim()));
  const errors: ParentImportRowError[] = [];

  for (const required of PARENT_IMPORT_REQUIRED_HEADERS) {
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
