import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const TEACHER_EXPORT_SHEET_NAME = 'Giao_vien';

export const TEACHER_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Mã GV', key: 'ma_gv', width: 12 },
  { header: 'Họ và tên', key: 'ho_ten', width: 28 },
  { header: 'Ngày sinh', key: 'ngay_sinh', width: 15 },
  { header: 'Giới tính', key: 'gioi_tinh', width: 13 },
  { header: 'Email', key: 'email', width: 30 },
  { header: 'SĐT', key: 'phone', width: 16 },
  { header: 'Chuyên môn', key: 'chuyen_mon', width: 35 },
  { header: 'Địa chỉ', key: 'dia_chi', width: 35 },
  { header: 'Trạng thái', key: 'trang_thai', width: 14 },
];

export const TEACHER_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> = {
  xlsx: 'danh-sach-giao-vien.xlsx',
  csv: 'danh-sach-giao-vien.csv',
};
