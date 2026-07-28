# Schema Sprint 4

Schema cho Sprint 4: hồ sơ giáo viên, phân công giảng dạy, thời khóa biểu, phụ huynh.

> Kế thừa Sprint 1–3 — [schema-sprint1.md](./schema-sprint1.md), [schema-sprint2.md](./schema-sprint2.md), [schema-sprint3.md](./schema-sprint3.md)  
> ORM: Prisma. File schema: `server/prisma/schema.prisma`  
> ERD tham chiếu: DrawDB `SMS - School Management System`

## Sơ đồ quan hệ

```text
schools
  │
  ├──< teachers
  │      ├── user_id ──► users (nullable, role TEACHER)
  │      └── avatar_file_id ──► files (nullable)
  │
  ├──< teaching_assignments
  │      ├── teacher_id        → teachers
  │      └── course_section_id → course_sections
  │
  ├──< timetable_entries
  │      ├── semester_id       → semesters
  │      ├── course_section_id → course_sections
  │      └── teacher_id        → teachers
  │
  ├──< parents
  │      └── user_id ──► users (nullable, role PARENT)
  │
  └──< student_parents
         ├── parent_id  → parents
         └── student_id → students

homeroom_classes.homeroom_teacher_id ──► teachers (GVCN — ADR 011)
```

Tất cả bảng mới có `school_id → schools.id` (tenant isolation).

---

## Enum mới / mở rộng

### UserRole (mở rộng)

```typescript
UserRole: SCHOOL_ADMIN | TEACHER | STUDENT | PARENT
```

### ParentRelationship

```typescript
ParentRelationship: FATHER | MOTHER | GUARDIAN | OTHER
```

| Giá trị | Mô tả |
|---------|-------|
| `FATHER` | Bố |
| `MOTHER` | Mẹ |
| `GUARDIAN` | Người giám hộ |
| `OTHER` | Khác |

### day_of_week (ISODOW)

Lưu **số nguyên** theo PostgreSQL `ISODOW` / ISO 8601 — khớp `EXTRACT(ISODOW FROM date)`:

| Giá trị | Thứ (ISO) | Hiển thị VN |
|--------:|-----------|-------------|
| `1` | Monday | Thứ 2 |
| `2` | Tuesday | Thứ 3 |
| `3` | Wednesday | Thứ 4 |
| `4` | Thursday | Thứ 5 |
| `5` | Friday | Thứ 6 |
| `6` | Saturday | Thứ 7 |
| `7` | Sunday | Chủ nhật |

- Kiểu DB: `SMALLINT`, ràng buộc `CHECK (day_of_week BETWEEN 1 AND 7)`
- MVP THPT: validate service chỉ cho `1–5` (T2–T6)

Phân công + TKB dùng `AcademicEntityStatus` (`ACTIVE` / `INACTIVE`).

---

## Bảng chi tiết

### teachers

Hồ sơ giáo viên — tách khỏi bảng `users` (auth). **Không có cột `email`** — tra cứu qua `users.email`.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| user_id | UUID | FK → users, nullable | Tài khoản login (role TEACHER) |
| full_name | VARCHAR(255) | NOT NULL | Họ tên |
| phone | VARCHAR(11) | nullable | SĐT |
| avatar_file_id | UUID | FK → files, nullable | Ảnh đại diện |
| specialization | VARCHAR(255) | nullable | Chuyên môn |
| date_of_birth | DATE | nullable | Ngày sinh |
| gender | Gender | nullable | MALE / FEMALE / OTHER |
| address | TEXT | nullable | Địa chỉ |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |

**Unique:** `(school_id, user_id)` — khi `user_id` NOT NULL

**Index:** `school_id`, `user_id`, `status`, `full_name`

---

### teaching_assignments

Phân công GV dạy lớp môn.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| teacher_id | UUID | FK → teachers, NOT NULL | GV được phân công |
| course_section_id | UUID | FK → course_sections, NOT NULL | Lớp môn |
| assign_at | DATE | NOT NULL | Ngày bắt đầu phân công |
| end_at | DATE | nullable | Ngày kết thúc (khi INACTIVE) |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |

**Unique:** `(teacher_id, course_section_id)`

**Index:** `school_id`, `teacher_id`, `course_section_id`, `status`

**Business rules:**

- `teacher.school_id` = `course_section.school_id`
- Filter theo năm: join `course_section.semester_id → semesters.academic_year_id`
- Kết thúc phân công: `status → INACTIVE`, set `end_at`

---

### timetable_entries

