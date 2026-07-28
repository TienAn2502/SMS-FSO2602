# Schema Sprint 3

Schema cho Sprint 3: hồ sơ học sinh, ghi danh lớp hành chính, metadata file (R2).

> Kế thừa Sprint 1: `schools`, `users` — [schema-sprint1.md](./schema-sprint1.md)  
> Kế thừa Sprint 2: cấu trúc học vụ — [schema-sprint2.md](./schema-sprint2.md)  
> ORM: Prisma. File schema: `server/prisma/schema.prisma`

## Sơ đồ quan hệ

```text
schools
  │
  ├── logo_file_id ──► files (nullable)
  │
  ├──< students
  │      └── user_id ──► users (nullable, role STUDENT)
  │
  ├──< student_enrollments
  │      ├── student_id       → students
  │      ├── semester_id      → semesters
  │      └── homeroom_class_id → homeroom_classes
  │
  └──< files
         └── uploaded_by_id ──► users (nullable)
```

Tất cả bảng mới có `school_id → schools.id` (tenant isolation).

---

## Enum mới

### EnrollmentStatus

```typescript
EnrollmentStatus: ACTIVE | TRANSFERRED | WITHDRAWN | COMPLETED
```

| Giá trị | Mô tả |
|---------|-------|
| `ACTIVE` | Đang học lớp HC này |
| `TRANSFERRED` | Đã chuyển sang **lớp HC khác** (cùng trường) |
| `WITHDRAWN` | Nghỉ / rút khỏi lớp |
| `COMPLETED` | Kết thúc năm học bình thường (reserve — có thể Sprint 7) |

### FilePurpose

```typescript
FilePurpose: SCHOOL_LOGO | STUDENT_AVATAR | OTHER
```

Mở rộng sau khi cần (hồ sơ scan, import…).

### Gender (optional)

```typescript
Gender: MALE | FEMALE | OTHER
```

---

## Quy ước định danh

| Quyết định | Chi tiết |
|------------|----------|
| **Không có `student_code`** | Dùng `students.id` (UUID) làm PK và FK |
| Tra cứu | Tên, email user (`users.email`), lớp HC |
| `external_code` | **Không** trong MVP — thêm sau nếu cần import Excel |

---

## Bảng chi tiết

### students

Hồ sơ học sinh — tách khỏi bảng `users` (auth).

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| user_id | UUID | FK → users, nullable | Tài khoản login (role STUDENT) |
| full_name | VARCHAR(255) | NOT NULL | Họ tên |
| date_of_birth | DATE | nullable | Ngày sinh |
| gender | Gender | nullable | |
| phone | VARCHAR(20) | nullable | SĐT HS |
| address | TEXT | nullable | Địa chỉ |
| avatar_file_id | UUID | FK → files, nullable | Ảnh đại diện |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:**

- `(school_id, user_id)` — khi `user_id` NOT NULL (một user ↔ một hồ sơ HS / trường)

**Index:** `school_id`, `user_id`, `status`, `full_name`

**Business rules:**

- `user_id` nếu có → user phải `role = STUDENT`, cùng `school_id`
- HS có thể tồn tại **không** có `user_id` (chưa cấp tài khoản)
- **Phụ huynh** — bảng riêng `parents` + user `PARENT` ([ADR 010](../decisions/010-parent-as-user.md), Sprint 4+)
- Không hard-delete khi đã có enrollment

---

### student_enrollments

Ghi danh học sinh vào lớp hành chính theo học kỳ.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant (denormalized) |
| student_id | UUID | FK → students, NOT NULL | |
| semester_id | UUID | FK → semesters, NOT NULL | Học kỳ ghi danh |
| homeroom_class_id | UUID | FK → homeroom_classes, NOT NULL | |
| enrolled_at | DATE | NOT NULL | Ngày ghi danh vào lớp |
| left_at | DATE | nullable | Ngày rời lớp (chuyển / nghỉ) |
| status | EnrollmentStatus | NOT NULL, DEFAULT ACTIVE | |
| note | TEXT | nullable | Ghi chú |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique (business):**

- Tối đa **một** bản ghi `status = ACTIVE` cho `(school_id, student_id, semester_id)`  
  → enforce bằng partial unique index hoặc service transaction

**Index:** `school_id`, `student_id`, `semester_id`, `homeroom_class_id`, `status`

**Business rules:**

