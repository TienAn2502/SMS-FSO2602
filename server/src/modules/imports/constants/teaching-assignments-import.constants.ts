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
  'Cột bắt buộc (khi có email_gv): email_gv, ma_lop_mon, ngay_phan_cong (YYYY-MM-DD)',
  '',
  'Quy tắc:',
  '- Import vào học kỳ đã chọn trên form',
  '- Dòng để trống email_gv sẽ bị bỏ qua (không import, không báo lỗi)',
  '- email_gv phải khớp email giáo viên đang hoạt động trên hệ thống',
  '- ma_lop_mon phải khớp mã lớp môn trong học kỳ đã chọn',
  '- Mỗi lớp môn chỉ có một giáo viên đang phân công (ACTIVE)',
  '- Một cặp email_gv + ma_lop_mon chỉ xuất hiện một lần trong file',
  '- Nếu phân công đã tồn tại nhưng INACTIVE sẽ được kích hoạt lại',
  '',
  'Tải mẫu kèm học kỳ:',
  '- Khối đầu cấp (vd. 10): email_gv để trống — điền GV mới hoặc bỏ trống để import sau',
  '- Khối 11/12: email_gv lấy từ phân công ACTIVE HK2 năm trước (cùng mã lớp HC + mã môn)',
  '',
  'File mẫu tham khảo: docs/samples/teaching-assignments-import-sample.xlsx',
];

export function buildTeachingAssignmentImportInstructionLines(meta: {
  academicYearName: string;
  semesterLabel: string;
  entryGradeCode: string | null;
  totalRows: number;
  entryRows: number;
  upperFilled: number;
  upperEmpty: number;
}): string[] {
  return [
    ...TEACHING_ASSIGNMENT_IMPORT_INSTRUCTION_LINES,
    '',
    `Năm học: ${meta.academicYearName}`,
    `Học kỳ: ${meta.semesterLabel}`,
    `Tổng ${meta.totalRows} dòng lớp môn.`,
    meta.entryGradeCode
      ? `Khối đầu cấp (${meta.entryGradeCode}): ${meta.entryRows} dòng — email trống (điền mới).`
      : `Khối đầu cấp: ${meta.entryRows} dòng — email trống.`,
    `Khối trên: ${meta.upperFilled} dòng đã điền GV từ năm trước; ${meta.upperEmpty} dòng thiếu GV (cần điền tay).`,
  ];
}

export const TEACHING_ASSIGNMENT_IMPORT_SAMPLE_ROWS: Record<string, string>[] =
  [
    {
      email_gv: '',
      ma_lop_mon: 'TOAN-10A1',
      ngay_phan_cong: '2026-09-01',
    },
    {
      email_gv: '',
      ma_lop_mon: 'VAN-10A1',
      ngay_phan_cong: '2026-09-01',
    },
    {
      email_gv: 'nguyenthilan.import@demo.edu.vn',
      ma_lop_mon: 'TOAN-11A1',
      ngay_phan_cong: '2026-09-01',
    },
    {
      email_gv: 'tranvanhung.import@demo.edu.vn',
      ma_lop_mon: 'VAN-11A1',
      ngay_phan_cong: '2026-09-01',
    },
    {
      email_gv: 'lethimai.import@demo.edu.vn',
      ma_lop_mon: 'TOAN-12A1',
      ngay_phan_cong: '2026-09-01',
    },
  ];
