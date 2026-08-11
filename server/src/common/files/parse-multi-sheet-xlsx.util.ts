import { Readable } from 'node:stream';

import ExcelJS from 'exceljs';

import type { ParsedSpreadsheet } from '@/common/files/file-format.types';

function normalizeHeader(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  return String(value).trim();
}

function normalizeCell(value: ExcelJS.CellValue): string {
  if (value === null || value === undefined) {
    return '';
  }
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }
  if (typeof value === 'object' && 'text' in value && value.text != null) {
    return String(value.text).trim();
  }
  return String(value).trim();
}

function parseWorksheet(worksheet: ExcelJS.Worksheet): ParsedSpreadsheet {
  const headerRow = worksheet.getRow(1);
  const headerValues = (headerRow.values as ExcelJS.CellValue[]).slice(1);
  const headers = headerValues.map(normalizeHeader).filter(Boolean);

  const rows: ParsedSpreadsheet['rows'] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= 1) {
      return;
    }

    const data: Record<string, string> = {};
    headers.forEach((header, columnIndex) => {
      data[header] = normalizeCell(row.getCell(columnIndex + 1).value);
    });

    const hasValue = Object.values(data).some((value) => value.length > 0);
    if (!hasValue) {
      return;
    }

    rows.push({ rowNumber, data });
  });

  return {
    format: 'xlsx',
    headers,
    rows,
  };
}

export type ParsedNamedSpreadsheet = ParsedSpreadsheet & {
  sheetName: string;
};

const SKIP_SHEET_NAMES = new Set([
  'huong_dan',
  'hướng_dẫn',
  'huongdan',
  'instruction',
  'instructions',
]);

function shouldSkipSheet(name: string): boolean {
  const normalized = name.trim().toLowerCase().replace(/\s+/g, '_');
  return SKIP_SHEET_NAMES.has(normalized) || normalized.startsWith('huong');
}

/** Parse mọi sheet dữ liệu (bỏ sheet hướng dẫn). Tên sheet = mã lớp. */
export async function parseMultiSheetXlsxBuffer(
  buffer: Buffer,
): Promise<ParsedNamedSpreadsheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.read(Readable.from(buffer));

  const sheets = workbook.worksheets.filter(
    (worksheet) => !shouldSkipSheet(worksheet.name),
  );

  if (sheets.length === 0) {
    throw new Error('WORKSHEET_EMPTY');
  }

  return sheets.map((worksheet) => ({
    sheetName: worksheet.name.trim(),
    ...parseWorksheet(worksheet),
  }));
}
