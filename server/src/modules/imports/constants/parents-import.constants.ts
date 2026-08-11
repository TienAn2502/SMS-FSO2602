import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const PARENT_IMPORT_SHEET_NAME = 'Phu_huynh';

export const PARENT_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ho_ten', key: 'ho_ten', width: 28 },
  { header: 'phone', key: 'phone', width: 14 },
  { header: 'email', key: 'email', width: 28 },
  { header: 'mat_khau', key: 'mat_khau', width: 16 },
  { header: 'ma_hs', key: 'ma_hs', width: 16 },
  { header: 'quan_he', key: 'quan_he', width: 16 },
  { header: 'lien_he_chinh', key: 'lien_he_chinh', width: 14 },
];

export const PARENT_IMPORT_REQUIRED_HEADERS = ['ho_ten'] as const;

export const PARENT_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import phụ huynh',
  '',
  'Cột bắt buộc: ho_ten',
  'Cột tuỳ chọn: phone, email, mat_khau, ma_hs (mã HS, vd HS-261), quan_he (FATHER/MOTHER/GUARDIAN/OTHER hoặc Bố/Mẹ), lien_he_chinh (1/0, có/không)',
  '',
  'Quy tắc:',
  '- Nếu có email: tạo/cập nhật theo email (mat_khau tuỳ chọn; bỏ trống dùng mật khẩu mặc định hệ thống)',
  '- Không có email: luôn tạo hồ sơ phụ huynh mới (mã PH-{số} tự cấp)',
  '- ma_hs + quan_he: liên kết phụ huynh với học sinh (một dòng = một liên kết)',
  '- Cùng email có thể xuất hiện nhiều dòng với ma_hs khác nhau',
];

export const PARENT_IMPORT_SAMPLE_ROWS: Record<string, string>[] = [
  {
    ho_ten: 'Nguyễn Văn Ba',
    phone: '0901111222',
    email: 'nguyenvanba.import@demo.edu.vn',
    mat_khau: 'Demo@123456',
    ma_hs: 'HS-261',
    quan_he: 'Bố',
    lien_he_chinh: '1',
  },
  {
    ho_ten: 'Trần Thị Năm',
    phone: '0903333444',
    email: 'tranthinam.import@demo.edu.vn',
    mat_khau: '',
    ma_hs: 'HS-262',
    quan_he: 'Mẹ',
    lien_he_chinh: '1',
  },
  {
    ho_ten: 'Nguyễn Văn Ba',
    phone: '0901111222',
    email: 'nguyenvanba.import@demo.edu.vn',
    mat_khau: '',
    ma_hs: 'HS-263',
    quan_he: 'Bố',
    lien_he_chinh: '0',
  },
  {
    ho_ten: 'Lê Thị Sáu',
    phone: '0905555666',
    email: '',
    mat_khau: '',
    ma_hs: '',
    quan_he: '',
    lien_he_chinh: '',
  },
];
