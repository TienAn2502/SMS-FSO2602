export const TIMETABLE_IMPORT_INSTRUCTION_SHEET_NAME = 'Huong_dan';

export const TIMETABLE_IMPORT_HEADER_MARKER = 'Tiết';

export const TIMETABLE_IMPORT_TEMPLATE_FILENAME =
  'timetable-import-sample.xlsx';

export const TIMETABLE_IMPORT_SAMPLE_CLASSES = [
  {
    code: '10A1',
    name: '10A1',
    academicYearName: '2025-2026',
    semesterName: 'Học kỳ 1',
    entries: [
      {
        dayOfWeek: 1,
        periodNumber: 1,
        courseSectionCode: 'TOAN-10A1',
        teacherEmail: 'tranvanhung.import@demo.edu.vn',
        room: 'P.101',
      },
      {
        dayOfWeek: 1,
        periodNumber: 2,
        courseSectionCode: 'VAN-10A1',
        teacherEmail: 'nguyenthilan.import@demo.edu.vn',
        room: 'P.101',
      },
      {
        dayOfWeek: 1,
        periodNumber: 3,
        courseSectionCode: 'ANH-10A1',
        teacherEmail: 'lethimai.import@demo.edu.vn',
        room: 'P.102',
      },
      {
        dayOfWeek: 2,
        periodNumber: 1,
        courseSectionCode: 'LY-10A1',
        teacherEmail: 'phamvanminh.import@demo.edu.vn',
        room: 'P.201',
      },
    ],
  },
  {
    code: '10A2',
    name: '10A2',
    academicYearName: '2025-2026',
    semesterName: 'Học kỳ 1',
    entries: [
      {
        dayOfWeek: 1,
        periodNumber: 1,
        courseSectionCode: 'TOAN-10A2',
        teacherEmail: 'tranvanhung.import@demo.edu.vn',
        room: 'P.103',
      },
      {
        dayOfWeek: 1,
        periodNumber: 2,
        courseSectionCode: 'VAN-10A2',
        teacherEmail: 'nguyenthilan.import@demo.edu.vn',
        room: 'P.103',
      },
      {
        dayOfWeek: 3,
        periodNumber: 2,
        courseSectionCode: 'HOA-10A2',
        teacherEmail: 'lethimai.import@demo.edu.vn',
        room: 'P.LAB1',
      },
    ],
  },
] as const;

export const TIMETABLE_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import thời khóa biểu (TKB)',
  '',
  'Cấu trúc file:',
  '- Mỗi sheet = một lớp hành chính (ma trận Thứ x Tiết)',
  '- Dòng metadata: Lớp HC, Năm học, Học kỳ, Số tiết',
  '- Dòng header: Tiết | Thứ 2 | Thứ 3 | Thứ 4 | Thứ 5 | Thứ 6',
  '',
  'Nội dung mỗi ô (3 dòng):',
  '  Dòng 1: ma_lop_mon (vd. VAN-10A2)',
  '  Dòng 2: email_gv (vd. gv.van@demo.edu.vn)',
  '  Dòng 3: phòng học (tuỳ chọn, vd. P.101)',
  '',
  'Quy tắc:',
  '- Chỉ hỗ trợ file .xlsx',
  '- Import vào học kỳ đã chọn trên form',
  '- GV phải đã được phân công lớp môn tương ứng',
  '- Không trùng tiết trong cùng lớp môn hoặc lịch GV',
  '- Chế độ replace: xóa TKB cũ của từng lớp HC trong file rồi ghi mới',
  '- Chế độ merge: giữ tiết cũ, cập nhật/thêm tiết có trong file',
  '- File mẫu tham khảo: docs/samples/timetable-import-sample.xlsx',
];
