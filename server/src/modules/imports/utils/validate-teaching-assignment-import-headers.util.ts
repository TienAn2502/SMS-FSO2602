import { TEACHING_ASSIGNMENT_IMPORT_REQUIRED_HEADERS } from '@/modules/imports/constants/teaching-assignments-import.constants';
import type { TeachingAssignmentImportRowError } from '@/modules/imports/schemas/teaching-assignments-import.schema';

export function validateTeachingAssignmentImportHeaders(
  headers: string[],
): TeachingAssignmentImportRowError[] {
  const normalized = new Set(headers.map((header) => header.trim()));
  const errors: TeachingAssignmentImportRowError[] = [];

  for (const required of TEACHING_ASSIGNMENT_IMPORT_REQUIRED_HEADERS) {
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
