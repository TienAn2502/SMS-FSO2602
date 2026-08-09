# Schema Sprint 6

Schema cho Sprint 6: sổ điểm theo lớp môn.

> **Trạng thái:** Phase 6A đã triển khai — `assessments`, `scores` trong `server/prisma/schema.prisma`  
> Kế thừa Sprint 1–5 — [schema-sprint5.md](./schema-sprint5.md)  
> ORM: Prisma. File schema: `server/prisma/schema.prisma`

## Sơ đồ quan hệ

```text
schools
  │
  ├──< assessments
  │      ├── semester_id       → semesters
  │      ├── course_section_id → course_sections
  │      └── teacher_id        → teachers
  │
  └──< scores
         ├── assessment_id → assessments
         └── student_id    → students
```

Tất cả bảng mới có `school_id → schools.id` (tenant isolation).

**Schema bổ sung (Phase 6A):** thêm `periods_per_year`, `evaluation_mode` vào `grade_level_subjects`. Chi tiết: [sprint-6-plan.md](../sprints/sprint-6-plan.md#schema-bổ-sung-grade_level_subjects).

---

## Enum mới

### AssessmentType

```typescript
AssessmentType: REGULAR | MIDTERM | FINAL
```

| Giá trị | Hiển thị VN | Gợi ý |
|---------|------------|-------|
| `REGULAR` | Thường xuyên | Miệng, 15 phút, 1 tiết… (tên chi tiết qua `name`) |
| `MIDTERM` | Giữa kỳ | GK |
| `FINAL` | Cuối kỳ | CK |

### AssessmentStatus

```typescript
AssessmentStatus: OPEN | CLOSED
```

| Giá trị | Mô tả |
|---------|-------|
| `OPEN` | Đang nhập điểm — cho phép ghi/sửa scores |
| `CLOSED` | Đã khóa — MVP: không cho GV sửa (admin override ở phase sau) |

---

## Bảng chi tiết

### assessments

Đầu điểm — một lần kiểm tra / đánh giá của lớp môn.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| semester_id | UUID | FK → semesters, NOT NULL | Học kỳ |
| course_section_id | UUID | FK → course_sections, NOT NULL | Lớp môn |
| teacher_id | UUID | FK → teachers, NOT NULL | GV tạo / chấm |
| type | AssessmentType | NOT NULL | Loại đầu điểm |
| name | VARCHAR(255) | NOT NULL | Tên hiển thị (VD: "KT 15 phút lần 1") |
| assessment_date | DATE | NOT NULL | Ngày kiểm tra |
| max_score | DECIMAL(5,2) | NOT NULL, DEFAULT 10 | Thang điểm tối đa |
| weight | DECIMAL(5,2) | nullable | Trọng số (Sprint 7 — tính TB) |
| status | AssessmentStatus | NOT NULL, DEFAULT OPEN | |
| note | TEXT | nullable | Ghi chú |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique (đề xuất):** `(course_section_id, assessment_date, type, name)`

**Index:** `school_id`, `semester_id`, `course_section_id`, `teacher_id`, `assessment_date`, `type`, `status`

**Business rules:**

- `semester_id` phải khớp `course_section.semester_id`
- GV phải có `teaching_assignment` ACTIVE với `course_section_id`
- `max_score` > 0; MVP thường dùng 10 hoặc 100

---

### scores

Điểm từng học sinh trong một đầu điểm.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| assessment_id | UUID | FK → assessments, NOT NULL | Đầu điểm |
| student_id | UUID | FK → students, NOT NULL | Học sinh |
| score | DECIMAL(5,2) | nullable | Điểm; `null` = chưa nhập |
| note | TEXT | nullable | Ghi chú |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(assessment_id, student_id)`

**Index:** `school_id`, `assessment_id`, `student_id`

**Business rules:**

- HS phải có enrollment ACTIVE lớp HC tương ứng với lớp môn của assessment
- Chỉ ghi/sửa khi assessment `OPEN` (trừ admin override)
- Nếu `score` not null: `0 <= score <= assessment.max_score`

---

## So sánh với Sprint 5 (điểm danh)

| Sprint 5 | Sprint 6 | Vai trò |
|----------|----------|---------|
| `attendance_sessions` | `assessments` | Header buổi học / đầu điểm |
| `attendance_records` | `scores` | Chi tiết từng HS |
| `status` (PRESENT/…) | `score` (decimal) | Giá trị ghi nhận |
| `session_date` + `period_number` | `assessment_date` + `type` | Định danh buổi / lần KT |

---

## Ví dụ seed (10A1, HK1)

```text
assessments
  TOAN-10A1 | REGULAR | 2025-09-15 | max 10 | CLOSED | "KT 15 phút lần 1"
  VAN-10A1  | REGULAR | 2025-09-15 | max 10 | CLOSED | "KT 15 phút lần 1"
  ANH-10A1  | REGULAR | 2025-09-16 | max 10 | OPEN   | "KT 15 phút lần 1"

scores (mỗi assessment × 30 HS)
  student_001 → 8.5
  student_002 → 7.0
  student_003 → null   (chưa nhập)
  ...
```

---

## Sprint tiếp theo (chưa triển khai)

- Tổng kết, học lực, hạnh kiểm, lên lớp — [sprint-7-plan.md](../sprints/sprint-7-plan.md), [schema-sprint7.md](./schema-sprint7.md)
- Báo cáo, export Excel — Sprint 8
- `audit_logs` — [ADR 007](../decisions/007-defer-audit-logs.md)
