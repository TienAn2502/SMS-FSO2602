# Sprint 6 – Kế hoạch triển khai

**Mục tiêu:** Sổ điểm theo lớp môn — GV tạo đầu điểm và nhập điểm HS; admin tra cứu; HS/PH xem bảng điểm (read-only)  
**Thời gian ước tính:** 2–3 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 4 hoàn thành (GV, phân công, lớp môn, portal); Sprint 5 khuyến nghị (pattern portal tương tự)

## Điều kiện hoàn thành

```text
Admin / GV đăng nhập
→ Tạo đầu điểm (assessment) cho lớp môn + học kỳ
   (VD: Kiểm tra miệng, 15 phút, 1 tiết, giữa kỳ, cuối kỳ…)
→ Khởi tạo danh sách HS từ enrollment ACTIVE lớp HC của lớp môn
→ Nhập / sửa điểm từng HS (0 … max_score)
→ Khóa đầu điểm (CLOSED) — GV không sửa sau khi khóa (MVP: admin override)
→ GV chỉ ghi điểm lớp môn được phân công
→ HS / PH xem bảng điểm theo học kỳ (read-only)
→ Migration + seed + build pass
```

## Quyết định MVP

| Hạng mục | Quyết định |
|----------|------------|
| Đầu điểm | Bảng `assessments` — 1 đầu điểm / lớp môn / lần kiểm tra |
| Chi tiết HS | Bảng `scores` — 1 dòng / HS / đầu điểm |
| Loại đầu điểm | Enum `AssessmentType`: `REGULAR`, `MIDTERM`, `FINAL` |
| Thang điểm | `max_score` trên assessment (MVP mặc định **10**, cho phép 10 hoặc 100) |
| Trạng thái đầu điểm | `OPEN` (đang nhập), `CLOSED` (đã khóa) |
| Điểm HS | `score` DECIMAL nullable — `null` = chưa nhập |
| Danh sách HS | Lấy từ enrollment ACTIVE lớp HC của lớp môn (giống điểm danh) |
| Quyền ghi | `SCHOOL_ADMIN` (override), `TEACHER` (lớp được phân công) |
| Quyền đọc portal | `STUDENT` (bản thân), `PARENT` (con đã liên kết) |
| Tính TB môn / TB học kỳ | **Sprint 7** — ngoài phạm vi MVP |
| Trọng số đầu điểm (`weight`) | Cột optional, chưa dùng công thức — chuẩn bị Sprint 7 |
| Import Excel điểm | Hoãn |
| Số tiết / số cột điểm TX | Cột `periods_per_year` trên **`grade_level_subjects`** (khối × môn) — xem [Schema bổ sung](#schema-bổ-sung-grade_level_subjects) |

## Phạm vi Sprint 6

### Trong phạm vi

| Module | Mô tả |
|--------|-------|
| Schema | `assessments`, `scores` |
| API admin | GET danh sách / chi tiết đầu điểm + điểm (read-only) |
| API GV (portal) | Tạo đầu điểm, khởi tạo HS, bulk ghi điểm, khóa |
| Portal HS/PH | Xem bảng điểm theo học kỳ / lớp môn |
| Seed | 3 đầu điểm mẫu lớp 10A1 (TOAN/VAN/ANH), ~30 HS/đầu điểm |
| Frontend | Trang admin tra cứu + portal GV nhập điểm + HS/PH xem |

### Ngoài phạm vi

- Tính điểm trung bình môn, xếp loại học lực — Sprint 7
- Hạnh kiểm, lên lớp, tổng kết — Sprint 7
- Báo cáo tổng hợp, export Excel — Sprint 8
- Sửa điểm sau khi khóa (workflow phê duyệt) — phase sau
- Ghi danh lớp môn riêng (`course_section_enrollments`) — defer

---

## Phases

### Phase 6A – Schema & Seed ✅

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | Prisma: `assessments`, `scores` | `server/prisma/schema.prisma` | ✅ |
| 2 | Enum: `AssessmentType`, `AssessmentStatus` | schema | ✅ |
| 3 | Migration | `server/prisma/migrations/20260731140000_init_sprint6_gradebook/` | ✅ |
| 4 | Seed: 3 đầu điểm 10A1 (TOAN/VAN/ANH), ~30 HS/đầu điểm | `server/prisma/seed-data/gradebook.ts` | ✅ |
| 5 | Docs schema | [schema-sprint6.md](../database/schema-sprint6.md) | ✅ |

**Bảng mới:** `assessments`, `scores`

---

### Phase 6B – API đầu điểm (admin read + portal write) ✅

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | Module `assessments` | `server/src/modules/assessments/` | ✅ |
| 2 | GET list/filter — admin | `assessments.controller.ts` | ✅ |
| 3 | GET detail + scores — admin | | ✅ |
| 4 | Validate lớp môn + học kỳ + GV phân công (portal) | | ✅ |
| 5 | Unique constraint | schema | ✅ |
| 6 | E2E 401 | `test/assessments.e2e-spec.ts` | ✅ |

---

### Phase 6C – API điểm HS ✅

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | Module `scores` | `server/src/modules/scores/` | ✅ |
| 2 | POST initialize | portal + `ScoresService` | ✅ |
| 3 | PUT bulk scores khi assessment `OPEN` | | ✅ |
| 4 | Validate `0 <= score <= max_score` | | ✅ |
| 5 | E2E | `test/assessments.e2e-spec.ts` | ✅ |

---

### Phase 6D – Portal APIs ✅

| # | Task | Endpoint | Trạng thái |
|---|------|----------|------------|
| 1 | GV: phân công (tái dùng) | `GET /portal/my-teaching-assignments` | ✅ (Sprint 4) |
| 2 | GV: tạo đầu điểm | `POST /portal/assessments` | ✅ |
| 3 | GV: khởi tạo HS | `POST /portal/assessments/:id/scores/initialize` | ✅ |
| 4 | GV: bulk ghi điểm | `PUT /portal/assessments/:id/scores` | ✅ |
| 5 | GV: khóa | `PATCH /portal/assessments/:id` | ✅ |
| 6 | HS: bảng điểm | `GET /portal/my-scores/grid` | ✅ |
| 7 | PH: điểm con | `GET /portal/my-children/:id/scores` | ✅ |

---

### Phase 6E – Frontend ✅

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | Admin: danh sách đầu điểm, filter, xem chi tiết | `client/src/features/gradebook/` | ✅ |
| 2 | Portal GV: tạo đầu điểm + grid nhập điểm | `client/src/features/portal/` | ✅ |
| 3 | Portal HS: xem điểm theo môn / học kỳ | | ✅ |
| 4 | Portal PH: xem điểm con | | ✅ |
| 5 | Sidebar / dashboard portal theo role | `app-sidebar.tsx`, `portal-dashboard-page.tsx` | ✅ |

---

## Thứ tự phụ thuộc

```text
6A (schema + seed)
 └─► 6B (API assessments)
      └─► 6C (API scores)
           └─► 6D (portal)
                └─► 6E (frontend)
```

---

## Quy tắc nghiệp vụ

| # | Quy tắc |
|---|---------|
| 1 | Mọi query theo `schoolId` từ JWT |
| 2 | `semester_id` trên assessment phải khớp `course_section.semester_id` |
| 3 | GV chỉ tạo/sửa assessment lớp môn có `teaching_assignment` ACTIVE |
| 4 | HS trong score phải có enrollment ACTIVE lớp HC tương ứng với lớp môn |
| 5 | Một HS một dòng duy nhất trong đầu điểm `(assessment_id, student_id)` |
| 6 | `score` phải thỏa `0 <= score <= assessment.max_score` (hoặc `null` = chưa nhập) |
| 7 | Assessment `CLOSED` — GV không sửa điểm (admin có thể override — tùy phase) |
| 8 | Không hard-delete — giữ lịch sử |
| 9 | Khởi tạo scores chỉ thêm HS còn thiếu, không ghi đè điểm đã nhập |

---

## Mô hình dữ liệu (tóm tắt)

```text
course_sections ──► assessments ──► scores ──► students
                         │
                         ├── teacher_id → teachers
                         └── semester_id → semesters
```

| Bảng | Vai trò |
|------|---------|
| `assessments` | Đầu điểm (lớp môn + loại + ngày + thang điểm) |
| `scores` | Điểm từng HS trong một đầu điểm |

Flow lấy danh sách HS cần chấm (giống điểm danh):

```text
students
  → student_enrollments (ACTIVE, đúng học kỳ)
  → homeroom_class_id
  → course_sections (homeroom_class_id + semester_id)
  → assessments → scores
```

---

## Seed mẫu (trường DEMO)

| Dữ liệu | Giá trị |
|---------|---------|
| Lớp HC | `10A1` |
| Lớp môn | `TOAN-10A1`, `VAN-10A1`, `ANH-10A1` |
| Học kỳ | HK1 |
| Đầu điểm | 1× `REGULAR` / lớp môn |
| HS / đầu điểm | 30 HS (enrollment ACTIVE 10A1) |
| Điểm mẫu | Phân bố 4–10, vài HS `null` (chưa nhập) |

Chi tiết: [schema-sprint6.md](../database/schema-sprint6.md)

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [schema-sprint6.md](../database/schema-sprint6.md) | Chi tiết bảng |
| [sprint6-endpoints.md](../api/sprint6-endpoints.md) | REST API (Phase 6B+) |
| [sprint-5-plan.md](./sprint-5-plan.md) | Sprint trước (pattern portal) |
| [overview.md](../architecture/overview.md) | Roadmap tổng |

---

## Schema bổ sung (`grade_level_subjects`)

Số **điểm thường xuyên** (miệng, 15 phút…) phụ thuộc môn và **khối** (Toán 10 ≠ Toán 12). Cùng mã `TOAN` trên `subjects` nhưng số tiết/năm khác nhau → đặt cột trên **`grade_level_subjects`**, không chỉ `subjects`.

| Cột (đề xuất) | Kiểu | Mô tả |
|---------------|------|-------|
| `periods_per_year` | SMALLINT, nullable | Số tiết dạy **cả năm học** (2 học kỳ) cho cặp khối × môn |
| `evaluation_mode` | enum, default `NUMERIC` | Hình thức đánh giá học sinh |

### SubjectEvaluationMode

| Giá trị | Mô tả | Ví dụ môn |
|---------|-------|-----------|
| `NUMERIC` | Đánh giá bằng **điểm số** | Toán, Văn, Lý, Hóa… |
| `PASS_FAIL` | Đánh giá **đạt / chưa đạt** (nhận xét) | GD thể chất, GDQP-AN, HDTN |

**Cách dùng Sprint 6:**

- Gợi ý số cột điểm TX tối đa khi GV tạo `assessments` loại `REGULAR`
- Cảnh báo (soft) nếu vượt quota — MVP chưa bắt buộc hard limit
- TB môn Sprint 7 có thể tham chiếu trọng số theo số tiết (nếu trường cấu hình)

**Ví dụ THPT (minh họa):**

| Môn | Cốt lõi | +CD | **Tổng (seed)** |
|-----|---------|-----|-----------------|
| Toán, Văn | 105 | 35 | **140** |
| Anh, HDTN | 105 | — | **105** |
| Lịch sử | 52 | 35 | **87** |
| Lý, Hóa, Sinh, Địa, GKTPL, CN, Tin | 70 | 35 | **105** |
| GD thể chất | 70 | — | **70** |
| GDQP-AN | 35 | — | **35** |

> `periods_per_year` trong seed = **cốt lõi + chuyên đề** (nếu môn có cụm CD theo TT13/2022).

> Nếu trường chỉ cần một con số chung cho môn (không phân khối), có thể thêm sau trên `subjects` — nhưng THPT nên ưu tiên `grade_level_subjects`.

**Phase 6A** — migration thêm cột + cập nhật seed `grade_level_subjects`.

---

## Bước tiếp theo

Sprint 6 hoàn thành — chuyển **[Sprint 7](./sprint-7-plan.md)** (tính TB môn, xếp loại học lực, hạnh kiểm, lên lớp).
