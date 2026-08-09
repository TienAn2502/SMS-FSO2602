import {
  STUDENT_IMPORT_REQUIRED_HEADERS,
} from '@/modules/imports/constants/students-import.constants';
import type { StudentImportRowError } from '@/modules/imports/schemas/students-import.schema';

export function validateStudentImportHeaders(
  headers: string[],
): StudentImportRowError[] {
  const normalized = new Set(headers.map((header) => header.trim()));
  const errors: StudentImportRowError[] = [];

  for (const required of STUDENT_IMPORT_REQUIRED_HEADERS) {
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
