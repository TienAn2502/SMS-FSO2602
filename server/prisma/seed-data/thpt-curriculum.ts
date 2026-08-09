/** Môn học THPT theo Chương trình GDPT 2018 (BGD) — dùng cho seed demo. */
export const CLASSES_PER_GRADE = 5;
export const STUDENTS_PER_CLASS = 30;

export const DEMO_GRADE_LEVELS = [
  { code: '10', name: 'Khối 10', birthYear: 2009 },
  { code: '11', name: 'Khối 11', birthYear: 2008 },
  { code: '12', name: 'Khối 12', birthYear: 2007 },
] as const;

export const THPT_SUBJECTS = [
  { code: 'TOAN', name: 'Toán học', isRequired: true },
  { code: 'VAN', name: 'Ngữ văn', isRequired: true },
  { code: 'ANH', name: 'Tiếng Anh', isRequired: true },
  { code: 'LY', name: 'Vật lý', isRequired: true },
  { code: 'HOA', name: 'Hóa học', isRequired: true },
  { code: 'SINH', name: 'Sinh học', isRequired: true },
  { code: 'SU', name: 'Lịch sử', isRequired: true },
  { code: 'DIA', name: 'Địa lý', isRequired: true },
  { code: 'GKTPL', name: 'Giáo dục kinh tế và pháp luật', isRequired: true },
  { code: 'TIN', name: 'Tin học', isRequired: true },
  { code: 'CN', name: 'Công nghệ', isRequired: true },
  { code: 'TD', name: 'Giáo dục thể chất', isRequired: true },
  { code: 'GDQP', name: 'Giáo dục quốc phòng và an ninh', isRequired: true },
  {
    code: 'HDTN',
    name: 'Hoạt động trải nghiệm, hướng nghiệp',
    isRequired: false,
  },
] as const;

/**
 * Số tiết/năm học — CTGDPT 2018, cấp THPT (lớp 10–12).
 *
 * Nguồn hiện hành: Thông tư 13/2022/TT-BGDĐT (sửa TT 32/2018), hợp nhất VBHN 10/VBHN-BGDĐT.
 * 35 tuần/năm học; số tiết giống nhau ở lớp 10, 11, 12.
 *
 * Lưu ý: Toán THCS = 140 tiết/năm (lớp 6–9), KHÁC Toán THPT = 105.
 * Nếu HS chọn cụm chuyên đề môn Toán (+35 tiết) thì tối đa 105 + 35 = 140 tiết/năm.
 */
export const THPT_BGD_REGULATION = {
  circular: '13/2022/TT-BGDĐT',
  consolidated: '10/VBHN-BGDĐT (2023)',
  weeksPerYear: 35,
} as const;

/** Tiết/năm cho cụm chuyên đề học tập (mỗi môn được chọn tối đa 1 cụm). */
export const THPT_BGD_SPECIALIZED_CLUSTER_PERIODS = 35;

export const THPT_BGD_CORE_PERIODS_PER_YEAR: Record<
  (typeof THPT_SUBJECTS)[number]['code'],
  number
> = {
  // Môn học bắt buộc — nội dung cốt lõi
  TOAN: 105,
  VAN: 105,
  ANH: 105,
  SU: 52,
  TD: 70,
  GDQP: 35,
  // Môn học lựa chọn
  DIA: 70,
  GKTPL: 70,
  LY: 70,
  HOA: 70,
  SINH: 70,
  CN: 70,
  TIN: 70,
  // Hoạt động giáo dục bắt buộc
  HDTN: 105,
};

/** @deprecated Dùng THPT_BGD_CORE_PERIODS_PER_YEAR */
export const THPT_BGD_PERIODS_PER_YEAR = THPT_BGD_CORE_PERIODS_PER_YEAR;

/** Môn có thể mở thêm cụm chuyên đề (+35 tiết/năm). */
export const THPT_BGD_SPECIALIZED_CLUSTER_SUBJECTS = new Set<string>([
  'TOAN',
  'VAN',
  'SU',
  'DIA',
  'GKTPL',
  'LY',
  'HOA',
  'SINH',
  'CN',
  'TIN',
]);

export function getThptBgdCorePeriodsPerYear(subjectCode: string): number | null {
  return (
    THPT_BGD_CORE_PERIODS_PER_YEAR[
      subjectCode as keyof typeof THPT_BGD_CORE_PERIODS_PER_YEAR
    ] ?? null
  );
}

/** @deprecated */
export function getThptBgdPeriodsPerYear(subjectCode: string): number | null {
  return getThptBgdCorePeriodsPerYear(subjectCode);
}

/** Cốt lõi + cụm chuyên đề (nếu môn có CD) — dùng cho seed `periods_per_year`. */
export function getThptBgdTotalPeriodsPerYear(subjectCode: string): number | null {
  const core = getThptBgdCorePeriodsPerYear(subjectCode);
  if (core == null) {
    return null;
  }
  if (!THPT_BGD_SPECIALIZED_CLUSTER_SUBJECTS.has(subjectCode)) {
    return core;
  }
  return core + THPT_BGD_SPECIALIZED_CLUSTER_PERIODS;
}

/** Môn đánh giá đạt / chưa đạt (nhận xét), không dùng điểm số. */
export const THPT_BGD_PASS_FAIL_SUBJECTS = new Set<string>([
  'TD',
  'GDQP',
  'HDTN',
]);

export type ThptSubjectEvaluationMode = 'NUMERIC' | 'PASS_FAIL';

export function getThptBgdEvaluationMode(
  subjectCode: string,
): ThptSubjectEvaluationMode {
  return THPT_BGD_PASS_FAIL_SUBJECTS.has(subjectCode) ? 'PASS_FAIL' : 'NUMERIC';
}

/** @deprecated */
export function getThptBgdMaxPeriodsWithCluster(subjectCode: string): number | null {
  return getThptBgdTotalPeriodsPerYear(subjectCode);
}

export const DEMO_TEACHER_COUNT = 25;

/** Số tài khoản phụ huynh có thể đăng nhập portal. */
export const DEMO_PARENT_ACCOUNT_COUNT = 15;

/** Số HS có hồ sơ phụ huynh (mẹ + cha nếu chưa có TK). */
export const DEMO_STUDENTS_WITH_PARENTS = 100;

export function buildHomeroomClassCode(
  gradeCode: string,
  classIndex: number,
): string {
  return `${gradeCode}A${classIndex + 1}`;
}

export function buildStudentDemoEmail(globalIndex: number): string {
  return `student${String(globalIndex + 1).padStart(4, '0')}@demo.edu.vn`;
}

export function buildParentDemoEmail(index: number): string {
  return `parent${String(index + 1).padStart(2, '0')}@demo.edu.vn`;
}
