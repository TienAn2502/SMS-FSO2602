import ExcelJS from 'exceljs';

import type {
  SpreadsheetColumnDef,
  SpreadsheetSheetMetadata,
} from '@/common/files/file-format.types';

export class WorkbookBuilder {
  private readonly workbook = new ExcelJS.Workbook();

  addSheetFromRows(
    sheetName: string,
    columns: SpreadsheetColumnDef[],
    rows: Record<string, unknown>[],
  ): this {
    return this.addSheetFromRowsWithMetadata(sheetName, columns, rows);
  }

  addSheetFromRowsWithMetadata(
    sheetName: string,
    columns: SpreadsheetColumnDef[],
    rows: Record<string, unknown>[],
    metadata?: SpreadsheetSheetMetadata,
  ): this {
    const worksheet = this.workbook.addWorksheet(sheetName);
    const columnCount = Math.max(columns.length, 2);
    let nextRowNumber = 1;

    if (metadata) {
      const titleRow = worksheet.getRow(nextRowNumber);
      titleRow.getCell(1).value = metadata.title;
      worksheet.mergeCells(nextRowNumber, 1, nextRowNumber, columnCount);
      titleRow.font = { bold: true, size: 14 };
      titleRow.alignment = { horizontal: 'center', vertical: 'middle' };
      titleRow.height = 24;
      nextRowNumber += 1;

      for (const line of metadata.lines) {
        const row = worksheet.getRow(nextRowNumber);
        row.getCell(1).value = line.label;
        row.getCell(1).font = { bold: true };
        worksheet.mergeCells(nextRowNumber, 2, nextRowNumber, columnCount);
        row.getCell(2).value = line.value;
        nextRowNumber += 1;
      }

      nextRowNumber += 1;
    }

    columns.forEach((column, columnIndex) => {
      worksheet.getColumn(columnIndex + 1).width = column.width ?? 18;
    });

    const headerRow = worksheet.getRow(nextRowNumber);
    columns.forEach((column, columnIndex) => {
      const cell = headerRow.getCell(columnIndex + 1);
      cell.value = column.header;
      cell.font = { bold: true };
      cell.alignment = { vertical: 'middle', horizontal: 'center' };
    });
    headerRow.height = 20;
    nextRowNumber += 1;

    rows.forEach((row) => {
      const dataRow = worksheet.getRow(nextRowNumber);
      let maxLines = 1;

      columns.forEach((column, columnIndex) => {
        const rawValue = row[column.key];
        const value =
          rawValue === null || rawValue === undefined ? '' : String(rawValue);
        const cell = dataRow.getCell(columnIndex + 1);
        cell.value = value;

        if (value.includes('\n')) {
          const lineCount = value.split('\n').length;
          maxLines = Math.max(maxLines, lineCount);
          cell.alignment = {
            vertical: 'top',
            horizontal: 'left',
            wrapText: true,
          };
        } else if (columnIndex > 0) {
          cell.alignment = { vertical: 'middle', horizontal: 'left' };
        } else {
          cell.alignment = { vertical: 'middle', horizontal: 'center' };
        }
      });

      dataRow.height = Math.max(18, maxLines * 16);
      nextRowNumber += 1;
    });

    return this;
  }

  addInstructionSheet(sheetName: string, lines: string[]): this {
    const worksheet = this.workbook.addWorksheet(sheetName);
    lines.forEach((line, index) => {
      const row = worksheet.getRow(index + 1);
      row.getCell(1).value = line;
    });
    worksheet.getColumn(1).width = 80;
    return this;
  }

  async toBuffer(): Promise<Buffer> {
    const arrayBuffer = await this.workbook.xlsx.writeBuffer();
    return Buffer.from(arrayBuffer);
  }
}
