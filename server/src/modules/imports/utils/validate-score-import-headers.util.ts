import { SCORE_IMPORT_REQUIRED_HEADERS } from '@/modules/imports/constants/scores-import.constants';
import type { ScoreImportRowError } from '@/modules/imports/schemas/scores-import.schema';

export function validateScoreImportHeaders(
  headers: string[],
): ScoreImportRowError[] {
  const normalized = new Set(headers.map((header) => header.trim()));
  const errors: ScoreImportRowError[] = [];

  for (const required of SCORE_IMPORT_REQUIRED_HEADERS) {
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
