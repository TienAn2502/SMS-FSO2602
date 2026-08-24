import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const SCORE_IMPORT_SHEET_NAME = 'Diem';

/** Legacy: 1 cột diem / 1 đầu điểm */
export const SCORE_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ma_hs', key: 'ma_hs', width: 16 },
  { header: 'ho_ten', key: 'ho_ten', width: 28 },
  { header: 'diem', key: 'diem', width: 10 },
  { header: 'ghi_chu', key: 'ghi_chu', width: 24 },
];

export const SCORE_IMPORT_REQUIRED_HEADERS = ['ma_hs'] as const;

export const SCORE_IMPORT_MATRIX_IDENTITY_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ma_hs', key: 'ma_hs', width: 16 },
  { header: 'ho_ten', key: 'ho_ten', width: 28 },
];

export const SCORE_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import điểm',
  '',
  'File mẫu dạng bảng sổ điểm: ma_hs | ho_ten | TX1 | TX2 | … | GK | CK',
  'Cột TX/GK/CK khớp cột trên UI sổ điểm lớp môn.',
  '',
  'Cột bắt buộc: ma_hs',
  'Cột điểm: TX1…TXn, GK, CK (để trống nếu chưa nhập)',
  '',
  'Quy tắc:',
  '- Import vào lớp môn đã chọn trên form Portal (không cần chọn từng đầu điểm)',
  '- ma_hs phải khớp mã học sinh (external_code) đã ghi danh lớp HC',
  '- Điểm: số nguyên hoặc .25, .5, .75',
  '- Đầu điểm đã khóa sẽ bị bỏ qua / báo lỗi',
  '- Một mã HS chỉ xuất hiện một lần trong file',
  '',
  'Tương thích cũ: file có cột diem + chọn 1 đầu điểm trên form vẫn dùng được.',
];

export const SCORE_IMPORT_SAMPLE_METADATA = {
  title: 'MẪU IMPORT ĐIỂM',
  lines: [
    { label: 'Lớp môn', value: 'TOAN-10A1 — Toán học 10A1' },
    { label: 'Môn học', value: 'Toán học' },
    { label: 'Lớp HC', value: '10A1' },
    { label: 'Năm học', value: '2025-2026' },
    { label: 'Học kỳ', value: 'Học kỳ 2' },
    { label: 'Đầu điểm', value: 'Tất cả (TX / Giữa kỳ / Cuối kỳ)' },
  ],
};

export const SCORE_IMPORT_SAMPLE_MATRIX_COLUMNS: SpreadsheetColumnDef[] = [
  ...SCORE_IMPORT_MATRIX_IDENTITY_COLUMNS,
  { header: 'TX1', key: 'TX1', width: 8 },
  { header: 'TX2', key: 'TX2', width: 8 },
  { header: 'TX3', key: 'TX3', width: 8 },
  { header: 'TX4', key: 'TX4', width: 8 },
  { header: 'GK', key: 'GK', width: 8 },
  { header: 'CK', key: 'CK', width: 8 },
];

export const SCORE_IMPORT_SAMPLE_MATRIX_ROWS: Record<string, string>[] = [
  {
    ma_hs: 'HS-261',
    ho_ten: 'Nguyễn Văn A',
    TX1: '8',
    TX2: '7.5',
    TX3: '8.5',
    TX4: '8',
    GK: '7',
    CK: '8.25',
  },
  {
    ma_hs: 'HS-262',
    ho_ten: 'Trần Thị B',
    TX1: '7',
    TX2: '7.25',
    TX3: '6.5',
    TX4: '7',
    GK: '6.75',
    CK: '7.5',
  },
  {
    ma_hs: 'HS-263',
    ho_ten: 'Lê Văn C',
    TX1: '',
    TX2: '',
    TX3: '',
    TX4: '',
    GK: '',
    CK: '',
  },
];

/** @deprecated Dùng SCORE_IMPORT_SAMPLE_MATRIX_ROWS */
export const SCORE_IMPORT_SAMPLE_ROWS: Record<string, string>[] = [
  { ma_hs: 'HS-261', ho_ten: 'Nguyễn Văn A', diem: '8', ghi_chu: '' },
  { ma_hs: 'HS-262', ho_ten: 'Trần Thị B', diem: '7.5', ghi_chu: '' },
  { ma_hs: 'HS-263', ho_ten: 'Lê Văn C', diem: '', ghi_chu: '' },
];
