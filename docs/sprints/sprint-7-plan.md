# Sprint 7 – Kế hoạch triển khai

**Mục tiêu:** Tổng kết học tập — tính TB môn / TB học kỳ, xếp loại học lực, hạnh kiểm, tổng kết năm và xét lên lớp  
**Thời gian ước tính:** 2–3 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 6 hoàn thành (sổ điểm TX/GK/CK, khóa sổ, portal GV/HS/PH)

## Điều kiện hoàn thành

```text
Admin / GVCN / GV đăng nhập
→ Hệ thống tính (hoặc tái tính) TB môn theo học kỳ từ scores đã khóa
→ GVCN nhập hạnh kiểm từng HS theo học kỳ
→ Khóa tổng kết học kỳ — xếp loại học lực theo quy tắc MVP
→ Cuối năm: TB môn cả năm, học lực cả năm, xét lên lớp / tốt nghiệp (khối 12)
→ Admin tra cứu; HS / PH xem kết quả tổng kết (read-only)
→ Migration + seed + build pass
```

**Luồng chi tiết:** [flows/grade-summaries.md](../flows/grade-summaries.md)

## Quyết định MVP

| Hạng mục | Quyết định |
|----------|------------|
| Nguồn điểm | Đọc từ `scores` + `assessments` (Sprint 6), chỉ assessment `CLOSED` mới tính chính thức |
| TB học kỳ môn (NUMERIC) | TB các điểm TX (trung bình cộng) + GK (×2) + CK (×3) — đã có `computeSemesterAverage` |
| TB cả năm môn | `(TB HK1 + 2 × TB HK2) / 3` (làm tròn 2 chữ số) |
| Môn PASS_FAIL | Không tính TB số — lưu `Đạt` / `Chưa đạt` theo quy tắc MVP (xem [Công thức](#công-thức-tính-điểm-mvp)) |
| Trọng số `assessments.weight` | **Phase 7A:** vẫn optional; MVP dùng trọng số cố định theo `AssessmentType` |
| Hạnh kiểm (rèn luyện) | Enum `TrainingResultLevel` — GVCN nhập theo lớp HC + học kỳ |
| Học lực | Enum `AcademicResultLevel` + quy tắc ngưỡng MVP |
| Tổng kết | Snapshot lưu DB — không chỉ tính realtime trên grid |
| Lên lớp | Quyết định cuối năm: `PROMOTED`, `RETAINED`, `GRADUATED` |
| Enrollment `COMPLETED` | Dùng khi HS hoàn thành năm / tốt nghiệp (reserve Sprint 3) |
| Export Excel / báo cáo PDF | **Sprint 8** |
| Cấu hình quy tắc per-trường (UI phức tạp) | Hoãn — MVP hard-code hoặc seed JSON |

## Phạm vi Sprint 7

### Trong phạm vi

| Module | Mô tả |
|--------|-------|
| Schema | Kết quả môn, hạnh kiểm, tổng kết học kỳ/năm, quyết định lên lớp |
| Service tính điểm | Tái sử dụng / mở rộng `gradebook-average.util.ts` |
| API admin | Tra cứu, tái tính, khóa tổng kết |
| API portal GVCN | Nhập hạnh kiểm, xem bảng tổng kết lớp, đề xuất lên lớp |
| Portal HS/PH | Xem TB môn, học lực, hạnh kiểm, kết quả lên lớp |
| Seed | Tổng kết mẫu lớp 10A1 HK1 + xét lên lớp cuối năm (một phần HS) |
| Frontend | Trang admin + portal GVCN + HS/PH |

### Ngoài phạm vi

- Báo cáo tổng hợp, export Excel — Sprint 8
- Sửa điểm / sửa tổng kết sau khi khóa (workflow phê duyệt) — phase sau
- Hạnh kiểm chi tiết theo tiêu chí (nhiều cột) — phase sau
- Tích hợp điểm danh vào học lực — phase sau
- Cấu hình công thức TB theo từng môn trên UI — phase sau

---

## Phases

### Phase 7A – Schema & Seed ✅

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | Prisma: bảng tổng kết (xem [schema-sprint7.md](../database/schema-sprint7.md)) | `server/prisma/schema.prisma` | ✅ |
| 2 | Enum: `TrainingResultLevel`, `AcademicResultLevel`, `PassFailResult`, `PromotionDecision`, `SummaryStatus` | schema | ✅ |
| 3 | Migration | `server/prisma/migrations/20260803140000_init_sprint7_summaries/` | ✅ |
| 4 | Seed: kết quả môn + rèn luyện 10A1 HK1 | `server/prisma/seed-data/summaries.ts` | ✅ |
| 5 | Docs schema | [schema-sprint7.md](../database/schema-sprint7.md) | ✅ |

**Bảng mới:** `student_subject_results`, `student_conduct_records`, `student_semester_summaries`, `student_year_summaries`

---

### Phase 7B – Service tính điểm ✅

**Mục tiêu:** Tính và lưu TB môn từ sổ điểm đã khóa.

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | Module `grade-summaries` | `server/src/modules/grade-summaries/` | ✅ |
| 2 | `computeSubjectSemesterAverage(scores[])` — NUMERIC | `server/src/common/utils/gradebook-average.util.ts` | ✅ |
| 3 | `computeSubjectYearAverage(hk1, hk2)` | util | ✅ |
| 4 | `computePassFailResult(scores[])` — PASS_FAIL | util | ✅ |
| 5 | Tái tính theo `courseSectionId` / `homeroomClassId` + `semesterId` | `grade-summaries.service.ts` | ✅ |
| 6 | Chỉ lấy assessment `CLOSED`; bỏ qua ô vắng thi GK/CK | service | ✅ |
| 7 | Unit test công thức | `server/src/common/utils/gradebook-average.util.spec.ts` | ✅ |

**API:** Tách use-case trong `grade-summaries.service.ts`:
- `onGradebookLocked()` — gọi tự động khi GV khóa sổ (`PATCH /portal/.../lock`)
- `recomputeSubjectResults()` / `recomputeSemesterSummaries()` — từng bước
- `recompute()` — orchestration admin (sửa dữ liệu / import / khôi phục)

**Endpoints admin:** `POST /grade-summaries/recompute`, `/recompute/subject-results`, `/recompute/semester-summaries`.

---

### Phase 7C – API hạnh kiểm ✅

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | CRUD hạnh kiểm theo lớp HC + học kỳ | `conduct-records/` | ✅ |
| 2 | Chỉ GVCN hoặc `SCHOOL_ADMIN` được ghi | policy | ✅ |
| 3 | Bulk upsert danh sách HS lớp HC | service | ✅ |
| 4 | Khóa hạnh kiểm (`SummaryStatus.CLOSED`) | service | ✅ |
| 5 | E2E 401 / 403 | `test/summaries.e2e-spec.ts` | ✅ |

---

### Phase 7D – API tổng kết & học lực ✅

| # | Task | Endpoint gợi ý | Trạng thái |
|---|------|----------------|------------|
| 1 | Admin: tái tính TB môn lớp HC / học kỳ | `POST /grade-summaries/recompute` | ✅ |
| 2 | Admin: danh sách tổng kết HS | `GET /grade-summaries/semester-summaries` | ✅ |
| 3 | Admin: khóa tổng kết học kỳ | `POST /grade-summaries/semesters/:id/finalize` | ✅ |
| 4 | Service xếp loại học lực sau khi có TB + hạnh kiểm | service | ✅ |
| 5 | Portal GVCN: bảng tổng kết lớp | `GET /portal/my-homeroom/summaries` | ✅ |
| 6 | Portal HS: kết quả bản thân | `GET /portal/my-summaries` | ✅ |
| 7 | Portal PH: kết quả con | `GET /portal/my-children/:id/summaries` | ✅ |

---

### Phase 7E – Xét lên lớp ✅

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | Tính TB cả năm + học lực cả năm | `grade-summaries.service.ts` | ✅ |
| 2 | Quy tắc MVP: lên lớp / ở lại / tốt nghiệp | `promotion.util.ts` | ✅ |
| 3 | Admin: chốt hàng loạt + ghi `student_year_summaries` | controller | ✅ |
| 4 | GVCN: xem đề xuất (read-only) | `GET /portal/my-homeroom/year-summaries` | ✅ |
| 5 | Tạo enrollment năm sau — manual trigger MVP | hoãn (admin thủ công) | ⬜ |

---

### Phase 7F – Frontend ✅

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | Admin: tra cứu tổng kết, tái tính, khóa | `features/grade-summaries/` | ✅ |
| 2 | Portal GVCN: grid hạnh kiểm + xem học lực lớp | portal pages | ✅ |
| 3 | Portal HS: bảng TB môn + học lực + hạnh kiểm | `portal-my-summaries-page` | ✅ |
| 4 | Portal PH: xem tổng kết con | `portal-child-summaries-page` | ✅ |
| 5 | Sidebar / dashboard theo role | `app-sidebar.tsx` | ✅ |

---

## Thứ tự phụ thuộc

```text
7A (schema + seed)
 └─► 7B (tính điểm)
      └─► 7C (hạnh kiểm)
           └─► 7D (tổng kết + học lực)
                └─► 7E (lên lớp)
                     └─► 7F (frontend)
```

---

## Công thức tính điểm (MVP)

### Môn NUMERIC — TB học kỳ

Đã triển khai sơ bộ trên lưới Sprint 6 (`computeSemesterAverage`):

```text
TB HK = (Σ TX + 2×GK + 3×CK) / (n_TX + 2 + 3)
```

- **TX:** trung bình cộng các điểm `REGULAR` có giá trị (mỗi cột TX weight = 1 trong công thức tổng)
- **GK / CK:** lấy điểm assessment loại `MIDTERM` / `FINAL` (mỗi loại 1 cột trên lưới)
- **Bỏ qua:** `score = null` (chưa nhập)
- **Vắng thi GK/CK:** `score = null` **và** có `note` → coi là vắng, không đưa vào mẫu số (giữ logic Sprint 6)

Làm tròn: **2 chữ số thập phân**.

### Môn NUMERIC — TB cả năm

```text
TB năm = (TB HK1 + 2 × TB HK2) / 3
```

Chỉ tính khi đủ TB cả hai học kỳ (hoặc quy tắc thiếu HK2 — MVP: `null` nếu thiếu).

### Môn PASS_FAIL

- Lấy tối đa 2 điểm `REGULAR` (theo `PASS_FAIL_REGULAR_QUOTA`)
- **Đạt:** tất cả điểm có giá trị ≥ ngưỡng đạt (MVP: ≥ 5.0 trên thang 10) hoặc GV đánh dấu đạt
- **Chưa đạt:** còn lại
- Không có TB số / học lực theo điểm — chỉ hiển thị trạng thái

### TB học kỳ tổng hợp (học lực)

```text
TB HK tổng hợp = trung bình cộng TB HK các môn NUMERIC
                 (chỉ môn có TB; bỏ môn PASS_FAIL)
```

MVP **chưa** trọng số theo số tiết; Sprint 7+ có thể dùng `periods_per_year`.

---

## Quy tắc xếp loại học lực (MVP — TT22/2021)

Enum `AcademicResultLevel`. Áp dụng trên **ĐTBmhk / ĐTBmcn từng môn** (thang 10):

| Enum | Hiển thị VN | Điều kiện (TT22 — MVP) |
|------|-------------|------------------------|
| `GOOD` | **Tốt** | Tất cả môn nhận xét **Đạt**; tất cả môn tính điểm ≥ 6,5; **≥ 6 môn** ≥ 8,0 |
| `FAIR` | **Khá** | Tất cả môn nhận xét **Đạt**; tất cả môn tính điểm ≥ 5,0; **≥ 6 môn** ≥ 6,5 |
| `SATISFACTORY` | **Đạt** | Tối đa **1** môn nhận xét chưa đạt; **≥ 6 môn** tính điểm ≥ 5,0; không môn nào < 3,5 |
| `UNSATISFACTORY` | **Chưa đạt** | Các trường hợp còn lại |

Logic: `resolveAcademicResultLevel()` trong `gradebook-average.util.ts`.

---

## Quy tắc rèn luyện / hạnh kiểm (MVP)

Enum `TrainingResultLevel`:

| Enum | Hiển thị VN |
|------|-------------|
| `GOOD` | Tốt |
| `FAIR` | Khá |
| `SATISFACTORY` | Đạt |
| `UNSATISFACTORY` | Chưa đạt |

- GVCN nhập cho từng HS / học kỳ / lớp HC → cột `training_result_level` trên `student_conduct_records`
- Một bản ghi duy nhất `(student_id, semester_id)`

---

## Quy tắc lên lớp (MVP)

Enum `PromotionDecision`:

| Giá trị | Mô tả |
|---------|-------|
| `PROMOTED` | Lên lớp / lên khối |
| `RETAINED` | Ở lại lớp |
| `GRADUATED` | Tốt nghiệp (khối 12) |
| `PENDING` | Chưa xét |

**Gợi ý tự động (admin có thể sửa trước khi chốt):**

- `PROMOTED`: `academic_result_level` ≥ `SATISFACTORY` **và** `training_result_level` ≥ `SATISFACTORY`
- `RETAINED`: `academic_result_level` = `UNSATISFACTORY` **hoặc** `training_result_level` = `UNSATISFACTORY`
- `GRADUATED`: khối 12 + đủ điều kiện tốt nghiệp MVP (TB năm ≥ 5.0)

Sau khi chốt `PROMOTED`: admin tạo enrollment năm học mới (MVP thủ công hoặc nút “Tạo ghi danh năm sau”).

---

## Quy tắc nghiệp vụ

| # | Quy tắc |
|---|---------|
| 1 | Mọi query theo `schoolId` từ JWT |
| 2 | Tính tổng kết chính thức chỉ từ assessment `CLOSED` |
| 3 | Tái tính ghi đè snapshot `student_subject_results` khi trạng thái `DRAFT` |
| 4 | Sau `finalize` học kỳ — không tái tính tự động (admin `reopen` — phase sau) |
| 5 | GVCN chỉ sửa hạnh kiểm lớp mình chủ nhiệm |
| 6 | HS / PH chỉ xem kết quả đã `CLOSED` / đã công bố |
| 7 | Không hard-delete — giữ lịch sử quyết định lên lớp |

---

## Mô hình dữ liệu (tóm tắt)

```text
assessments ──► scores
                    │
                    ▼ (tính toán)
         student_subject_results
                    │
    student_conduct_records
                    │
                    ▼
         student_semester_summaries
                    │
                    ▼ (cuối năm)
           student_year_summaries ──► promotion_decision
```

| Bảng | Vai trò |
|------|---------|
| `student_subject_results` | TB môn / PASS_FAIL theo HS × lớp môn × học kỳ |
| `student_conduct_records` | Rèn luyện (`training_result_level`) HS × học kỳ |
| `student_semester_summaries` | TB tổng hợp + `academic_result_level` học kỳ |
| `student_year_summaries` | TB năm + học lực năm + quyết định lên lớp |

Chi tiết cột: [schema-sprint7.md](../database/schema-sprint7.md)

---

## Kế thừa Sprint 6

| Thành phần Sprint 6 | Dùng trong Sprint 7 |
|---------------------|---------------------|
| `computeSemesterAverage` | Cơ sở TB học kỳ môn — chuẩn hóa + lưu snapshot |
| `assessments.weight` | Chuẩn bị — MVP chưa dùng |
| `grade_level_subjects.evaluation_mode` | Phân nhánh NUMERIC / PASS_FAIL |
| `grade_level_subjects.periods_per_year` | Phase sau: trọng số TB tổng hợp |
| Cột **ĐTB HK** trên lưới GV/HS | Preview; Sprint 7 thêm bản lưu chính thức |

---

## Seed mẫu (trường DEMO)

| Dữ liệu | Giá trị |
|---------|---------|
| Lớp HC | `10A1` — HK1 |
| Môn | TOAN, VAN, ANH (NUMERIC) + GD thể chất (PASS_FAIL) |
| Nguồn điểm | Sổ điểm Sprint 6 đã khóa |
| Hạnh kiểm | ~30 HS — phân bố Tốt/Khá/TB |
| Tổng kết HK1 | Tính TB + xếp Giỏi/Khá/TB mẫu |
| Lên lớp | Một phần HS `PROMOTED` sang năm 2026–2027 (seed enrollment) |

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [schema-sprint7.md](../database/schema-sprint7.md) | Chi tiết bảng |
| [sprint7-endpoints.md](../api/sprint7-endpoints.md) | REST API (đề xuất) |
| [sprint-6-plan.md](./sprint-6-plan.md) | Sprint trước (sổ điểm) |
| [schema-sprint6.md](../database/schema-sprint6.md) | Schema điểm |
| [overview.md](../architecture/overview.md) | Roadmap tổng |

---

## Bước tiếp theo

Sprint 7 hoàn thành — chuyển **Sprint 8** (import/export XLSX·CSV·PDF, CI/CD, deployment). Xem [sprint-8-plan.md](./sprint-8-plan.md).
