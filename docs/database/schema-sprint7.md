# Schema Sprint 7

Schema cho Sprint 7: tổng kết học tập, rèn luyện (hạnh kiểm), học lực và lên lớp.

> **Trạng thái:** Phase 7A đã triển khai — migration `20260803140000_init_sprint7_summaries`  
> Kế thừa Sprint 6 — [schema-sprint6.md](./schema-sprint6.md)  
> ORM: Prisma. File schema: `server/prisma/schema.prisma`

## Sơ đồ quan hệ

```text
schools
  │
  ├──< student_subject_results
  │      ├── student_id        → students
  │      ├── course_section_id → course_sections
  │      └── semester_id       → semesters
  │
  ├──< student_conduct_records
  │      ├── student_id         → students
  │      ├── semester_id        → semesters
  │      └── homeroom_class_id  → homeroom_classes
  │
  ├──< student_semester_summaries
  │      ├── student_id    → students
  │      └── semester_id   → semesters
  │
  └──< student_year_summaries
         ├── student_id       → students
         └── academic_year_id → academic_years
```

Tất cả bảng mới có `school_id → schools.id` (tenant isolation).

---

## Enum mới

### TrainingResultLevel

Kết quả **rèn luyện** (hạnh kiểm).

```typescript
TrainingResultLevel: GOOD | FAIR | SATISFACTORY | UNSATISFACTORY
```

| Giá trị | Hiển thị VN |
|---------|-------------|
| `GOOD` | Tốt |
| `FAIR` | Khá |
| `SATISFACTORY` | Đạt |
| `UNSATISFACTORY` | Chưa đạt |

### AcademicResultLevel

Kết quả **học tập** (học lực).

```typescript
AcademicResultLevel: GOOD | FAIR | SATISFACTORY | UNSATISFACTORY
```

| Giá trị | Hiển thị VN |
|---------|-------------|
| `GOOD` | Tốt |
| `FAIR` | Khá |
| `SATISFACTORY` | Đạt |
| `UNSATISFACTORY` | Chưa đạt |

### PassFailResult

```typescript
PassFailResult: PASS | FAIL | PENDING
```

| Giá trị | Mô tả |
|---------|-------|
| `PASS` | Đạt |
| `FAIL` | Chưa đạt |
| `PENDING` | Chưa đủ điều kiện xét |

### PromotionDecision

```typescript
PromotionDecision: PENDING | PROMOTED | RETAINED | GRADUATED
```

| Giá trị | Mô tả |
|---------|-------|
| `PENDING` | Chưa xét |
| `PROMOTED` | Lên lớp / lên khối |
| `RETAINED` | Ở lại lớp |
| `GRADUATED` | Tốt nghiệp |

### SummaryStatus

```typescript
SummaryStatus: DRAFT | CLOSED
```

| Giá trị | Mô tả |
|---------|-------|
| `DRAFT` | Đang tổng hợp — cho phép tái tính |
| `CLOSED` | Đã khóa / công bố |

---

## Bảng chi tiết

### student_subject_results

Snapshot kết quả **từng môn** (lớp môn) theo học kỳ.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| student_id | UUID | FK → students, NOT NULL | |
| course_section_id | UUID | FK → course_sections, NOT NULL | Lớp môn |
| semester_id | UUID | FK → semesters, NOT NULL | |
| evaluation_mode | SubjectEvaluationMode | NOT NULL | `NUMERIC` hoặc `PASS_FAIL` |
| regular_average | DECIMAL(5,2) | nullable | TB các điểm TX (NUMERIC) |
| midterm_score | DECIMAL(5,2) | nullable | GK |
| final_score | DECIMAL(5,2) | nullable | CK |
| semester_average | DECIMAL(5,2) | nullable | TB học kỳ môn (NUMERIC) |
| year_average | DECIMAL(5,2) | nullable | TB cả năm môn — cập nhật sau HK2 |
| pass_fail_result | PassFailResult | nullable | Môn PASS_FAIL |
| computed_at | TIMESTAMPTZ | NOT NULL | Lần tính gần nhất |
| status | SummaryStatus | NOT NULL, DEFAULT DRAFT | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(student_id, course_section_id, semester_id)`

---

### student_conduct_records

Kết quả rèn luyện theo học kỳ.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| student_id | UUID | FK → students, NOT NULL | |
| semester_id | UUID | FK → semesters, NOT NULL | |
| homeroom_class_id | UUID | FK → homeroom_classes, NOT NULL | Lớp HC khi xét |
| training_result_level | TrainingResultLevel | NOT NULL | |
| note | TEXT | nullable | Nhận xét GVCN |
| recorded_by_teacher_id | UUID | FK → teachers, nullable | GVCN ghi nhận |
| status | SummaryStatus | NOT NULL, DEFAULT DRAFT | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(student_id, semester_id)`

