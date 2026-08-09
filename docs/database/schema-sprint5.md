# Schema Sprint 5

Schema cho Sprint 5: điểm danh theo lớp môn.

> Kế thừa Sprint 1–4 — [schema-sprint4.md](./schema-sprint4.md)  
> ORM: Prisma. File schema: `server/prisma/schema.prisma`

## Sơ đồ quan hệ

```text
schools
  │
  ├──< attendance_sessions
  │      ├── semester_id        → semesters
  │      ├── course_section_id  → course_sections
  │      ├── teacher_id         → teachers
  │      └── timetable_entry_id → timetable_entries (nullable)
  │
  └──< attendance_records
         ├── session_id → attendance_sessions
         └── student_id → students
```

Tất cả bảng mới có `school_id → schools.id` (tenant isolation).

---

## Enum mới

### AttendanceSessionStatus

```typescript
AttendanceSessionStatus: OPEN | CLOSED
```

| Giá trị | Mô tả |
|---------|-------|
| `OPEN` | Đang điểm danh — cho phép ghi/sửa records |
| `CLOSED` | Đã khóa — MVP: không cho GV sửa (admin override ở phase sau) |

### AttendanceRecordStatus

```typescript
AttendanceRecordStatus: PRESENT | ABSENT | LATE | EXCUSED
```

| Giá trị | Hiển thị VN |
|---------|-------------|
| `PRESENT` | Có mặt |
| `ABSENT` | Vắng |
| `LATE` | Muộn |
| `EXCUSED` | Có phép |

---

## Bảng chi tiết

### attendance_sessions

Phiên điểm danh — một buổi học cụ thể của lớp môn.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| semester_id | UUID | FK → semesters, NOT NULL | Học kỳ |
| course_section_id | UUID | FK → course_sections, NOT NULL | Lớp môn |
| teacher_id | UUID | FK → teachers, NOT NULL | GV điểm danh |
| timetable_entry_id | UUID | FK → timetable_entries, nullable | Tiết TKB (optional) |
| session_date | DATE | NOT NULL | Ngày điểm danh |
| period_number | SMALLINT | NOT NULL | Tiết (1–12) |
| status | AttendanceSessionStatus | NOT NULL, DEFAULT OPEN | |
| note | TEXT | nullable | Ghi chú phiên |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(course_section_id, session_date, period_number)`

**Index:** `school_id`, `semester_id`, `course_section_id`, `teacher_id`, `session_date`, `status`

**Business rules:**

- `semester_id` phải khớp `course_section.semester_id`
- GV phải có `teaching_assignment` ACTIVE với `course_section_id` (Phase 5B)
- Không tạo trùng phiên cùng lớp môn + ngày + tiết

---

### attendance_records

Trạng thái điểm danh từng học sinh trong một phiên.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| session_id | UUID | FK → attendance_sessions, NOT NULL | Phiên |
| student_id | UUID | FK → students, NOT NULL | Học sinh |
| status | AttendanceRecordStatus | NOT NULL, DEFAULT PRESENT | |
| note | TEXT | nullable | Ghi chú (lý do vắng…) |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(session_id, student_id)`

**Index:** `school_id`, `session_id`, `student_id`, `status`

**Business rules:**

- HS phải có enrollment ACTIVE lớp HC tương ứng với lớp môn của phiên
- Chỉ ghi/sửa khi phiên `OPEN` (trừ admin override)

---

## Ví dụ seed (10A1, HK1)

```text
attendance_sessions
  TOAN-10A1 | 2025-09-01 | tiết 1 | CLOSED | teacher TOAN
  VAN-10A1  | 2025-09-01 | tiết 1 | CLOSED | teacher VAN
  ANH-10A1  | 2025-09-01 | tiết 1 | CLOSED | teacher ANH

attendance_records (mỗi phiên × 30 HS)
  student_001 → PRESENT
  student_010 → ABSENT
  student_011 → LATE
  student_012 → EXCUSED
  ...
```

---

## Sprint tiếp theo

- Sổ điểm (`assessments`, `scores`) — [schema-sprint6.md](./schema-sprint6.md)
- `periods` (giờ tiết), `timetables` (header TKB) — hoãn
