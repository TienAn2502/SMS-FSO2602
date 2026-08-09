import type { SpreadsheetColumnDef } from '@/common/files/file-format.types';

export const SCORE_IMPORT_SHEET_NAME = 'Diem';

export const SCORE_IMPORT_COLUMNS: SpreadsheetColumnDef[] = [
  { header: 'ma_hs', key: 'ma_hs', width: 16 },
  { header: 'ho_ten', key: 'ho_ten', width: 28 },
  { header: 'diem', key: 'diem', width: 10 },
  { header: 'ghi_chu', key: 'ghi_chu', width: 24 },
];

export const SCORE_IMPORT_REQUIRED_HEADERS = ['ma_hs'] as const;

export const SCORE_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import điểm',
  '',
  'Phần đầu sheet Diem ghi rõ lớp môn, năm học, học kỳ, môn và đầu điểm.',
  'Chỉ sửa các cột dữ liệu bên dưới (bắt đầu từ dòng có header ma_hs).',
  '',
  'Cột bắt buộc: ma_hs',
  'Cột tuỳ chọn: ho_ten (đối chiếu), diem, ghi_chu',
  '',
  'Quy tắc:',
  '- Import vào lớp môn và đầu điểm đã chọn trên form Portal',
  '- ma_hs phải khớp mã học sinh (external_code) đã ghi danh lớp HC của lớp môn',
  '- diem để trống nếu chưa nhập; số nguyên hoặc .25, .5, .75',
  '- Sổ điểm đã khóa sẽ không import được',
  '- Một mã HS chỉ xuất hiện một lần trong file',
];

export const SCORE_IMPORT_SAMPLE_METADATA = {
  title: 'MẪU IMPORT ĐIỂM',
  lines: [
    { label: 'Lớp môn', value: 'VAN-10A1 — Ngữ văn 10A1' },
    { label: 'Môn học', value: 'Ngữ văn' },
    { label: 'Lớp HC', value: '10A1' },
    { label: 'Năm học', value: '2025-2026' },
    { label: 'Học kỳ', value: 'Học kỳ 1' },
    { label: 'Đầu điểm', value: 'Điểm TX 1 (2025-09-01)' },
  ],
};

export const SCORE_IMPORT_SAMPLE_ROWS: Record<string, string>[] = [
  { ma_hs: 'HS001', ho_ten: 'Nguyễn Văn A', diem: '8', ghi_chu: '' },
  { ma_hs: 'HS002', ho_ten: 'Trần Thị B', diem: '7.5', ghi_chu: '' },
  { ma_hs: 'HS003', ho_ten: 'Lê Văn C', diem: '', ghi_chu: '' },
];
