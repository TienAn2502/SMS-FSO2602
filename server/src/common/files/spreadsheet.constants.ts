import type { ImportFileFormat } from '@/common/files/file-format.types';

export const CSV_UTF8_BOM = '\uFEFF';

export const SPREADSHEET_MIME_TYPES: Record<ImportFileFormat, string[]> = {
  xlsx: [
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'application/vnd.ms-excel',
  ],
  csv: ['text/csv', 'text/plain', 'application/csv'],
};

export const SPREADSHEET_EXTENSIONS: Record<ImportFileFormat, string[]> = {
  xlsx: ['.xlsx'],
  csv: ['.csv'],
};

export const DEFAULT_CSV_DELIMITER = ',';
