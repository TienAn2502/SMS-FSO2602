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
