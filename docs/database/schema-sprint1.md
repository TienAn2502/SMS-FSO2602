# Schema Sprint 1

Schema cho Sprint 1: nền tảng SaaS, authentication, authorization, audit log.

> ORM: Prisma. File schema dự kiến: `server/prisma/schema.prisma`

## Sơ đồ quan hệ

```text
schools
  │
  ├──< school_memberships >── users
  │         │
  │         └──< membership_roles >── roles
  │                                      │
  │                                      └──< role_permissions >── permissions
  │
  └──< roles (school-scoped)
  └──< audit_logs

users
  └──< auth_sessions
```

## Bảng chi tiết

### schools

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| code | VARCHAR(50) | UNIQUE | Mã trường |
| name | VARCHAR(255) | NOT NULL | Tên đầy đủ |
| short_name | VARCHAR(100) | | Tên viết tắt |
| school_type | ENUM | | TH, THCS, THPT, OTHER |
| email | VARCHAR(255) | | |
| phone | VARCHAR(20) | | |
| address | TEXT | | |
| logo_file_id | UUID | FK → files, nullable | Sprint 3+ |
| status | ENUM | DEFAULT ACTIVE | ACTIVE, INACTIVE, SUSPENDED |
| created_at | TIMESTAMPTZ | DEFAULT now() | |
| updated_at | TIMESTAMPTZ | | |

**Index:** `code`, `status`

---

### users

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| email | VARCHAR(255) | UNIQUE | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt |
| full_name | VARCHAR(255) | NOT NULL | |
| status | ENUM | DEFAULT ACTIVE | ACTIVE, INACTIVE, LOCKED |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

**Index:** `email`, `status`

---

### school_memberships

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools | |
| user_id | UUID | FK → users | |
| status | ENUM | DEFAULT ACTIVE | ACTIVE, INACTIVE, SUSPENDED |
| joined_at | TIMESTAMPTZ | DEFAULT now() | |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

**Unique:** `(school_id, user_id)`
**Index:** `school_id`, `user_id`, `status`

---

### permissions

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| code | VARCHAR(100) | UNIQUE | Ví dụ: `student:read` |
| resource | VARCHAR(50) | NOT NULL | Ví dụ: `student` |
| action | VARCHAR(50) | NOT NULL | Ví dụ: `read` |
| description | TEXT | | Mô tả tiếng Việt |

Permissions hệ thống – **không gắn school_id** (global catalog).

---

### roles

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools | |
| code | VARCHAR(50) | NOT NULL | SCHOOL_ADMIN, TEACHER, ... |
| name | VARCHAR(100) | NOT NULL | Tên hiển thị tiếng Việt |
| is_system | BOOLEAN | DEFAULT false | Role hệ thống không xóa được |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

**Unique:** `(school_id, code)`
**Index:** `school_id`

---

### role_permissions

| Cột | Kiểu | Ràng buộc |
|-----|------|-----------|
| role_id | UUID | FK → roles, PK (composite) |
| permission_id | UUID | FK → permissions, PK (composite) |

---

### membership_roles

| Cột | Kiểu | Ràng buộc |
|-----|------|-----------|
| membership_id | UUID | FK → school_memberships, PK (composite) |
| role_id | UUID | FK → roles, PK (composite) |

---

### auth_sessions

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | = `sid` trong JWT |
| user_id | UUID | FK → users | |
| refresh_token_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| device_name | VARCHAR(255) | | |
| user_agent | TEXT | | |
| ip_address | VARCHAR(45) | | |
| expires_at | TIMESTAMPTZ | NOT NULL | |
| revoked_at | TIMESTAMPTZ | nullable | |
| last_used_at | TIMESTAMPTZ | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Index:** `user_id`, `expires_at`

---

### audit_logs

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, nullable | null cho sự kiện platform |
| actor_user_id | UUID | FK → users, nullable | |
| action | VARCHAR(100) | NOT NULL | LOGIN, LOGOUT, USER_CREATED, ... |
| resource_type | VARCHAR(50) | | user, role, membership, ... |
| resource_id | UUID | nullable | |
| old_data | JSONB | nullable | |
| new_data | JSONB | nullable | |
| ip_address | VARCHAR(45) | | |
| user_agent | TEXT | | |
| request_id | VARCHAR(100) | | |
| created_at | TIMESTAMPTZ | DEFAULT now() | |

**Index:** `school_id`, `actor_user_id`, `action`, `created_at`

## Permissions seed (Sprint 1)

| Code | Mô tả |
|------|-------|
| `user:read` | Xem danh sách người dùng |
| `user:create` | Tạo người dùng |
| `user:update` | Cập nhật người dùng |
| `user:manage` | Quản lý đầy đủ người dùng |
| `role:read` | Xem vai trò |
| `role:manage` | Quản lý vai trò và phân quyền |
| `school:read` | Xem thông tin trường |
| `school:update` | Cập nhật thông tin trường |
| `audit:read` | Xem nhật ký hệ thống |

> Permissions cho student, teacher, score, ... sẽ seed ở sprint tương ứng.

## Roles seed (mỗi trường)

| Code | Tên | Permissions |
|------|-----|-------------|
| `SCHOOL_ADMIN` | Quản trị trường | Tất cả Sprint 1 |
| `TEACHER` | Giáo viên | (Sprint 1: không có quyền admin) |

## Enum values

```typescript
// School
SchoolStatus: ACTIVE | INACTIVE | SUSPENDED
SchoolType: TH | THCS | THPT | OTHER

// User
UserStatus: ACTIVE | INACTIVE | LOCKED

// Membership
MembershipStatus: ACTIVE | INACTIVE | SUSPENDED
```

## Ràng buộc quan trọng

1. Email user unique toàn hệ thống
2. Một user chỉ có một membership tại một trường (unique `school_id + user_id`)
3. Role code unique trong phạm vi trường
4. Permission code unique toàn hệ thống
5. Không xóa role `is_system = true`

## Schema Sprint 2+ (tham khảo, chưa triển khai)

Các bảng sẽ thêm ở sprint sau, tất cả có `school_id`:

- `academic_years`, `semesters`, `grade_levels`, `subjects`
- `homeroom_classes`, `course_sections`
- `students`, `student_enrollments`, `teachers`
- `teaching_assignments`, `timetable_entries`
- `attendance_sessions`, `attendance_records`
- `assessments`, `scores`, `audit_logs` (mở rộng actions)

Chi tiết đầy đủ theo master prompt sẽ được bổ sung khi vào sprint tương ứng.
