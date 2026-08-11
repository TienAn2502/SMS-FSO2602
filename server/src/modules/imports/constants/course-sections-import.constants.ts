import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const COURSE_SECTION_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ma_mon', key: 'ma_mon', width: 12 },
  { header: 'ten_lop_mon', key: 'ten_lop_mon', width: 24 },
  { header: 'ma_lop_mon', key: 'ma_lop_mon', width: 16 },
  { header: 'email_gv', key: 'email_gv', width: 28 },
];

export const COURSE_SECTION_IMPORT_REQUIRED_HEADERS = ['ma_mon'] as const;

export const COURSE_SECTION_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import lớp môn học',
  '',
  'Mỗi sheet = một lớp hành chính. Tên sheet = mã lớp HC (vd. 10A1, 11A1).',
  'Cột bắt buộc: ma_mon (mã môn trong hệ thống, vd. TOAN)',
  'Cột tuỳ chọn: ten_lop_mon, ma_lop_mon, email_gv',
  '',
  'Quy tắc:',
  '- Chọn học kỳ trên form trước khi import',
  '- Lớp HC (tên sheet) phải đã tồn tại trong năm học của học kỳ',
  '- Môn phải được cấu hình cho khối của lớp (grade_level_subjects ACTIVE)',
  '- Bỏ trống ma_lop_mon → tự tạo dạng TOAN-10A1',
  '- Bỏ trống ten_lop_mon → tự tạo dạng "Toán học 10A1"',
  '- Có email_gv → tạo phân công ACTIVE cho GV (nếu lớp môn mới hoặc chưa có GV ACTIVE)',
  '- Lớp môn đã có (cùng lớp HC + môn trong học kỳ) → bỏ qua',
  '- Sheet Huong_dan bị bỏ qua',
  '',
  'Mẫu có học kỳ: khối 10 lấy môn từ cấu hình khối (tạo mới); khối 11/12 ưu tiên môn từ HK2 năm trước (đã lọc theo cấu hình khối hiện tại).',
  'Không copy bản ghi — mỗi lần import tạo record lớp môn mới cho học kỳ đích.',
  'File mẫu tham khảo: docs/samples/course-sections-import-sample.xlsx',
];

function buildStaticSheetRows(classCode: string): Record<string, string>[] {
  return [
    {
      ma_mon: 'TOAN',
      ten_lop_mon: `Toán học ${classCode}`,
      ma_lop_mon: `TOAN-${classCode}`,
      email_gv: '',
    },
    {
      ma_mon: 'VAN',
      ten_lop_mon: `Ngữ văn ${classCode}`,
      ma_lop_mon: `VAN-${classCode}`,
      email_gv: '',
    },
    {
      ma_mon: 'ANH',
      ten_lop_mon: `Tiếng Anh ${classCode}`,
      ma_lop_mon: `ANH-${classCode}`,
      email_gv: '',
    },
  ];
}

export const COURSE_SECTION_IMPORT_SAMPLE_BY_SHEET: Record<
  string,
  Record<string, string>[]
> = {
  '10A1': buildStaticSheetRows('10A1'),
  '10A2': buildStaticSheetRows('10A2'),
  '10A3': buildStaticSheetRows('10A3'),
  '11A1': buildStaticSheetRows('11A1'),
  '12A1': buildStaticSheetRows('12A1'),
};

export function buildCourseSectionCode(
  subjectCode: string,
  classCode: string,
): string {
  const code = `${subjectCode}-${classCode}`.toUpperCase();
  return code.slice(0, 30);
}

export function buildCourseSectionName(
  subjectName: string,
  classCode: string,
): string {
  const name = `${subjectName} ${classCode}`.trim();
  return name.slice(0, 100);
}
