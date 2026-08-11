import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const STUDENT_IMPORT_SHEET_NAME = 'Hoc_sinh';

export const STUDENT_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ho_ten', key: 'ho_ten', width: 28 },
  { header: 'ngay_sinh', key: 'ngay_sinh', width: 14 },
  { header: 'gioi_tinh', key: 'gioi_tinh', width: 12 },
  { header: 'email', key: 'email', width: 28 },
  { header: 'mat_khau', key: 'mat_khau', width: 16 },
  { header: 'ma_lop_hc', key: 'ma_lop_hc', width: 12 },
  { header: 'external_code', key: 'external_code', width: 16 },
];

export const STUDENT_IMPORT_REQUIRED_HEADERS = [
  'ho_ten',
  'ngay_sinh',
] as const;

export const STUDENT_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import học sinh',
  '',
  'Cột bắt buộc: ho_ten, ngay_sinh (YYYY-MM-DD)',
  'Cột tuỳ chọn: gioi_tinh (MALE/FEMALE/OTHER hoặc Nam/Nữ), email, mat_khau, ma_lop_hc, external_code',
  '',
  'Quy tắc:',
  '- ma_lop_hc nếu có phải tồn tại trong năm học đã chọn; bỏ trống = chỉ tạo hồ sơ (xếp lớp sau tại màn Xếp lớp)',
  '- Nếu có email: tạo tài khoản đăng nhập (mat_khau tuỳ chọn; bỏ trống dùng mật khẩu mặc định hệ thống)',
  '- external_code = mã HS (vd HS-261); bỏ trống → hệ thống tự cấp HS-{YY}{số}',
  '- Một học sinh chỉ ghi danh một lớp HC trong cùng học kỳ',
];

export const STUDENT_IMPORT_SAMPLE_ROWS: Record<string, string>[] = [
  {
    ho_ten: 'Nguyễn Văn An',
    ngay_sinh: '2009-05-12',
    gioi_tinh: 'Nam',
    email: 'nguyenvanan.import@demo.edu.vn',
    mat_khau: 'Demo@123456',
    ma_lop_hc: '10A1',
    external_code: 'HS-261',
  },
  {
    ho_ten: 'Trần Thị Bình',
    ngay_sinh: '2009-08-20',
    gioi_tinh: 'Nữ',
    email: '',
    mat_khau: '',
    ma_lop_hc: '10A1',
    external_code: 'HS-262',
  },
  {
    ho_ten: 'Lê Văn Cường',
    ngay_sinh: '2008-03-01',
    gioi_tinh: 'MALE',
    email: 'levancuong.import@demo.edu.vn',
    mat_khau: '',
    ma_lop_hc: '11A2',
    external_code: 'HS-26150',
  },
  {
    ho_ten: 'Phạm Thị Dung',
    ngay_sinh: '2007-11-15',
    gioi_tinh: 'FEMALE',
    email: '',
    mat_khau: '',
    ma_lop_hc: '12A3',
    external_code: '',
  },
  {
    ho_ten: 'Hoàng Minh Tuấn',
    ngay_sinh: '2009-01-30',
    gioi_tinh: '',
    email: 'hoangminhtuan.import@demo.edu.vn',
    mat_khau: 'Demo@123456',
    ma_lop_hc: '10A2',
    external_code: 'HS-263',
  },
];
