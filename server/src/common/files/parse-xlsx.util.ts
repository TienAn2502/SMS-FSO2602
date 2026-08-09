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

function resolveWorksheet(
  workbook: ExcelJS.Workbook,
  sheetName?: string,
): ExcelJS.Worksheet {
  if (sheetName) {
    const named = workbook.getWorksheet(sheetName);
    if (!named) {
      throw new Error('WORKSHEET_NOT_FOUND');
    }
    return named;
  }

  const first = workbook.worksheets[0];
  if (!first) {
    throw new Error('WORKSHEET_EMPTY');
  }
  return first;
}

function findHeaderRowNumber(
  worksheet: ExcelJS.Worksheet,
  headerMarker: string,
): number {
  const marker = headerMarker.trim().toLowerCase();

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const row = worksheet.getRow(rowNumber);
    const values = (row.values as ExcelJS.CellValue[]).slice(1);
    const headers = values.map(normalizeHeader).filter(Boolean);

    if (headers.some((header) => header.toLowerCase() === marker)) {
      return rowNumber;
    }
  }

  return 1;
}

export async function parseXlsxBuffer(
  buffer: Buffer,
  sheetName?: string,
  headerMarker?: string,
): Promise<ParsedSpreadsheet> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.read(Readable.from(buffer));

  const worksheet = resolveWorksheet(workbook, sheetName);
  const headerRowNumber = headerMarker
    ? findHeaderRowNumber(worksheet, headerMarker)
    : 1;
  const headerRow = worksheet.getRow(headerRowNumber);
  const headerValues = (headerRow.values as ExcelJS.CellValue[]).slice(1);
  const headers = headerValues.map(normalizeHeader).filter(Boolean);

  const rows: ParsedSpreadsheet['rows'] = [];

  worksheet.eachRow((row, rowNumber) => {
    if (rowNumber <= headerRowNumber) {
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
