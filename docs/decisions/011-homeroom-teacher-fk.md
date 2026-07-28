# ADR 011: GVCN tham chiếu `teachers.id` thay vì `users.id`

**Trạng thái:** ✅ Đã chốt  
**Ngày quyết định:** 2026-07-28  
**Ngữ cảnh:** Sprint 2 gán `homeroom_classes.homeroom_teacher_id` → `users.id`; Sprint 4 thêm bảng `teachers` cho phân công, TKB, điểm danh.

## Quyết định

`homeroom_classes.homeroom_teacher_id` **FK → `teachers.id`** (nullable), không còn trỏ `users.id`.

## Lý do

| Tiêu chí | `users.id` (cũ) | `teachers.id` (mới) |
|----------|-----------------|---------------------|
| Nhất quán với `teaching_assignments`, `attendance_sessions`, `timetable_entries` | ❌ | ✅ |
| Gán GVCN khi GV chưa có tài khoản đăng nhập | ❌ | ✅ |
| Validate hồ sơ GV ACTIVE | qua `users.role` | qua `teachers.status` |
| Portal check quyền lớp CN | `user.id` trực tiếp | resolve `teacher.id` từ `userId` |

GVCN là **vai trò học vụ** trên hồ sơ giáo viên, không phải thuộc tính tài khoản auth.

## Migration

Migration `20260728172200_homeroom_teacher_fk_to_teachers`:

1. Drop FK cũ → `users`
2. `UPDATE homeroom_classes SET homeroom_teacher_id = teachers.id WHERE homeroom_teacher_id = teachers.user_id`
3. NULL các reference không map được
4. Add FK mới → `teachers`

## Thay đổi code

| Layer | Thay đổi |
|-------|----------|
| Prisma | `HomeroomClass.homeroomTeacher` → `Teacher` |
| `homeroom-classes.service` | Validate qua `teachers` ACTIVE |
| `portal.service` | `homeroomTeacherId: teacher.id` |
| Seed | Gán `teachers.id` khi tạo lớp HC |
| Frontend admin | Dropdown GVCN dùng `fetchAllTeachers()` |

## API contract

Field API vẫn là `homeroomTeacherId` (uuid) — **giá trị giờ là `teachers.id`**, không phải `users.id`.

## Hậu quả

- Client/API cũ gửi `user.id` làm GVCN → `INVALID_HOMEROOM_TEACHER`
- GV chưa có hồ sơ `teachers` không được gán GVCN (đúng nghiệp vụ)
- Portal lớp CN: cần `teachers.user_id` khớp user đăng nhập