---

### student_semester_summaries

Tổng kết **học kỳ** (học lực + rèn luyện).

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| student_id | UUID | FK → students, NOT NULL | |
| semester_id | UUID | FK → semesters, NOT NULL | |
| homeroom_class_id | UUID | FK → homeroom_classes, NOT NULL | |
| overall_average | DECIMAL(5,2) | nullable | TB học kỳ (môn NUMERIC) |
| academic_result_level | AcademicResultLevel | nullable | Học lực học kỳ |
| training_result_level | TrainingResultLevel | nullable | Rèn luyện HK (copy khi finalize) |
| subject_count | SMALLINT | nullable | Số môn NUMERIC đã tính |
| status | SummaryStatus | NOT NULL, DEFAULT DRAFT | |
| finalized_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(student_id, semester_id)`

---

### student_year_summaries

Tổng kết **cả năm** và quyết định lên lớp.

| Cột | Kiểu | Ràng buộc | Mô tả |
|-----|------|-----------|-------|
| id | UUID | PK | |
| school_id | UUID | FK → schools, NOT NULL | Tenant |
| student_id | UUID | FK → students, NOT NULL | |
| academic_year_id | UUID | FK → academic_years, NOT NULL | |
| homeroom_class_id | UUID | FK → homeroom_classes, NOT NULL | Lớp HC năm đang xét |
| overall_average | DECIMAL(5,2) | nullable | TB cả năm |
| academic_result_level | AcademicResultLevel | nullable | Học lực cả năm |
| training_result_level | TrainingResultLevel | nullable | Rèn luyện (MVP: HK2) |
| promotion_decision | PromotionDecision | NOT NULL, DEFAULT PENDING | |
| next_homeroom_class_id | UUID | FK → homeroom_classes, nullable | Lớp năm sau (nếu PROMOTED) |
| note | TEXT | nullable | Ghi chú admin/GVCN |
| status | SummaryStatus | NOT NULL, DEFAULT DRAFT | |
| finalized_at | TIMESTAMPTZ | nullable | |
| created_at | TIMESTAMPTZ | NOT NULL | |
| updated_at | TIMESTAMPTZ | NOT NULL | |

**Unique:** `(student_id, academic_year_id)`

---

## Ví dụ seed (10A1, HK1)

**HS đầu tiên lớp 10A1** (`student_subject_results`):

| Môn | TX | GK | CK | TB HK |
|-----|-----|-----|-----|-------|
| TOAN-10A1 | 8.00 | 7.50 | 8.50 | 8.08 |
| VAN-10A1 | 7.50 | 7.00 | 7.50 | 7.33 |
| ANH-10A1 | 8.50 | 8.00 | 9.00 | 8.58 |
| TD-10A1 | — | — | — | PASS |

**student_conduct_records** — 30 HS 10A1, phân bố `GOOD` / `FAIR` / `SATISFACTORY` / `UNSATISFACTORY`.

**student_semester_summaries** — HS đầu tiên: TB **7.99**, `academic_result_level=GOOD`, `training_result_level=GOOD`, `CLOSED`.

**student_year_summaries** — HS đầu tiên: `promotion_decision=PENDING`, `status=DRAFT`.

Seed: `server/prisma/seed-data/summaries.ts`

---

## Sprint tiếp theo (chưa triển khai)

- API + service tính điểm — Phase 7B+
- Báo cáo, export Excel — Sprint 8
