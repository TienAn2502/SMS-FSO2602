const ERROR_MESSAGES: Record<string, string> = {
  INVALID_CREDENTIALS: 'Email hoặc mật khẩu không đúng',
  SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
  UNAUTHORIZED: 'Bạn cần đăng nhập để thực hiện thao tác này',
  FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
  VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
  EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng',
  USER_NOT_FOUND: 'Không tìm thấy người dùng',
  SCHOOL_NOT_FOUND: 'Không tìm thấy trường',
  ACADEMIC_YEAR_NOT_FOUND: 'Không tìm thấy năm học',
  ACADEMIC_YEAR_CODE_EXISTS: 'Mã năm học đã tồn tại',
  ACADEMIC_YEAR_HAS_CLASSES: 'Năm học đang có lớp, không thể ngừng hoạt động',
  SEMESTER_NOT_FOUND: 'Không tìm thấy học kỳ',
  SEMESTER_CODE_EXISTS: 'Mã học kỳ đã tồn tại',
  GRADE_LEVEL_NOT_FOUND: 'Không tìm thấy khối',
  GRADE_LEVEL_CODE_EXISTS: 'Mã khối đã tồn tại',
  SUBJECT_NOT_FOUND: 'Không tìm thấy môn học',
  SUBJECT_CODE_EXISTS: 'Mã môn đã tồn tại',
  HOMEROOM_CLASS_NOT_FOUND: 'Không tìm thấy lớp hành chính',
  HOMEROOM_CLASS_CODE_EXISTS: 'Mã lớp hành chính đã tồn tại',
  COURSE_SECTION_NOT_FOUND: 'Không tìm thấy lớp môn học',
  COURSE_SECTION_CODE_EXISTS: 'Mã lớp môn đã tồn tại',
  INVALID_HOMEROOM_TEACHER: 'Giáo viên chủ nhiệm không hợp lệ',
  GRADE_LEVEL_SUBJECT_NOT_FOUND: 'Môn học chưa được cấu hình cho khối này',
  TENANT_MISMATCH: 'Dữ liệu không thuộc cùng trường hoặc năm học',
  INVALID_DATE_RANGE: 'Khoảng ngày không hợp lệ',
  INTERNAL_SERVER_ERROR: 'Đã xảy ra lỗi hệ thống',
};

export function getErrorMessage(code: string | undefined, fallback: string): string {
  if (code && ERROR_MESSAGES[code]) {
    return ERROR_MESSAGES[code];
  }
  return fallback;
}
