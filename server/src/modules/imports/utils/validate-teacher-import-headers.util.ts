import { TEACHER_IMPORT_REQUIRED_HEADERS } from '@/modules/imports/constants/teachers-import.constants';
import type { TeacherImportRowError } from '@/modules/imports/schemas/teachers-import.schema';

export function validateTeacherImportHeaders(
  headers: string[],
): TeacherImportRowError[] {
  const normalized = new Set(headers.map((header) => header.trim()));
  const errors: TeacherImportRowError[] = [];

  for (const required of TEACHER_IMPORT_REQUIRED_HEADERS) {
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
