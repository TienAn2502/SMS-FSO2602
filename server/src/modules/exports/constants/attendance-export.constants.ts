import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const ATTENDANCE_EXPORT_SHEET_NAME = 'Diem_danh';

export const ATTENDANCE_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Ngày', key: 'ngay', width: 14 },
  { header: 'Tiết', key: 'tiet', width: 8 },
  { header: 'Mã lớp môn', key: 'ma_lop_mon', width: 14 },
  { header: 'Tên lớp môn', key: 'ten_lop_mon', width: 24 },
  { header: 'Mã lớp HC', key: 'ma_lop_hc', width: 12 },
  { header: 'Mã HS', key: 'ma_hs', width: 14 },
  { header: 'Họ và tên', key: 'ho_ten', width: 28 },
  { header: 'Trạng thái', key: 'trang_thai', width: 14 },
  { header: 'Ghi chú', key: 'ghi_chu', width: 24 },
];

export const ATTENDANCE_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> = {
  xlsx: 'bao-cao-diem-danh.xlsx',
  csv: 'bao-cao-diem-danh.csv',
};
