import { HttpStatus } from '@nestjs/common';

import { AppException } from '@/common/exceptions/app.exception';
import {
  assertImportFileFormat,
  detectImportFileFormat,
} from '@/common/files/detect-file-format.util';
import type {
  ParseUploadedFileOptions,
  ParsedSpreadsheet,
} from '@/common/files/file-format.types';
import { parseCsvBuffer } from '@/common/files/parse-csv.util';
import { parseXlsxBuffer } from '@/common/files/parse-xlsx.util';

function validateUploadPresence(
  file: Express.Multer.File | undefined,
): asserts file is Express.Multer.File {
  if (!file) {
    throw new AppException(
      'VALIDATION_ERROR',
      'File upload là bắt buộc',
      HttpStatus.BAD_REQUEST,
    );
  }
}

function validateUploadSize(file: Express.Multer.File, maxBytes: number): void {
  if (file.size > maxBytes) {
    throw new AppException(
      'FILE_TOO_LARGE',
      'File vượt quá giới hạn dung lượng cho phép',
      HttpStatus.BAD_REQUEST,
    );
  }
}

function validateRowCount(rows: ParsedSpreadsheet['rows'], maxRows: number): void {
  if (rows.length > maxRows) {
    throw new AppException(
      'IMPORT_TOO_MANY_ROWS',
      `File vượt quá ${maxRows} dòng dữ liệu cho phép`,
      HttpStatus.BAD_REQUEST,
    );
  }
}

export async function parseUploadedSpreadsheet(
  file: Express.Multer.File | undefined,
  options: ParseUploadedFileOptions,
): Promise<ParsedSpreadsheet> {
  validateUploadPresence(file);
  validateUploadSize(file, options.maxBytes);

  const format = detectImportFileFormat(file);
  if (!format) {
    throw new AppException(
      'UNSUPPORTED_FILE_FORMAT',
      'Chỉ hỗ trợ file .xlsx hoặc .csv',
      HttpStatus.BAD_REQUEST,
    );
  }

  let parsed: ParsedSpreadsheet;

  try {
    if (format === 'csv') {
      parsed = parseCsvBuffer(file.buffer);
    } else {
      parsed = await parseXlsxBuffer(
        file.buffer,
        options.sheetName,
        options.headerMarker,
      );
    }
  } catch (error: unknown) {
    if (error instanceof Error && error.message === 'WORKSHEET_NOT_FOUND') {
      throw new AppException(
        'WORKSHEET_NOT_FOUND',
        'Không tìm thấy sheet trong file Excel',
        HttpStatus.BAD_REQUEST,
      );
    }

    if (error instanceof Error && error.message === 'WORKSHEET_EMPTY') {
      throw new AppException(
        'WORKSHEET_EMPTY',
        'File Excel không có dữ liệu',
        HttpStatus.BAD_REQUEST,
      );
    }

    throw new AppException(
      'FILE_PARSE_ERROR',
      'Không đọc được nội dung file',
      HttpStatus.BAD_REQUEST,
    );
  }

  validateRowCount(parsed.rows, options.maxRows);
  return parsed;
}

export { assertImportFileFormat, detectImportFileFormat };
