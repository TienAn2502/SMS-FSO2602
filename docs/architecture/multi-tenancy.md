# Multi-tenancy

## Khái niệm

Mỗi **trường học** là một **tenant** độc lập. Dữ liệu của trường A không được truy cập bởi user thuộc trường B.

## Bảng tenant gốc

```text
schools
├── id            UUID, PK
├── code          Mã trường, unique toàn hệ thống
├── name          Tên đầy đủ
├── short_name    Tên viết tắt
├── school_type   Loại trường (TH, THCS, THPT, ...)
├── email
├── phone
├── address
├── logo_file_id  FK → files (Sprint 3+)
├── status        ACTIVE | INACTIVE | SUSPENDED
├── created_at
└── updated_at
```

## Quy tắc bắt buộc

### 1. Tenant lấy từ auth context, không từ request

```typescript
// ✅ Đúng
const schoolId = request.user.activeSchoolId;

// ❌ Sai – không tin schoolId từ client
const schoolId = request.body.schoolId;
const schoolId = request.query.schoolId;
const schoolId = request.params.schoolId;
```

Access token payload tối thiểu:

```json
{
  "sub": "user-id",
  "activeSchoolId": "school-id"
}
```

`activeSchoolId` = `users.school_id` khi login (user thuộc trường). `SYSTEM_ADMIN` có `school_id = null` và chỉ có `activeSchoolId` khi impersonate — xem [ADR 013](../decisions/013-platform-admin-module.md), [ADR 008](../decisions/008-simplify-rbac-mvp.md).

### 2. Mọi truy vấn theo ID phải kèm tenant

```typescript
// ✅ Đúng
findByIdAndSchoolId(id, schoolId)

// ❌ Sai
findById(id)
```

Ví dụ Prisma:

```typescript
await prisma.user.findFirst({
  where: { id: userId, schoolId: activeSchoolId },
});
```

### 3. Bảng nghiệp vụ phải có `school_id`

Các bảng Sprint 1:

- `users` (FK trực tiếp tới `schools`)

Các bảng Sprint 2+ (tất cả có `school_id`):

- `students`, `teachers`, `academic_years`, `homeroom_classes`
- `course_sections`, `enrollments`, `timetables`, `assessments`, `scores`
- `audit_logs`, ...

Chi tiết Sprint 2: [schema-sprint2.md](../database/schema-sprint2.md)

### 4. MVP: một user thuộc một trường

```text
schools ──< users
              ├── school_id
              └── role
```

Không có `school_memberships` trong MVP. User nghiệp vụ gắn trực tiếp `school_id`. `SYSTEM_ADMIN` để `school_id` null.

> Multi-school (user thuộc nhiều trường) và `switch-school` **hoãn** — [ADR 006](../decisions/006-defer-switch-school.md), [ADR 008](../decisions/008-simplify-rbac-mvp.md)

## Luồng tenant MVP

```text
Đăng nhập thành công
→ Backend đọc user.school_id
→ Nếu có school_id: set activeSchoolId = user.school_id vào access JWT
→ Nếu SYSTEM_ADMIN (school_id null): JWT không có activeSchoolId (chỉ set khi impersonate)
→ Mọi API nghiệp vụ lọc theo activeSchoolId từ token
```

## Phân quyền MVP

MVP dùng **role enum** trên user (`SCHOOL_ADMIN | TEACHER | STUDENT`), kiểm tra bằng **RoleGuard** trong code.

Không có permission matrix (`student:read`, `user:manage`, ...) trong DB.

Tầng data scope (giáo viên chỉ thao tác lớp được phân công) bắt đầu từ Sprint 4–6.

## Test tenant isolation

Mọi API mới phải có test chứng minh:

- User trường A không đọc được dữ liệu trường B
- User trường A không cập nhật được dữ liệu trường B
- Gửi ID trường B trong body/query không bypass được guard

## Tạo trường mới (MVP)

Sprint 1: **chỉ qua seed**. Không có API/UI tạo trường.

Sprint 1.5+: thêm Platform Admin hoặc script CLI khi cần onboard trường thứ 2.

Xem ADR: [002-seed-first-school.md](../decisions/002-seed-first-school.md)
