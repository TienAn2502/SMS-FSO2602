# Schema Sprint 2

Schema cho Sprint 2: khung học vụ cơ bản (năm học, khối, môn, lớp).

> Kế thừa Sprint 1: `schools`, `users` — xem [schema-sprint1.md](./schema-sprint1.md)  
> ORM: Prisma. File schema: `server/prisma/schema.prisma`  
> Migration: `20260723132737_init_sprint2_academic`

## Sơ đồ quan hệ

```text
schools
  │
  ├──< academic_years
  │      └──< semesters
  │
  ├──< grade_levels
  │
  ├──< subjects
  │
  ├──< grade_level_subjects
  │      ├── grade_level_id → grade_levels
  │      └── subject_id      → subjects
  │
  ├──< homeroom_classes
  │      ├── academic_year_id    → academic_years
  │      ├── grade_level_id      → grade_levels
  │      └── homeroom_teacher_id → users (nullable, TEACHER)
  │
  └──< course_sections
         ├── academic_year_id        → academic_years
         ├── homeroom_class_id       → homeroom_classes (nullable)
         └── grade_level_subject_id  → grade_level_subjects
```

Tất cả bảng mới có `school_id → schools.id` (tenant isolation).

---

## Enum mới

```typescript
AcademicEntityStatus: ACTIVE | INACTIVE
```

Dùng cho mọi bảng học vụ có `status`, **trừ** `grade_levels` (cấu hình tĩnh, không có `status`).

Khác enum Sprint 1:

| Enum | Bảng | Giá trị |
|------|------|---------|
| `SchoolStatus` | `schools` | ACTIVE, INACTIVE, SUSPENDED |
| `UserStatus` | `users` | ACTIVE, INACTIVE, LOCKED |
| `AcademicEntityStatus` | Bảng học vụ | ACTIVE, INACTIVE |

---

## Quy ước timestamp

| Có `created_at` / `updated_at` | Không có timestamp |
|--------------------------------|--------------------|
| `academic_years`, `semesters` | `grade_levels` |
| `homeroom_classes`, `course_sections` | `subjects`, `grade_level_subjects` |

---

## Bảng chi tiết

### academic_years

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| name | VARCHAR(100) | NOT NULL | VD: `2025-2026` |
| code | VARCHAR(20) | NOT NULL | VD: `2025-26` |
| start_date | DATE | NOT NULL | Ngày bắt đầu năm học |
| end_date | DATE | NOT NULL | Ngày kết thúc |
| is_current | BOOLEAN | NOT NULL, DEFAULT false | Năm học hiện hành |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(school_id, code)`  
**Index:** `school_id`, `is_current`, `status`  
**Business rule:** Tối đa một bản ghi `is_current = true` mỗi `school_id`

---

### semesters

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant (denormalized) |
| academic_year_id | UUID | FK → academic_years, NOT NULL | |
| name | VARCHAR(50) | NOT NULL | VD: `Học kỳ 1` |
| code | VARCHAR(20) | NOT NULL | VD: `HK1` |
| start_date | DATE | NOT NULL | |
| end_date | DATE | NOT NULL | |
| is_current | BOOLEAN | NOT NULL, DEFAULT false | Học kỳ hiện hành |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(academic_year_id, code)`  
**Index:** `school_id`, `academic_year_id`, `is_current`  
**Business rule:** Tối đa một bản ghi `is_current = true` mỗi `school_id`; chỉ đặt khi năm học cha là `is_current`

---

### grade_levels

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | |
| name | VARCHAR(100) | NOT NULL | VD: `Khối 10` |
| code | VARCHAR(20) | NOT NULL | VD: `10` |

**Unique:** `(school_id, code)`  
**Index:** `school_id`

> Không có `status` — cấu hình khối 10/11/12 ổn định, hiếm khi inactive.

---

### subjects

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | |
| code | VARCHAR(20) | NOT NULL | VD: `TOAN` |
| name | VARCHAR(255) | NOT NULL | VD: `Toán học` |
| description | TEXT | | Mô tả ngắn |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |

**Unique:** `(school_id, code)`  
**Index:** `school_id`, `status`

---

### grade_level_subjects

