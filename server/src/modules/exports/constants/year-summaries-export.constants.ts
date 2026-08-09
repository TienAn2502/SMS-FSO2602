import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const YEAR_SUMMARY_EXPORT_SHEET_NAME = 'Tong_ket_nam_hoc';

export const YEAR_SUMMARY_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Mã HS', key: 'ma_hs', width: 14 },
  { header: 'Họ và tên', key: 'ho_ten', width: 28 },
  { header: 'Mã lớp HC', key: 'ma_lop_hc', width: 12 },
  { header: 'Khối', key: 'khoi', width: 8 },
  { header: 'Năm học', key: 'nam_hoc', width: 16 },
  { header: 'TB chung', key: 'tb_chung', width: 10 },
  { header: 'Học lực', key: 'hoc_luc', width: 12 },
  { header: 'Hạnh kiểm', key: 'hanh_kiem', width: 12 },
  { header: 'Quyết định', key: 'quyet_dinh', width: 14 },
  { header: 'Lớp năm sau', key: 'lop_nam_sau', width: 12 },
  { header: 'Số buổi vắng', key: 'so_buoi_vang', width: 12 },
  { header: 'Trạng thái', key: 'trang_thai', width: 12 },
];

export const YEAR_SUMMARY_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> = {
  xlsx: 'tong-ket-nam-hoc.xlsx',
  csv: 'tong-ket-nam-hoc.csv',
};
