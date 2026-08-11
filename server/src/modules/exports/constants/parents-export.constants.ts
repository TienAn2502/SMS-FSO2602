import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const PARENT_EXPORT_SHEET_NAME = 'Phu_huynh';

export const PARENT_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Mã PH', key: 'ma_ph', width: 12 },
  { header: 'Họ và tên', key: 'ho_ten', width: 28 },
  { header: 'SĐT', key: 'phone', width: 14 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Mã HS', key: 'ma_hs', width: 16 },
  { header: 'Quan hệ', key: 'quan_he', width: 16 },
  { header: 'Liên hệ chính', key: 'lien_he_chinh', width: 14 },
  { header: 'Trạng thái', key: 'trang_thai', width: 12 },
];

export const PARENT_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> = {
  xlsx: 'danh-sach-phu-huynh.xlsx',
  csv: 'danh-sach-phu-huynh.csv',
};
