import { stringify } from 'csv-stringify/sync';

import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';
import {
  CSV_UTF8_BOM,
  DEFAULT_CSV_DELIMITER,
} from '@/common/files/spreadsheet.constants';

export interface CsvWriterOptions {
  columns: SpreadsheetColumnDef[];
  rows: Record<string, unknown>[];
  includeBom?: boolean;
  preambleLines?: string[];
}

export function createCsvBuffer(options: CsvWriterOptions): Buffer {
  const { columns, rows, includeBom = true, preambleLines = [] } = options;

  const csvBody = stringify(rows, {
    header: true,
    columns: columns.map((column) => ({
      key: column.key,
      header: column.header,
    })),
    delimiter: DEFAULT_CSV_DELIMITER,
  });

  const preamble =
    preambleLines.length > 0 ? `${preambleLines.join('\n')}\n\n` : '';
  const content = includeBom
    ? `${CSV_UTF8_BOM}${preamble}${csvBody}`
    : `${preamble}${csvBody}`;
  return Buffer.from(content, 'utf8');
}

export function getCsvContentType(): string {
  return 'text/csv; charset=utf-8';
}

export function getXlsxContentType(): string {
  return 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet';
}
