import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const HOMEROOM_CLASS_EXPORT_SHEET_NAME = 'Lop_hanh_chinh';

export const HOMEROOM_CLASS_EXPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'Mã lớp HC', key: 'ma_lop_hc', width: 12 },
  { header: 'Tên lớp', key: 'ten_lop', width: 20 },
  { header: 'Mã khối', key: 'ma_khoi', width: 10 },
  { header: 'Tên khối', key: 'ten_khoi', width: 16 },
  { header: 'Năm học', key: 'nam_hoc', width: 16 },
  { header: 'Sĩ số tối đa', key: 'si_so', width: 12 },
  { header: 'GVCN', key: 'ho_ten_gvcn', width: 24 },
  { header: 'Email GVCN', key: 'email_gvcn', width: 28 },
  { header: 'Trạng thái', key: 'trang_thai', width: 12 },
];

export const HOMEROOM_CLASS_EXPORT_FILENAMES: Record<'xlsx' | 'csv', string> =
  {
    xlsx: 'danh-sach-lop-hanh-chinh.xlsx',
    csv: 'danh-sach-lop-hanh-chinh.csv',
  };