Thời khóa biểu — nhập thủ công MVP.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| semester_id | UUID | FK → semesters, NOT NULL | Học kỳ |
| course_section_id | UUID | FK → course_sections, NOT NULL | Lớp môn |
| teacher_id | UUID | FK → teachers, NOT NULL | GV dạy tiết này |
| day_of_week | SMALLINT | NOT NULL, CHECK 1–7 | Thứ (ISO / ISODOW) |
| period_number | SMALLINT | NOT NULL | Tiết (1, 2, 3…) |
| room | VARCHAR(255) | nullable | Phòng học |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |

**Unique:** `(course_section_id, day_of_week, period_number)`

**Index:** `school_id`, `semester_id`, `course_section_id`, `teacher_id`, `day_of_week`

**Business rules:**

- `semester_id` phải khớp `course_section.semester_id` (server set lúc ghi)
- Không trùng tiết GV trong cùng học kỳ: `(semester_id, teacher_id, day_of_week, period_number)`
- Khuyến nghị: `teacher_id` có `teaching_assignment` ACTIVE với `course_section_id`

---

### parents

Hồ sơ phụ huynh — [ADR 010](../decisions/010-parent-as-user.md). **Không có cột `email`** — login qua `users.email`.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| user_id | UUID | FK → users, nullable | Tài khoản login (role PARENT) |
| full_name | VARCHAR(255) | NOT NULL | Họ tên |
| phone | VARCHAR(11) | nullable | SĐT |
| status | AcademicEntityStatus | NOT NULL, DEFAULT ACTIVE | |

**Unique:** `(school_id, user_id)` — khi `user_id` NOT NULL

---

### student_parents

Liên kết PH ↔ HS (many-to-many).

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| parent_id | UUID | FK → parents, NOT NULL | |
| student_id | UUID | FK → students, NOT NULL | |
| relationship | ParentRelationship | NOT NULL | Quan hệ |
| is_primary_contact | BOOLEAN | NOT NULL, DEFAULT false | Liên hệ chính |

**Unique:** `(parent_id, student_id)`

**Index:** `school_id`, `parent_id`, `student_id`

---

## Phân quyền Sprint 4

| Role | Quyền |
|------|-------|
| `SCHOOL_ADMIN` | Full CRUD teachers, assignments, timetable, parents |
| `TEACHER` | Read-only: lớp CN, phân công, HS lớp CN, TKB cá nhân |
| `STUDENT` | Read-only: hồ sơ + enrollment hiện tại |
| `PARENT` | Read-only: danh sách con + hồ sơ cơ bản con |

---

## Seed mẫu (trường DEMO)

### teachers

| user email | full_name | date_of_birth | gender | specialization |
|------------|-----------|---------------|--------|----------------|
| teacher1@demo.edu.vn | Nguyễn Văn An | 1985-04-12 | MALE | Tiếng Anh |
| teacher2@demo.edu.vn | Trần Thị Bình | 1988-09-03 | FEMALE | Toán học |
| teacher3@demo.edu.vn | Lê Hoàng Cường | 1983-12-20 | MALE | Ngữ văn |

### teaching_assignments

| GV | Lớp môn |
|----|---------|
| teacher2 | TOAN-10A1 |
| teacher3 | VAN-10A1 |
| teacher1 | ANH-10A1 |

### timetable_entries (HK1, 10A1, ISODOW = 1 — Thứ 2)

| Tiết | Lớp môn | GV | day_of_week |
|------|---------|-----|-------------|
| 1 | TOAN-10A1 | teacher2 | `1` |
| 2 | VAN-10A1 | teacher3 | `1` |
| 3 | ANH-10A1 | teacher1 | `1` |

### parents

| full_name | user | Con | Quan hệ |
|-----------|------|-----|---------|
| Phạm Văn Long | parent1@demo.edu.vn | Phạm Minh Đức (student1) | FATHER |
| Nguyễn Thị Lan | parent2@demo.edu.vn | Hoàng Thị Em (student2) | MOTHER |

---

## Ngoài phạm vi Sprint 4

- `assessments`, `scores` — Sprint 6
- `course_section_enrollments` — defer
- `teacher_code`, `parent_code`

---

## Ràng buộc quan trọng

1. Mọi FK phải cùng `school_id` (validate service layer)
2. Không hard-delete khi đã có dữ liệu liên quan
3. `users` luôn là nguồn auth — profile tables không thay thế login
4. TKB validate không trùng tiết / lớp môn
5. Portal API bắt buộc data scope — không leak HS sang lớp khác