- `homeroom_class.academic_year_id` phải khớp `semester.academic_year_id`
- Mọi FK cùng `school_id`
- Chuyển lớp (cùng trường): enrollment cũ → `TRANSFERRED` + `left_at`; tạo enrollment mới `ACTIVE`
- `enrolled_at` ≠ `students.created_at` (có thể khác nhau)
- **Chuyển trường** (HS sang trường khác) — ngoài MVP; mỗi `students.school_id` cố định

---

### files

Metadata file lưu trên Cloudflare R2.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| purpose | FilePurpose | NOT NULL | Mục đích file |
| original_name | VARCHAR(255) | NOT NULL | Tên file gốc |
| mime_type | VARCHAR(100) | NOT NULL | VD: `image/png` |
| size_bytes | INTEGER | NOT NULL | Kích thước |
| storage_key | VARCHAR(500) | NOT NULL | Key trên R2 |
| uploaded_by_id | UUID | FK → users, nullable | Admin upload |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |
| created_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(school_id, storage_key)`

**Index:** `school_id`, `purpose`, `status`

**R2 key pattern:**

```text
schools/{schoolCode}/logo/{fileId}.png
schools/{schoolCode}/students/{studentId}/avatar/{fileId}.jpg
```

---

### schools (cập nhật Sprint 3)

Thêm FK (đã có cột `logo_file_id` nullable từ Sprint 1 docs):

| Cột | Thay đổi |
|-----|----------|
| logo_file_id | FK → `files.id`, nullable, ON DELETE SET NULL |

---

## Ví dụ data mẫu (trường DEMO)

### users + students (cặp 1:1)

**users** (Sprint 1 — đã có):

| email | full_name | role |
|-------|-----------|------|
| student1@demo.edu.vn | Phạm Minh Đức | STUDENT |

**students** (Sprint 3 — seed mới):

```json
{
  "id": "s001-uuid",
  "schoolId": "school-demo-uuid",
  "userId": "u-stu-001",
  "fullName": "Phạm Minh Đức",
  "dateOfBirth": "2009-03-15",
  "gender": "MALE",
  "status": "ACTIVE"
}
```

### student_enrollments

```json
{
  "id": "e001-uuid",
  "schoolId": "school-demo-uuid",
  "studentId": "s001-uuid",
  "academicYearId": "year-2025-26-uuid",
  "homeroomClassId": "class-10a1-uuid",
  "enrolledAt": "2025-08-05",
  "leftAt": null,
  "status": "ACTIVE",
  "note": "Ghi danh đầu năm HK1"
}
```

### Chuyển lớp (cùng trường — ví dụ lịch sử)

> **Chuyển trường** (HS sang trường khác) không nằm MVP — xem [ADR 006](../decisions/006-defer-switch-school.md).

Enrollment cũ (10A1):

```json
{
  "status": "TRANSFERRED",
  "leftAt": "2025-12-15",
  "note": "Chuyển sang 10A2"
}
```

Enrollment mới (10A2):

```json
{
  "homeroomClassId": "class-10a2-uuid",
  "enrolledAt": "2025-12-16",
  "status": "ACTIVE"
}
```

### files (logo trường)

```json
{
  "id": "f001-uuid",
  "schoolId": "school-demo-uuid",
  "purpose": "SCHOOL_LOGO",
  "originalName": "logo-demo.png",
  "mimeType": "image/png",
  "sizeBytes": 24500,
  "storageKey": "schools/DEMO/logo/f001-uuid.png",
  "status": "ACTIVE"
}
```

---

## Phân quyền Sprint 3

| Role | Quyền |
|------|-------|
| `SCHOOL_ADMIN` | Full CRUD students, enrollment, upload file |
| `TEACHER` | Chưa có API (xem HS lớp mình — Sprint 4+) |
| `STUDENT` | Chưa có API (xem profile — Sprint 4+) |

---

## Ngoài phạm vi Sprint 3

- `teachers` — Sprint 4
- Ghi danh lớp môn học
- Import Excel
- `student_code` / mã định danh Bộ GD&ĐT
- **Chuyển trường** — HS chuyển sang trường khác, multi-school user ([ADR 006](../decisions/006-defer-switch-school.md))
- **Phụ huynh** — bảng `parents`, role `PARENT` ([ADR 010](../decisions/010-parent-as-user.md))
- `audit_logs`

---

## Ràng buộc quan trọng

1. Mọi FK phải cùng `school_id` (validate service layer)
2. Không hard-delete `students` / `student_enrollments` khi đã có dữ liệu liên quan
3. `users` **không** bị thay thế — luôn là nguồn auth
4. Một HS — tối đa một lớp HC ACTIVE / năm học
5. File upload: validate mime whitelist + max size server-side
