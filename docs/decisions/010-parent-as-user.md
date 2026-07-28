# ADR 010: Phụ huynh là user riêng — bảng `parents` + liên kết con

**Trạng thái:** ✅ Đã chốt  
**Ngày quyết định:** 2026-07-25  
**Ngữ cảnh:** Sprint 3 — hồ sơ học sinh; bỏ `parent_name` / `parent_phone` trên `students`

## Quyết định

1. **Không** lưu thông tin phụ huynh trên bảng `students`
2. Phụ huynh là **user đăng nhập** (`role = PARENT`) + hồ sơ bảng `parents`
3. Quan hệ PH ↔ con qua bảng **`student_parents`** (many-to-many)
4. Triển khai schema + API **Sprint 4+** — ngoài phạm vi Sprint 3

## Lý do

- PH cần login xem tiến độ, điểm, điểm danh của con
- Một HS có thể có nhiều PH (bố, mẹ, người giám hộ)
- Một PH có thể có nhiều con cùng trường
- Tách auth (`users`) khỏi hồ sơ (`parents`) — cùng pattern với `students`

## Schema dự kiến (Sprint 4)

```text
users (role=PARENT)
  └── parents (profile: full_name, phone, …)
        └── student_parents
              ├── parent_id → parents
              ├── student_id → students
              └── relationship: FATHER | MOTHER | GUARDIAN | OTHER
```

### `parents` (tóm tắt)

| Cột | Mô tả |
|-----|-------|
| id | UUID PK |
| school_id | FK → schools |
| user_id | FK → users, nullable (PH chưa cấp tài khoản) |
| full_name | Họ tên |
| phone | SĐT |
| status | ACTIVE / INACTIVE |

### `student_parents`

| Cột | Mô tả |
|-----|-------|
| student_id | FK → students |
| parent_id | FK → parents |
| relationship | Quan hệ với HS |
| is_primary | Liên hệ chính (optional) |

Unique: `(student_id, parent_id)`

## RBAC dự kiến

| Role | Quyền (giai đoạn sau) |
|------|------------------------|
| `PARENT` | Xem hồ sơ / điểm / điểm danh **con mình** (qua `student_parents`) |
| `SCHOOL_ADMIN` | CRUD phụ huynh, gắn PH ↔ HS |

Cần mở rộng `UserRole`: thêm `PARENT` — cập nhật ADR 008 khi triển khai.

## Hệ quả Sprint 3

- Bảng `students` **không có** `parent_name`, `parent_phone`
- Seed HS không tạo PH mẫu (Sprint 4)
- API Sprint 3 không nhận/trả field phụ huynh trên student

## Khi triển khai

1. Migration: `parents`, `student_parents`, enum `ParentRelationship`, `UserRole.PARENT`
2. Module `parents` + gắn HS
3. API read-only cho PARENT (con được liên kết)
4. Frontend portal phụ huynh
