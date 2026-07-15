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
  "sid": "session-id",
  "activeSchoolId": "school-id"
}
```

### 2. Mọi truy vấn theo ID phải kèm tenant

```typescript
// ✅ Đúng
findByIdAndSchoolId(id, schoolId)

// ❌ Sai
findById(id)
```

Ví dụ Prisma:

```typescript
await prisma.student.findFirst({
  where: { id: studentId, schoolId: activeSchoolId },
});
```

### 3. Bảng nghiệp vụ phải có `school_id`

Các bảng Sprint 1:

- `school_memberships`
- `roles`
- `audit_logs`

Các bảng Sprint 2+ (tất cả có `school_id`):

- `students`, `teachers`, `academic_years`, `homeroom_classes`
- `course_sections`, `enrollments`, `timetables`, `assessments`, `scores`
- `roles`, `audit_logs`, ...

### 4. User có thể thuộc nhiều trường

Quan hệ qua `school_memberships`:

```text
users ──< school_memberships >── schools
              │
              └──< membership_roles >── roles
```

User chọn **một trường active** khi đăng nhập hoặc qua API switch school. Token mới được phát với `activeSchoolId` cập nhật.

## Luồng chọn trường

```text
Đăng nhập thành công
→ Backend trả danh sách trường user thuộc về
→ Nếu 1 trường: tự động set activeSchoolId
→ Nếu nhiều trường: frontend hiển thị màn chọn trường
→ POST /auth/switch-school { schoolId }
→ Backend kiểm tra membership hợp lệ
→ Phát access token mới với activeSchoolId
→ Frontend invalidate toàn bộ cache tenant cũ
```

## Phân quyền hai tầng

Mỗi thao tác kiểm tra:

1. **Permission** – User có quyền phù hợp không? (ví dụ `student:read`)
2. **Data scope** – User có quyền trên dữ liệu cụ thể không? (ví dụ giáo viên chỉ nhập điểm lớp được phân công)

Sprint 1 chỉ triển khai tầng 1 (permission). Tầng 2 bắt đầu từ Sprint 4–6.

## Test tenant isolation

Mọi API mới phải có test chứng minh:

- User trường A không đọc được dữ liệu trường B
- User trường A không cập nhật được dữ liệu trường B
- Gửi ID trường B trong body/query không bypass được guard

## Tạo trường mới (MVP)

Sprint 1: **chỉ qua seed**. Không có API/UI tạo trường.

Sprint 1.5+: thêm Platform Admin hoặc script CLI khi cần onboard trường thứ 2.

Xem ADR: [002-seed-first-school.md](../decisions/002-seed-first-school.md)
