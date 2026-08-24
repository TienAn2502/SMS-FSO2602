const ERROR_MESSAGES: Record<string, string> = {
    INVALID_CREDENTIALS: 'Mã / SĐT / email hoặc mật khẩu không đúng',
    LOGIN_AMBIGUOUS:
        'Có nhiều tài khoản khớp. Dùng mã HS/GV/PH hoặc liên hệ nhà trường.',
    INVALID_CURRENT_PASSWORD: 'Mật khẩu hiện tại không đúng',
    SESSION_EXPIRED: 'Phiên đăng nhập đã hết hạn. Vui lòng đăng nhập lại',
    UNAUTHORIZED: 'Bạn cần đăng nhập để thực hiện thao tác này',
    FORBIDDEN: 'Bạn không có quyền thực hiện thao tác này',
    VALIDATION_ERROR: 'Dữ liệu không hợp lệ',
    EMAIL_ALREADY_EXISTS: 'Email đã được sử dụng',
    USER_NOT_FOUND: 'Không tìm thấy người dùng',
    SCHOOL_NOT_FOUND: 'Không tìm thấy trường',
    SCHOOL_CODE_EXISTS: 'Mã trường đã tồn tại',
    ADMIN_EMAIL_EXISTS: 'Email quản trị viên đã được sử dụng',
    SCHOOL_SUSPENDED: 'Trường đang bị tạm khóa. Vui lòng liên hệ quản trị nền tảng',
    PLATFORM_FORBIDDEN: 'Chỉ quản trị hệ thống mới được truy cập module nền tảng',
    SCHOOL_NOT_ACTIVE: 'Chỉ có thể đăng nhập thay trường đang hoạt động',
    IMPERSONATION_FORBIDDEN: 'Không được phép đăng nhập thay',
    IMPERSONATION_NOT_ACTIVE: 'Không có phiên đăng nhập thay đang hoạt động',
    IMPERSONATION_READ_ONLY: 'Phiên xem thay chỉ được phép đọc dữ liệu',
    ACADEMIC_YEAR_NOT_FOUND: 'Không tìm thấy năm học',
    ACADEMIC_YEAR_CODE_EXISTS: 'Mã năm học đã tồn tại',
    ACADEMIC_YEAR_HAS_CLASSES: 'Năm học đang có lớp, không thể ngừng hoạt động',
    SEMESTER_NOT_FOUND: 'Không tìm thấy học kỳ',
    SEMESTER_CODE_EXISTS: 'Mã học kỳ đã tồn tại',
    SEMESTER_LIMIT_REACHED: 'Mỗi năm học chỉ được có tối đa 2 học kỳ',
    SEMESTER_START_BEFORE_ACADEMIC_YEAR:
        'Ngày bắt đầu học kỳ không được trước ngày bắt đầu năm học',
    SEMESTER_END_AFTER_ACADEMIC_YEAR:
        'Ngày kết thúc học kỳ không được sau ngày kết thúc năm học',
    SEMESTER_ALREADY_CLOSED: 'Học kỳ đã được khóa tổng kết',
    SEMESTER_NOT_READY_TO_FINALIZE:
        'Chưa đủ điều kiện khóa học kỳ — xem danh sách vấn đề',
    GRADE_LEVEL_NOT_FOUND: 'Không tìm thấy khối',
    GRADE_LEVEL_CODE_EXISTS: 'Mã khối đã tồn tại',
    SUBJECT_NOT_FOUND: 'Không tìm thấy môn học',
    SUBJECT_CODE_EXISTS: 'Mã môn đã tồn tại',
    HOMEROOM_CLASS_NOT_FOUND: 'Không tìm thấy lớp hành chính',
    HOMEROOM_CLASS_CODE_EXISTS: 'Mã lớp hành chính đã tồn tại',
    COURSE_SECTION_NOT_FOUND: 'Không tìm thấy lớp môn học',
    COURSE_SECTION_CODE_EXISTS: 'Mã lớp môn đã tồn tại',
    COURSE_SECTION_COPY_SAME_SEMESTER:
        'Học kỳ nguồn và học kỳ đích phải khác nhau',
    NO_SOURCE_COURSE_SECTIONS:
        'Không có lớp môn đang hoạt động (ACTIVE) ở học kỳ nguồn',
    INVALID_HOMEROOM_TEACHER: 'Giáo viên chủ nhiệm không hợp lệ',
    HOMEROOM_TEACHER_ALREADY_ASSIGNED:
        'Giáo viên đã là GVCN một lớp khác trong năm học này',
    GRADE_LEVEL_SUBJECT_NOT_FOUND: 'Môn học chưa được cấu hình cho khối này',
    TENANT_MISMATCH: 'Dữ liệu không thuộc cùng trường hoặc năm học',
    INVALID_DATE_RANGE: 'Khoảng ngày không hợp lệ',
    STUDENT_NOT_FOUND: 'Không tìm thấy học sinh',
    ENROLLMENT_NOT_FOUND: 'Không tìm thấy ghi danh',
    ENROLLMENT_ALREADY_ACTIVE: 'Học sinh đã có lớp đang học trong học kỳ này',
    ENROLLMENT_NOT_ACTIVE: 'Ghi danh không ở trạng thái đang học',
    NO_SOURCE_ENROLLMENTS:
        'Không có ghi danh (ACTIVE / đã hoàn thành HK) ở học kỳ nguồn',
    ENROLLMENT_COPY_SAME_SEMESTER:
        'Học kỳ nguồn và học kỳ đích phải khác nhau',
    YEAR_PROMOTION_SAME_YEAR:
        'Học kỳ đích phải thuộc năm học khác với năm nguồn',
    NO_YEAR_PROMOTION_SUMMARIES:
        'Không có tổng kết năm đã chốt với quyết định lên lớp',
    YEAR_PREP_SAME_YEAR: 'Năm học nguồn và năm học đích phải khác nhau',
    YEAR_PREP_SOURCE_NOT_CLOSED:
        'Năm học nguồn chưa chốt lên lớp — không thể chuẩn bị năm sau',
    YEAR_PREP_SEMESTER_YEAR_MISMATCH:
        'Học kỳ đích phải thuộc năm học đích đã chọn',
    CLASS_PLACEMENT_NO_CLASSES:
        'Không có lớp hành chính ACTIVE trong khối đã chọn',
    CLASS_PLACEMENT_NO_ASSIGNMENTS:
        'Không xếp được học sinh nào — kiểm tra danh sách chờ và sức chứa lớp',
    CLASS_PLACEMENT_GRADE_MISMATCH:
        'Học sinh ở lại chỉ được xếp vào lớp cùng khối với năm trước',
    YEAR_SUMMARY_NOT_FOUND: 'Không tìm thấy tổng kết năm',
    NEXT_HOMEROOM_NOT_ALLOWED_FOR_GRADUATED:
        'Học sinh tốt nghiệp không gán lớp năm sau',
    NEXT_HOMEROOM_NOT_ALLOWED_FOR_RETAINED:
        'Học sinh ở lại lớp không gán lớp năm sau',
    INVALID_NEXT_HOMEROOM_CLASS:
        'Lớp năm sau không hợp lệ hoặc không còn hoạt động',
    INVALID_HOMEROOM_CLASS:
        'Một hoặc nhiều lớp không hợp lệ hoặc không còn hoạt động',
    NEXT_HOMEROOM_SAME_YEAR:
        'Lớp năm sau phải thuộc năm học khác với năm tổng kết',
    ASSIGNMENT_COPY_SAME_SEMESTER:
        'Học kỳ nguồn và học kỳ đích phải khác nhau',
    NO_SOURCE_ASSIGNMENTS:
        'Không có phân công đang hoạt động (ACTIVE) ở học kỳ nguồn',
    ENROLLMENT_SEMESTER_IS_CURRENT:
        'Không thể đóng ghi danh của học kỳ đang hiện hành',
    NO_ACTIVE_ENROLLMENTS_TO_CLOSE:
        'Không có ghi danh đang học (ACTIVE) để đóng ở học kỳ này',
    NO_STALE_ENROLLMENTS:
        'Không có ghi danh ACTIVE ở học kỳ không hiện hành cần đóng',
    USER_ALREADY_LINKED: 'Tài khoản đã được gắn với hồ sơ khác',
    INVALID_STUDENT_USER: 'Người dùng không hợp lệ để gắn học sinh',
    FILE_NOT_FOUND: 'Không tìm thấy file',
    FILE_TOO_LARGE: 'File vượt quá giới hạn dung lượng',
    UNSUPPORTED_FILE_FORMAT: 'Chỉ hỗ trợ file .xlsx hoặc .csv',
    IMPORT_VALIDATION_FAILED: 'File import có lỗi — xem chi tiết bên dưới',
    IMPORT_EMPTY: 'File không có dữ liệu để import',
    IMPORT_TOO_MANY_ROWS: 'File vượt quá số dòng cho phép',
    IMPORT_CONFLICT: 'Dữ liệu import trùng email hoặc mã học sinh',
    WORKSHEET_NOT_FOUND: 'Không tìm thấy sheet dữ liệu trong file Excel',
    WORKSHEET_EMPTY: 'File Excel không có dữ liệu',
    FILE_PARSE_ERROR: 'Không đọc được nội dung file',
    FILE_TYPE_NOT_ALLOWED: 'Loại file không được phép',
    R2_UPLOAD_FAILED: 'Upload file thất bại',
    ATTENDANCE_SESSION_NOT_FOUND: 'Không tìm thấy phiên điểm danh',
    ATTENDANCE_SESSION_CONFLICT:
        'Đã có phiên điểm danh cho lớp môn vào ngày và tiết này',
    ATTENDANCE_SESSION_CLOSED: 'Phiên điểm danh đã đóng',
    ATTENDANCE_RECORD_NOT_FOUND: 'Không tìm thấy bản ghi điểm danh',
    TEACHER_NOT_ASSIGNED: 'Giáo viên chưa được phân công lớp môn này',
    SCORE_OUT_OF_RANGE: 'Điểm vượt quá thang điểm cho phép',
    SCORE_INVALID_STEP: 'Điểm chỉ được là số nguyên hoặc .25, .5, .75',
    ASSESSMENT_MIDTERM_LIMIT: 'Lớp môn đã có điểm giữa kỳ trong học kỳ này',
    ASSESSMENT_FINAL_LIMIT: 'Lớp môn đã có điểm cuối kỳ trong học kỳ này',
    ASSESSMENT_REGULAR_LIMIT: 'Đã đạt tối đa đầu điểm thường xuyên cho năm học',
    ASSESSMENT_CLOSED: 'Đầu điểm đã khóa — không thể ghi điểm',
    GRADEBOOK_INCOMPLETE_SCORES:
        'Chưa nhập đủ điểm. Hoàn thiện tất cả đầu điểm trước khi khóa sổ.',
    GRADEBOOK_ALREADY_LOCKED: 'Sổ điểm đã được khóa',
    GRADEBOOK_LOCKED: 'Sổ điểm đã khóa — không thể sửa điểm',
    GRADEBOOK_SEMESTER_NOT_CURRENT:
        'Chỉ được sửa sổ điểm ở học kỳ hiện hành',
    NO_OPEN_ASSESSMENTS: 'Không có đầu điểm đang mở để điền điểm mẫu',
    NO_ENROLLMENTS: 'Lớp chưa có học sinh để điền điểm',
    COURSE_SECTION_NO_HOMEROOM: 'Lớp môn chưa gắn lớp hành chính',
    GRADE_LEVEL_SUBJECT_PERIODS_NOT_CONFIGURED:
        'Chưa cấu hình số tiết/năm cho môn theo khối — liên hệ quản trị viên',
    FORBIDDEN_SCOPE: 'Bạn không có quyền thao tác dữ liệu này',
    PROMOTION_DATA_INCOMPLETE:
        'Chưa đủ dữ liệu để chốt lên lớp. Cần khóa tổng kết HK1, HK2 và nhận xét rèn luyện cả hai học kỳ.',
    YEAR_PROMOTION_ALREADY_CLOSED: 'Năm học đã được chốt lên lớp',
    YEAR_PROMOTION_NOT_READY:
        'Chưa đủ điều kiện chốt lên lớp — xem danh sách vấn đề',
    INTERNAL_SERVER_ERROR: 'Đã xảy ra lỗi hệ thống',
};

export function getErrorMessage(
    code: string | undefined,
    fallback: string,
): string {
    if (fallback.trim()) {
        return fallback;
    }

    if (code && ERROR_MESSAGES[code]) {
        return ERROR_MESSAGES[code];
    }

    return fallback;
}
