import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const SEMESTER_SUMMARY_EXPORT_SHEET_NAME = 'Tong_ket_hoc_ky';

export const SEMESTER_SUMMARY_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Mã HS', key: 'ma_hs', width: 14 },
  { header: 'Họ và tên', key: 'ho_ten', width: 28 },
  { header: 'Mã lớp HC', key: 'ma_lop_hc', width: 12 },
  { header: 'Học kỳ', key: 'hoc_ky', width: 12 },
  { header: 'TB chung', key: 'tb_chung', width: 10 },
  { header: 'Học lực', key: 'hoc_luc', width: 12 },
  { header: 'Hạnh kiểm', key: 'hanh_kiem', width: 12 },
  { header: 'Số môn', key: 'so_mon', width: 10 },
  { header: 'Trạng thái', key: 'trang_thai', width: 12 },
];

export const SEMESTER_SUMMARY_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> =
  {
    xlsx: 'tong-ket-hoc-ky.xlsx',
    csv: 'tong-ket-hoc-ky.csv',
  };
