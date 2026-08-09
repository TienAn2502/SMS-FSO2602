import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const TEACHING_ASSIGNMENT_EXPORT_SHEET_NAME = 'Phan_cong_giang_day';

export const TEACHING_ASSIGNMENT_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Email GV', key: 'email_gv', width: 28 },
  { header: 'Họ tên GV', key: 'ho_ten_gv', width: 24 },
  { header: 'Mã lớp môn', key: 'ma_lop_mon', width: 16 },
  { header: 'Tên lớp môn', key: 'ten_lop_mon', width: 24 },
  { header: 'Học kỳ', key: 'hoc_ky', width: 12 },
  { header: 'Năm học', key: 'nam_hoc', width: 16 },
  { header: 'Ngày phân công', key: 'ngay_phan_cong', width: 16 },
  { header: 'Ngày kết thúc', key: 'ngay_ket_thuc', width: 16 },
  { header: 'Trạng thái', key: 'trang_thai', width: 12 },
];

export const TEACHING_ASSIGNMENT_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> =
  {
    xlsx: 'danh-sach-phan-cong-giang-day.xlsx',
    csv: 'danh-sach-phan-cong-giang-day.csv',
  };
