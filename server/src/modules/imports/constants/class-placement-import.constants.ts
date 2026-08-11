import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const CLASS_PLACEMENT_IMPORT_SKIP_SHEETS = ['Huong_dan'] as const;

export const CLASS_PLACEMENT_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ho_ten', key: 'ho_ten', width: 28 },
  { header: 'ngay_sinh', key: 'ngay_sinh', width: 14 },
  { header: 'gioi_tinh', key: 'gioi_tinh', width: 12 },
  { header: 'email', key: 'email', width: 28 },
  { header: 'mat_khau', key: 'mat_khau', width: 16 },
  { header: 'external_code', key: 'external_code', width: 16 },
];

export const CLASS_PLACEMENT_IMPORT_REQUIRED_HEADERS = [
  'ho_ten',
  'ngay_sinh',
] as const;

export const CLASS_PLACEMENT_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import chia lớp đầu năm',
  '',
  'Mỗi sheet (trang tính) = một lớp HC. Tên sheet = mã lớp (vd. 10A1, 10A2).',
  'Cột bắt buộc trên mỗi sheet: ho_ten, ngay_sinh (YYYY-MM-DD)',
  'Cột tuỳ chọn: gioi_tinh, email, mat_khau, external_code (mã HS, vd HS-261; bỏ trống → tự cấp)',
  '',
  'Quy tắc:',
  '- Nếu lớp chưa có trong năm học đã chọn → hệ thống tự tạo (suy khối từ mã lớp, vd. 10A1 → khối 10)',
  '- Học sinh được tạo/cập nhật và ghi danh ACTIVE vào lớp của sheet',
  '- Một học sinh không được xuất hiện ở hai sheet',
  '- Sheet tên Huong_dan bị bỏ qua',
  '',
  'Tải mẫu kèm năm học + học kỳ: điền sẵn HS ở lại lớp / mới lên cấp chưa có lớp (gợi ý sheet theo mã lớp).',
];

export function buildClassPlacementImportInstructionLines(meta: {
  academicYearName: string;
  semesterLabel: string;
  included: number;
  retainedCount: number;
  newIntakeCount: number;
  skippedNoDob: number;
  skippedNoKey: number;
  usedStaticFallback: boolean;
}): string[] {
  const lines = [
    ...CLASS_PLACEMENT_IMPORT_INSTRUCTION_LINES,
    '',
    `Năm học: ${meta.academicYearName}`,
    `Học kỳ: ${meta.semesterLabel}`,
  ];

  if (meta.usedStaticFallback) {
    lines.push(
      '',
      'Không có HS ở lại / mới lên cấp đủ điều kiện trong DB — file dùng dữ liệu mẫu tĩnh.',
      'Điều kiện: có external_code hoặc email, và có ngày sinh.',
    );
    return lines;
  }

  lines.push(
    '',
    `Đã điền ${meta.included} HS từ DB (ở lại: ${meta.retainedCount}, mới lên cấp: ${meta.newIntakeCount}).`,
    'Gợi ý sheet: ở lại → mã lớp năm trước; mới lên cấp → chia đều lớp khối đầu cấp (hoặc {khối}A1 nếu chưa có lớp).',
    'Bạn có thể kéo HS sang sheet khác trước khi import.',
  );

  if (meta.skippedNoDob > 0 || meta.skippedNoKey > 0) {
    lines.push(
      `Bỏ qua: thiếu ngày sinh ${meta.skippedNoDob}, thiếu mã/email ${meta.skippedNoKey}.`,
    );
  }

  return lines;
}

export const CLASS_PLACEMENT_IMPORT_SAMPLE_BY_SHEET: Record<
  string,
  Record<string, string>[]
> = {
  '10A1': [
    {
      ho_ten: 'Nguyễn Văn An',
      ngay_sinh: '2009-05-12',
      gioi_tinh: 'Nam',
      email: 'nguyenvanan.placement@demo.edu.vn',
      mat_khau: 'Demo@123456',
      external_code: 'HS-261',
    },
    {
      ho_ten: 'Trần Thị Bình',
      ngay_sinh: '2009-08-20',
      gioi_tinh: 'Nữ',
      email: '',
      mat_khau: '',
      external_code: 'HS-262',
    },
  ],
  '10A2': [
    {
      ho_ten: 'Hoàng Minh Tuấn',
      ngay_sinh: '2009-01-30',
      gioi_tinh: 'Nam',
      email: 'hoangminhtuan.placement@demo.edu.vn',
      mat_khau: '',
      external_code: 'HS-263',
    },
  ],
};
