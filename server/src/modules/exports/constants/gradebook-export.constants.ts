import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const GRADEBOOK_EXPORT_SHEET_NAME = 'So_diem';

export const GRADEBOOK_EXPORT_BASE_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Mã HS', key: 'ma_hs', width: 14 },
  { header: 'Họ và tên', key: 'ho_ten', width: 28 },
];

export const GRADEBOOK_EXPORT_AVERAGE_COLUMN: SpreadsheetColumnDef = {
  header: 'TB HK',
  key: 'tb_hk',
  width: 10,
};

export const GRADEBOOK_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> = {
  xlsx: 'so-diem-lop-mon.xlsx',
  csv: 'so-diem-lop-mon.csv',
};
