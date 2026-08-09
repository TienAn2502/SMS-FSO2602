import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const HOMEROOM_CLASS_IMPORT_SHEET_NAME = 'Lop_hanh_chinh';

export const HOMEROOM_CLASS_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ma_lop_hc', key: 'ma_lop_hc', width: 12 },
  { header: 'ten_lop', key: 'ten_lop', width: 20 },
  { header: 'ma_khoi', key: 'ma_khoi', width: 10 },
  { header: 'si_so', key: 'si_so', width: 10 },
  { header: 'email_gvcn', key: 'email_gvcn', width: 28 },
];

export const HOMEROOM_CLASS_IMPORT_REQUIRED_HEADERS = [
  'ma_lop_hc',
  'ten_lop',
  'ma_khoi',
] as const;

export const HOMEROOM_CLASS_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import lớp hành chính',
  '',
  'Cột bắt buộc: ma_lop_hc, ten_lop, ma_khoi',
  'Cột tuỳ chọn: si_so, email_gvcn (email GV chủ nhiệm đã có trên hệ thống)',
  '',
  'Quy tắc:',
  '- Import vào năm học đã chọn trên form',
  '- ma_khoi phải khớp mã khối trong hệ thống (vd: 10, 11, 12)',
  '- ma_lop_hc dùng để cập nhật lớp đã có trong cùng năm học',
  '- Một mã lớp HC chỉ xuất hiện một lần trong file',
];

export const HOMEROOM_CLASS_IMPORT_SAMPLE_ROWS: Record<string, string>[] = [
  {
    ma_lop_hc: '10A1',
    ten_lop: '10A1',
    ma_khoi: '10',
    si_so: '45',
    email_gvcn: 'nguyenthilan.import@demo.edu.vn',
  },
  {
    ma_lop_hc: '10A2',
    ten_lop: '10A2',
    ma_khoi: '10',
    si_so: '45',
    email_gvcn: '',
  },
  {
    ma_lop_hc: '11A1',
    ten_lop: '11A1',
    ma_khoi: '11',
    si_so: '40',
    email_gvcn: 'tranvanhung.import@demo.edu.vn',
  },
  {
    ma_lop_hc: '12A1',
    ten_lop: '12A1',
    ma_khoi: '12',
    si_so: '42',
    email_gvcn: '',
  },
];
