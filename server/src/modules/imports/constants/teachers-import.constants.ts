import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const TEACHER_IMPORT_SHEET_NAME = 'Giao_vien';

export const TEACHER_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ho_ten', key: 'ho_ten', width: 28 },
  { header: 'ngay_sinh', key: 'ngay_sinh', width: 14 },
  { header: 'gioi_tinh', key: 'gioi_tinh', width: 12 },
  { header: 'email', key: 'email', width: 28 },
  { header: 'mat_khau', key: 'mat_khau', width: 16 },
  { header: 'phone', key: 'phone', width: 14 },
  { header: 'chuyen_mon', key: 'chuyen_mon', width: 20 },
  { header: 'dia_chi', key: 'dia_chi', width: 32 },
];

export const TEACHER_IMPORT_REQUIRED_HEADERS = ['ho_ten'] as const;

export const TEACHER_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import giáo viên',
  '',
  'Cột bắt buộc: ho_ten',
  'Cột tuỳ chọn: ngay_sinh (YYYY-MM-DD), gioi_tinh (MALE/FEMALE/OTHER hoặc Nam/Nữ), email, mat_khau, phone, chuyen_mon, dia_chi',
  '',
  'Quy tắc:',
  '- Nếu có email: tạo/cập nhật theo email (mat_khau tuỳ chọn; bỏ trống dùng mật khẩu mặc định hệ thống)',
  '- Không có email: luôn tạo hồ sơ giáo viên mới',
  '- Mã GV (GV-{số}) được hệ thống tự cấp khi tạo mới',
];

export const TEACHER_IMPORT_SAMPLE_ROWS: Record<string, string>[] = [
  {
    ho_ten: 'Nguyễn Thị Lan',
    ngay_sinh: '1985-03-15',
    gioi_tinh: 'Nữ',
    email: 'nguyenthilan.import@demo.edu.vn',
    mat_khau: 'Demo@123456',
    phone: '0901234567',
    chuyen_mon: 'Toán',
    dia_chi: '123 Đường ABC, Quận 1',
  },
  {
    ho_ten: 'Trần Văn Hùng',
    ngay_sinh: '1980-07-22',
    gioi_tinh: 'Nam',
    email: 'tranvanhung.import@demo.edu.vn',
    mat_khau: '',
    phone: '0912345678',
    chuyen_mon: 'Vật lý',
    dia_chi: '',
  },
  {
    ho_ten: 'Lê Thị Mai',
    ngay_sinh: '',
    gioi_tinh: '',
    email: '',
    mat_khau: '',
    phone: '0923456789',
    chuyen_mon: 'Tiếng Anh',
    dia_chi: '',
  },
];
