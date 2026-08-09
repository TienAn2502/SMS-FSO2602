import { parse } from 'csv-parse/sync';

import type { ParsedSpreadsheet } from '@/common/files/file-format.types';
import { DEFAULT_CSV_DELIMITER } from '@/common/files/spreadsheet.constants';

function normalizeHeader(value: unknown): string {
  return String(value ?? '')
    .trim()
    .replace(/^\uFEFF/, '');
}

function normalizeCell(value: unknown): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

export function parseCsvBuffer(buffer: Buffer): ParsedSpreadsheet {
  const records = parse(buffer, {
    bom: true,
    columns: true,
    skip_empty_lines: true,
    trim: true,
    relax_column_count: true,
    delimiter: DEFAULT_CSV_DELIMITER,
  }) as Record<string, unknown>[];

  const headers =
    records.length > 0
      ? Object.keys(records[0]).map(normalizeHeader).filter(Boolean)
      : [];

  const rows = records.map((record, index) => {
    const data: Record<string, string> = {};
    for (const header of headers) {
      data[header] = normalizeCell(record[header]);
    }
    return {
      rowNumber: index + 2,
      data,
    };
  });

  return {
    format: 'csv',
    headers,
    rows,
  };
}
