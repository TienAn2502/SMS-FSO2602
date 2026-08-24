export const TIMETABLE_IMPORT_INSTRUCTION_SHEET_NAME = 'Huong_dan';

export const TIMETABLE_IMPORT_HEADER_MARKER = 'Tiết';

export const TIMETABLE_IMPORT_TEMPLATE_FILENAME =
  'timetable-import-sample.xlsx';

type SampleTimetableEntry = {
  dayOfWeek: number;
  periodNumber: number;
  /** Nhãn hiển thị trong ô (tên môn). */
  subjectLabel: string;
  room: string;
};

type SampleTimetableClass = {
  code: string;
  name: string;
  academicYearName: string;
  semesterName: string;
  entries: SampleTimetableEntry[];
};

const SAMPLE_YEAR = '2026-2027';
const SAMPLE_SEMESTER = 'Học kỳ 1';

/** Môn xoay vòng trong mẫu (đủ sáng + chiều) — hiển thị tên môn, không ghi GV. */
const SAMPLE_SUBJECTS = [
  { code: 'TOAN', name: 'Toán học' },
  { code: 'VAN', name: 'Ngữ văn' },
  { code: 'ANH', name: 'Tiếng Anh' },
  { code: 'LY', name: 'Vật lý' },
  { code: 'HOA', name: 'Hóa học' },
  { code: 'SINH', name: 'Sinh học' },
  { code: 'SU', name: 'Lịch sử' },
  { code: 'DIA', name: 'Địa lý' },
  { code: 'TIN', name: 'Tin học' },
  { code: 'TD', name: 'Giáo dục thể chất' },
  { code: 'CN', name: 'Công nghệ' },
  { code: 'GDQP', name: 'Giáo dục quốc phòng và an ninh' },
  { code: 'GKTPL', name: 'Giáo dục kinh tế và pháp luật' },
] as const;

const SUBJECT_DISPLAY_NAME_BY_CODE = new Map<string, string>(
  SAMPLE_SUBJECTS.map((row) => [row.code, row.name]),
);

export function getSubjectDisplayName(subjectCode: string): string {
  return (
    SUBJECT_DISPLAY_NAME_BY_CODE.get(subjectCode.toUpperCase()) ?? subjectCode
  );
}

/** Tiết điền trong mẫu: cả sáng (1–5) và một phần chiều (6–8). */
const SAMPLE_PERIODS = [1, 2, 3, 4, 5, 6, 7, 8] as const;

/**
 * Sinh TKB mẫu cho một lớp: mỗi ô chỉ ghi mã môn (không cần GV).
 * GV được hệ thống lấy từ phân công khi import.
 */
export function buildSampleTimetableEntriesForClass(
  classCode: string,
  classIndex: number,
): SampleTimetableEntry[] {
  const room = `P.${100 + classIndex + 1}`;
  const entries: SampleTimetableEntry[] = [];
  let subjectCursor = classIndex % SAMPLE_SUBJECTS.length;

  for (let day = 1; day <= 5; day += 1) {
    for (const period of SAMPLE_PERIODS) {
      const subject =
        SAMPLE_SUBJECTS[subjectCursor % SAMPLE_SUBJECTS.length] ??
        SAMPLE_SUBJECTS[0]!;
      subjectCursor += 1;

      entries.push({
        dayOfWeek: day,
        periodNumber: period,
        subjectLabel: subject.name,
        room,
      });
    }
  }

  return entries;
}

function buildSampleClass(
  code: string,
  classIndex: number,
): SampleTimetableClass {
  return {
    code,
    name: code,
    academicYearName: SAMPLE_YEAR,
    semesterName: SAMPLE_SEMESTER,
    entries: buildSampleTimetableEntriesForClass(code, classIndex),
  };
}

/** Đủ lớp demo seed: 3 khối × 5 lớp, mỗi lớp có TKB mẫu đầy đủ. */
export const TIMETABLE_IMPORT_SAMPLE_CLASSES: SampleTimetableClass[] = [
  '10A1',
  '10A2',
  '10A3',
  '10A4',
  '10A5',
  '11A1',
  '11A2',
  '11A3',
  '11A4',
  '11A5',
  '12A1',
  '12A2',
  '12A3',
  '12A4',
  '12A5',
].map((code, index) => buildSampleClass(code, index));

/**
 * Gợi ý TKB từ danh sách lớp môn đã có GV: mỗi lớp môn một tiết,
 * ô chỉ ghi mã môn.
 */
