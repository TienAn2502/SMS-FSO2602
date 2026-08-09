import { extname } from 'node:path';

import type { ImportFileFormat } from '@/common/files/file-format.types';
import {
  SPREADSHEET_EXTENSIONS,
  SPREADSHEET_MIME_TYPES,
} from '@/common/files/spreadsheet.constants';


// Nhận diện file qua đuôi mở rộng
function extensionOf(originalname: string | undefined): string {
  if (!originalname) {
    return '';
  }
  return extname(originalname).toLowerCase();
}

export function detectImportFileFormat(
  file: Express.Multer.File,
): ImportFileFormat | null {
  const extension = extensionOf(file.originalname);

  if (SPREADSHEET_EXTENSIONS.xlsx.includes(extension)) {
    return 'xlsx';
  }

  if (SPREADSHEET_EXTENSIONS.csv.includes(extension)) {
    return 'csv';
  }

  const mime = file.mimetype?.toLowerCase() ?? '';

  if (SPREADSHEET_MIME_TYPES.xlsx.some((value) => mime.includes(value))) {
    return 'xlsx';
  }

  if (SPREADSHEET_MIME_TYPES.csv.some((value) => mime.includes(value))) {
    return 'csv';
  }

  return null;
}

export function assertImportFileFormat(
  file: Express.Multer.File,
): ImportFileFormat {
  const format = detectImportFileFormat(file);
  if (!format) {
    throw new Error('UNSUPPORTED_FILE_FORMAT');
  }
  return format;
}
