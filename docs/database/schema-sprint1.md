# Schema Sprint 1

Schema cho Sprint 1: nền tảng SaaS, authentication, phân quyền đơn giản theo role.

> **Hoãn MVP:** `audit_logs` — xem [ADR 007](../decisions/007-defer-audit-logs.md)

> **Đơn giản hóa MVP:** Không membership / permission matrix — xem [ADR 008](../decisions/008-simplify-rbac-mvp.md)

> ORM: Prisma. File schema: `server/prisma/schema.prisma`

## Sơ đồ quan hệ

```text
schools
  │
  └──< users
         ├── school_id → schools.id
         └── role: SCHOOL_ADMIN | TEACHER | STUDENT

users
  └── (không có auth_sessions — JWT stateless, ADR 005)
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
| school_id | UUID | FK → schools, NOT NULL | Trường user thuộc về |
| email | VARCHAR(255) | UNIQUE | |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt |
| full_name | VARCHAR(255) | NOT NULL | |
| role | ENUM | DEFAULT STUDENT | SCHOOL_ADMIN, TEACHER, STUDENT |
| status | ENUM | DEFAULT ACTIVE | ACTIVE, INACTIVE, LOCKED |
| created_at | TIMESTAMPTZ | | |
| updated_at | TIMESTAMPTZ | | |

**Index:** `email`, `school_id`, `role`, `status`

---

## Phân quyền MVP (trong code, không DB)

| Role | Quyền tóm tắt Sprint 1 |
|------|------------------------|
| `SCHOOL_ADMIN` | Quản lý user, cài đặt trường |
| `TEACHER` | Chức năng giáo viên (Phase sau) |
| `STUDENT` | Chức năng học sinh (Phase sau) |

Backend dùng **RoleGuard** — không có bảng `permissions`, `roles`, `memberships`.

---

## Ngoài phạm vi Sprint 1 MVP

### auth_sessions

**Không tạo** trong MVP. Auth dùng JWT stateless — [ADR 005](../decisions/005-session-storage.md).

### audit_logs

**Hoãn** — [ADR 007](../decisions/007-defer-audit-logs.md).

### RBAC nâng cao (hoãn)

Các bảng **không có** trong MVP, có thể thêm sau:

- `school_memberships` — user thuộc nhiều trường
- `roles`, `permissions`, `role_permissions`, `membership_roles` — permission matrix tùy chỉnh

---

## Enum values

```typescript
// School
SchoolStatus: ACTIVE | INACTIVE | SUSPENDED
SchoolType: TH | THCS | THPT | OTHER

// User
UserStatus: ACTIVE | INACTIVE | LOCKED
UserRole: SCHOOL_ADMIN | TEACHER | STUDENT
```

## Ràng buộc quan trọng

1. Email user unique toàn hệ thống
2. Mỗi user thuộc **một trường** (`users.school_id`)
3. Role là enum trên user — không tùy chỉnh theo trường trong MVP
4. Tenant lấy từ `user.school_id` — không qua membership lookup

## Schema Sprint 2

Chi tiết đầy đủ: [schema-sprint2.md](./schema-sprint2.md)

Các bảng Sprint 3+ (chưa triển khai), tất cả có `school_id`:

- `students`, `student_enrollments`, `teachers`
- `teaching_assignments`, `timetable_entries`
- `attendance_sessions`, `attendance_records`
- `assessments`, `scores`, `audit_logs`