export function suggestTimetableEntriesFromSections(
  classCode: string,
  sections: Array<{ subjectCode: string; subjectName?: string }>,
  classIndex = 0,
): Array<{
  dayOfWeek: number;
  periodNumber: number;
  subjectLabel: string;
  room: string | null;
}> {
  const uniqueSubjects = new Map<string, string>();
  for (const section of sections) {
    const code = section.subjectCode.trim().toUpperCase();
    if (!code || uniqueSubjects.has(code)) {
      continue;
    }
    uniqueSubjects.set(
      code,
      section.subjectName?.trim() || getSubjectDisplayName(code),
    );
  }

  if (uniqueSubjects.size === 0) {
    return [];
  }

  const room = `P.${classCode}`;
  const entries: Array<{
    dayOfWeek: number;
    periodNumber: number;
    subjectLabel: string;
    room: string | null;
  }> = [];

  const usedSlots = new Set<string>();
  const subjectList = [...uniqueSubjects.entries()];

  for (let i = 0; i < subjectList.length; i += 1) {
    const [, subjectLabel] = subjectList[i] ?? [];
    if (!subjectLabel) {
      continue;
    }

    let placed = false;
    for (let attempt = 0; attempt < 50 && !placed; attempt += 1) {
      const offset = classIndex + i + attempt;
      const dayOfWeek = (offset % 5) + 1;
      const periodNumber = (Math.floor(offset / 5) % 10) + 1;
      const slotKey = `${dayOfWeek}:${periodNumber}`;
      if (usedSlots.has(slotKey)) {
        continue;
      }
      usedSlots.add(slotKey);
      entries.push({
        dayOfWeek,
        periodNumber,
        subjectLabel,
        room,
      });
      placed = true;
    }
  }

  return entries;
}

export const TIMETABLE_IMPORT_INSTRUCTION_LINES = [
  'Hướng dẫn import thời khóa biểu (TKB)',
  '',
  'Cấu trúc file:',
  '- Mỗi sheet = một lớp hành chính (ma trận Thứ x Tiết)',
  '- Dòng metadata: Lớp HC, Năm học, Học kỳ, Số tiết',
  '- Dòng header: Tiết | Thứ 2 | Thứ 3 | Thứ 4 | Thứ 5 | Thứ 6',
  '- Mỗi ngày có 10 tiết: 1–5 sáng, 6–10 chiều',
  '',
  'Nội dung mỗi ô:',
  '  Dòng 1 (bắt buộc): mã môn (TOAN) hoặc tên môn (Toán học) hoặc mã lớp môn (TOAN-10A1)',
  '  Dòng 2 (tuỳ chọn): phòng học (vd. P.101)',
  '  Không cần ghi giáo viên — hệ thống đối chiếu Phân công giảng dạy (ACTIVE) theo lớp HC + môn',
  '',
  'Quy tắc:',
  '- Chỉ hỗ trợ file .xlsx',
  '- Import vào học kỳ đã chọn trên form',
  '- Ô có môn nhưng chưa phân công GV → bỏ qua (không báo lỗi)',
  '- Không trùng tiết trong cùng lớp môn hoặc lịch GV',
  '- Import ghi đè TKB cũ của từng lớp HC có trong file (ô trống = không tạo tiết)',
  '',
  'Tải mẫu kèm học kỳ:',
  '- Khối 11/12: ưu tiên TKB ACTIVE HK2 năm trước',
  '- Khối 10 hoặc thiếu TKB năm trước: gợi ý lịch từ lớp môn đã phân công',
  '',
  'File mẫu tham khảo: docs/samples/timetable-import-sample.xlsx',
];

export function buildTimetableImportInstructionLines(meta: {
  academicYearName: string;
  semesterLabel: string;
  entryGradeCode: string | null;
  totalClasses: number;
  entryClassCount: number;
  upperFilledClassCount: number;
  upperEmptyClassCount: number;
  suggestedClassCount: number;
  sampleFallbackClassCount?: number;
}): string[] {
  const lines = [
    ...TIMETABLE_IMPORT_INSTRUCTION_LINES,
    '',
    `Năm học: ${meta.academicYearName}`,
    `Học kỳ: ${meta.semesterLabel}`,
    `Tổng ${meta.totalClasses} lớp HC.`,
    meta.entryGradeCode
      ? `Khối đầu cấp (${meta.entryGradeCode}): ${meta.entryClassCount} lớp.`
      : `Khối đầu cấp: ${meta.entryClassCount} lớp.`,
    `Khối trên lấy từ năm trước: ${meta.upperFilledClassCount} lớp; còn thiếu: ${meta.upperEmptyClassCount} lớp.`,
    `Đã gợi ý lịch từ phân công hiện tại: ${meta.suggestedClassCount} lớp.`,
  ];

  if (meta.sampleFallbackClassCount && meta.sampleFallbackClassCount > 0) {
    lines.push(
      `Điền mẫu tĩnh (chưa có lớp môn): ${meta.sampleFallbackClassCount} lớp.`,
    );
  }

  return lines;
}
