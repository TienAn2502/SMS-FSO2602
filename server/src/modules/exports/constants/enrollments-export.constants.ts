import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const ENROLLMENT_EXPORT_SHEET_NAME = 'Ghi_danh';

export const ENROLLMENT_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Mã HS', key: 'ma_hs', width: 14 },
  { header: 'Họ và tên', key: 'ho_ten', width: 28 },
  { header: 'Mã lớp HC', key: 'ma_lop_hc', width: 12 },
  { header: 'Tên lớp HC', key: 'ten_lop_hc', width: 20 },
  { header: 'Học kỳ', key: 'hoc_ky', width: 12 },
  { header: 'Năm học', key: 'nam_hoc', width: 16 },
  { header: 'Ngày ghi danh', key: 'ngay_ghi_danh', width: 16 },
  { header: 'Ngày rời lớp', key: 'ngay_roi', width: 16 },
  { header: 'Trạng thái', key: 'trang_thai', width: 18 },
  { header: 'Ghi chú', key: 'ghi_chu', width: 24 },
];

export const ENROLLMENT_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> = {
  xlsx: 'danh-sach-ghi-danh.xlsx',
  csv: 'danh-sach-ghi-danh.csv',
};
