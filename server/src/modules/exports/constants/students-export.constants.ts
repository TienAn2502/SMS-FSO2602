import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const STUDENT_EXPORT_SHEET_NAME = 'Hoc_sinh';

// key phải trùng với key của rows
export const STUDENT_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Họ và tên', key: 'ho_ten', width: 28 },
  { header: 'Ngày sinh', key: 'ngay_sinh', width: 14 },
  { header: 'Giới tính', key: 'gioi_tinh', width: 12 },
  { header: 'Email', key: 'email', width: 28 },
  { header: 'Mã lớp học', key: 'ma_lop_hc', width: 12 },
  { header: 'Mã ngoại', key: 'external_code', width: 16 },
  { header: 'Trạng thái', key: 'trang_thai', width: 12 },
];

export const STUDENT_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> = {
  xlsx: 'danh-sach-hoc-sinh.xlsx',
  csv: 'danh-sach-hoc-sinh.csv',
};
