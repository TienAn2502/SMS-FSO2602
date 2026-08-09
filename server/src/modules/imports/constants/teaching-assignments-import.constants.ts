import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const TEACHING_ASSIGNMENT_IMPORT_SHEET_NAME = 'Phan_cong_giang_day';

export const TEACHING_ASSIGNMENT_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'email_gv', key: 'email_gv', width: 28 },
  { header: 'ma_lop_mon', key: 'ma_lop_mon', width: 16 },
  { header: 'ngay_phan_cong', key: 'ngay_phan_cong', width: 16 },
];

export const TEACHING_ASSIGNMENT_IMPORT_REQUIRED_HEADERS = [
  'email_gv',
  'ma_lop_mon',
  'ngay_phan_cong',
] as const;

export const TEACHING_ASSIGNMENT_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import phân công giảng dạy',
  '',
  'Cột bắt buộc: email_gv, ma_lop_mon, ngay_phan_cong (YYYY-MM-DD)',
  '',
  'Quy tắc:',
  '- Import vào học kỳ đã chọn trên form',
  '- email_gv phải khớp email giáo viên đang hoạt động trên hệ thống',
  '- ma_lop_mon phải khớp mã lớp môn trong học kỳ đã chọn',
  '- Mỗi lớp môn chỉ có một giáo viên đang phân công (ACTIVE)',
  '- Một cặp email_gv + ma_lop_mon chỉ xuất hiện một lần trong file',
  '- Nếu phân công đã tồn tại nhưng INACTIVE sẽ được kích hoạt lại',
];

export const TEACHING_ASSIGNMENT_IMPORT_SAMPLE_ROWS: Record<string, string>[] =
  [
    {
      email_gv: 'nguyenthilan.import@demo.edu.vn',
      ma_lop_mon: 'TOAN-10A1',
      ngay_phan_cong: '2025-09-01',
    },
    {
      email_gv: 'tranvanhung.import@demo.edu.vn',
      ma_lop_mon: 'VAN-10A1',
      ngay_phan_cong: '2025-09-01',
    },
    {
      email_gv: 'lethimai.import@demo.edu.vn',
      ma_lop_mon: 'ANH-10A1',
      ngay_phan_cong: '2025-09-01',
    },
  ];
