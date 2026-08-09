import { Readable } from 'node:stream';

import ExcelJS from 'exceljs';

import {
  TIMETABLE_MATRIX_DAY_LABELS,
  extractHomeroomClassCodeFromLabel,
} from '@/common/utils/timetable-matrix.util';
import {
  TIMETABLE_IMPORT_HEADER_MARKER,
  TIMETABLE_IMPORT_INSTRUCTION_SHEET_NAME,
} from '@/modules/imports/constants/timetable-import.constants';

export interface ParsedTimetableMatrixCell {
  dayOfWeek: number;
  periodNumber: number;
  rawValue: string;
}

export interface ParsedTimetableMatrixSheet {
  sheetName: string;
  homeroomClassCode: string | null;
  metadata: Record<string, string>;
  cells: ParsedTimetableMatrixCell[];
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

function findHeaderRowNumber(worksheet: ExcelJS.Worksheet): number {
  const marker = TIMETABLE_IMPORT_HEADER_MARKER.trim().toLowerCase();

  for (let rowNumber = 1; rowNumber <= worksheet.rowCount; rowNumber += 1) {
    const firstCell = normalizeCell(worksheet.getRow(rowNumber).getCell(1).value);
    if (firstCell.toLowerCase() === marker) {
      return rowNumber;
    }
  }

  throw new Error('TIMETABLE_IMPORT_HEADER_NOT_FOUND');
}

function parseMetadataLines(
  worksheet: ExcelJS.Worksheet,
  headerRowNumber: number,
): Record<string, string> {
  const metadata: Record<string, string> = {};

  for (let rowNumber = 2; rowNumber < headerRowNumber - 1; rowNumber += 1) {
    const label = normalizeCell(worksheet.getRow(rowNumber).getCell(1).value);
    const value = normalizeCell(worksheet.getRow(rowNumber).getCell(2).value);

    if (label) {
      metadata[label] = value;
    }
  }

  return metadata;
}

function resolveHomeroomClassCode(
  sheetName: string,
  metadata: Record<string, string>,
): string | null {
  const metadataValue = metadata['Lớp HC'];
  if (metadataValue) {
    return extractHomeroomClassCodeFromLabel(metadataValue);
  }

  const trimmedSheetName = sheetName.trim();
  return trimmedSheetName.length > 0 ? trimmedSheetName : null;
}

function buildDayColumnMap(
  worksheet: ExcelJS.Worksheet,
  headerRowNumber: number,
): Map<number, number> {
  const headerRow = worksheet.getRow(headerRowNumber);
  const dayByColumn = new Map<number, number>();
  const labelToDay = Object.fromEntries(
    Object.entries(TIMETABLE_MATRIX_DAY_LABELS).map(([day, label]) => [
      label.toLowerCase(),
      Number(day),
    ]),
  );

  headerRow.eachCell((cell, columnNumber) => {
    const header = normalizeCell(cell.value).toLowerCase();
    const dayOfWeek = labelToDay[header];
    if (dayOfWeek) {
      dayByColumn.set(columnNumber, dayOfWeek);
    }
  });

  return dayByColumn;
}

function parseWorksheet(worksheet: ExcelJS.Worksheet): ParsedTimetableMatrixSheet {
  const headerRowNumber = findHeaderRowNumber(worksheet);
  const metadata = parseMetadataLines(worksheet, headerRowNumber);
  const homeroomClassCode = resolveHomeroomClassCode(worksheet.name, metadata);
  const dayByColumn = buildDayColumnMap(worksheet, headerRowNumber);
  const cells: ParsedTimetableMatrixCell[] = [];

  for (
    let rowNumber = headerRowNumber + 1;
    rowNumber <= worksheet.rowCount;
    rowNumber += 1
  ) {
    const row = worksheet.getRow(rowNumber);
    const periodValue = normalizeCell(row.getCell(1).value);
    if (!periodValue) {
      continue;
    }

    const periodNumber = Number.parseInt(periodValue, 10);
    if (!Number.isInteger(periodNumber) || periodNumber < 1) {
      continue;
    }

    for (const [columnNumber, dayOfWeek] of dayByColumn.entries()) {
      const rawValue = normalizeCell(row.getCell(columnNumber).value);
      if (!rawValue) {
        continue;
      }

      cells.push({
        dayOfWeek,
        periodNumber,
        rawValue,
      });
    }
  }

  return {
    sheetName: worksheet.name,
    homeroomClassCode,
    metadata,
    cells,
  };
}

export async function parseTimetableMatrixXlsxBuffer(
  buffer: Buffer,
): Promise<ParsedTimetableMatrixSheet[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.read(Readable.from(buffer));

  const sheets = workbook.worksheets.filter(
    (worksheet) =>
      worksheet.name.trim().toLowerCase() !==
      TIMETABLE_IMPORT_INSTRUCTION_SHEET_NAME.toLowerCase(),
  );

  if (sheets.length === 0) {
    throw new Error('WORKSHEET_EMPTY');
  }

  return sheets.map(parseWorksheet);
}