Cấu hình môn theo khối: khối X **có học** môn Y không, bắt buộc hay tự chọn.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | |
| grade_level_id | UUID | FK → grade_levels, NOT NULL | |
| subject_id | UUID | FK → subjects, NOT NULL | |
| is_required | BOOLEAN | NOT NULL, DEFAULT true | true = bắt buộc, false = tự chọn |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |

**Unique:** `(school_id, grade_level_id, subject_id)`  
**Index:** `school_id`, `grade_level_id`, `subject_id`

> Khối không học môn → **không có dòng** (không phải `is_required = false`).

---

### homeroom_classes

Lớp hành chính (VD: 10A1, 11B2).

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | |
| academic_year_id | UUID | FK → academic_years, NOT NULL | |
| grade_level_id | UUID | FK → grade_levels, NOT NULL | |
| name | VARCHAR(100) | NOT NULL | VD: `10A1` |
| code | VARCHAR(20) | NOT NULL | Mã lớp |
| capacity | INTEGER | | Sĩ số tối đa (optional) |
| homeroom_teacher_id | UUID | FK → users, nullable | GVCN (user role TEACHER) |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(school_id, academic_year_id, code)`  
**Index:** `school_id`, `academic_year_id`, `grade_level_id`, `homeroom_teacher_id`

---

### course_sections

Lớp môn học (VD: Toán 10A1).

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | |
| academic_year_id | UUID | FK → academic_years, NOT NULL | |
| homeroom_class_id | UUID | FK → homeroom_classes, nullable | Lớp HC (optional) |
| grade_level_subject_id | UUID | FK → grade_level_subjects, NOT NULL | Môn + khối |
| name | VARCHAR(100) | NOT NULL | VD: `Toán 10A1` |
| code | VARCHAR(30) | NOT NULL | Mã lớp môn |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:**

- `(school_id, academic_year_id, code)`
- `(homeroom_class_id, grade_level_subject_id)` — mỗi lớp HC + môn-khối chỉ một lớp môn (NULL homeroom cho phép lớp ghép)

**Index:** `school_id`, `academic_year_id`, `homeroom_class_id`, `grade_level_subject_id`

> GV bộ môn gán qua `teaching_assignments` (Sprint 4).  
> Không có `semester_id` — lớp môn tồn tại cả năm học.

---

## Phân quyền Sprint 2

| Role | Quyền |
|------|-------|
| `SCHOOL_ADMIN` | Full CRUD cấu trúc học vụ |
| `TEACHER` | Chưa có API Sprint 2 (xem lớp ở Sprint 4) |
| `STUDENT` | Chưa có API Sprint 2 |

---

## Seed mẫu (trường DEMO)

| Dữ liệu | Giá trị mẫu |
|---------|-------------|
| Năm học | `2025-2026` / code `2025-26` (is_current) |
| Học kỳ | HK1, HK2 |
| Khối | 10, 11, 12 |
| Môn | TOAN, VAN, ANH |
| grade_level_subjects | Khối 10 × 3 môn (is_required = true) |
| Lớp HC | 10A1 (GVCN: teacher1@demo.edu.vn) |
| Lớp môn | TOAN-10A1, VAN-10A1, ANH-10A1 |

Chi tiết: [migrations-and-seed.md](./migrations-and-seed.md)

---

## Ngoài phạm vi Sprint 2

Các bảng Sprint 3+ (chưa triển khai):

- `students`, `student_enrollments`, `teachers`
- `teaching_assignments`, `timetable_entries`
- `attendance_sessions`, `attendance_records`
- `assessments`, `scores`

---

## Ràng buộc quan trọng

1. Mọi FK phải cùng `school_id` (validate ở service layer)
2. Không hard-delete nếu có bản ghi con phụ thuộc — dùng `status = INACTIVE`
3. `homeroom_teacher_id` chỉ trỏ tới `users` có `role = TEACHER` cùng trường
4. `is_current` được set qua endpoint riêng hoặc transaction (unset cũ → set mới)
5. Tạo `course_sections` phải validate `grade_level_subject.grade_level_id` khớp `homeroom_class.grade_level_id` (khi có lớp HC)
