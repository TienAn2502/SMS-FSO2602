# Luồng tổng kết học kỳ & cả năm

Tài liệu mô tả quy trình nghiệp vụ **tổng kết học kỳ (HK)** và **tổng kết năm / xét lên lớp** trong eSchool SaaS (Sprint 7+).

**Liên quan:**

- Schema: [schema-sprint7.md](../database/schema-sprint7.md)
- API: [sprint7-endpoints.md](../api/sprint7-endpoints.md)
- Kế hoạch sprint: [sprint-7-plan.md](../sprints/sprint-7-plan.md)

---

## Vai trò & trách nhiệm

| Vai trò | Học kỳ | Cả năm |
|---------|--------|--------|
| **GVBM** | Nhập điểm, **khóa sổ** từng lớp môn | — |
| **GVCN** | **Lưu hạnh kiểm** (Portal → Hạnh kiểm) — trạng thái `DRAFT` | — |
| **SCHOOL_ADMIN** | **Tái tính**, **khóa học kỳ** toàn trường | **Tái tính năm**, **chốt lên lớp** toàn trường |
| **HS / PH** | Xem kết quả (read-only) | Xem quyết định lên lớp |

**Lưu ý:** GVCN **không** khóa hạnh kiểm. Admin khóa hạnh kiểm **cùng lúc** với khóa tổng kết học kỳ (`Khóa học kỳ`).

---

## Trạng thái dữ liệu (`SummaryStatus`)

| Trạng thái | Ý nghĩa |
|------------|---------|
| `DRAFT` | Bản nháp — có thể sửa / tái tính |
| `CLOSED` | Đã chốt — không sửa (MVP) |

Bảng dùng `SummaryStatus`: `student_subject_results`, `student_conduct_records`, `student_semester_summaries`, `student_year_summaries`.

---

## Luồng tổng kết học kỳ (HK)

### Sơ đồ

```text
GVBM: nhập điểm → khóa sổ lớp môn (assessment CLOSED)
        ↓
GVCN: Portal → Hạnh kiểm → Lưu (conduct DRAFT)
        ↓
Admin: Tổng kết học tập → Học kỳ → Tái tính (tùy chọn)
        ↓
Admin: GET finalize-readiness → xem lớp còn vấn đề
        ↓
Admin: Khóa học kỳ (toàn trường)
        ↓
  • TB môn DRAFT → CLOSED
  • Tổng kết HK DRAFT → CLOSED
  • Hạnh kiểm DRAFT → CLOSED
```

### Điều kiện readiness (trước khi khóa HK)

Hệ thống kiểm tra **từng lớp chủ nhiệm**:

| Mã | Điều kiện |
|----|-----------|
| `OPEN_GRADEBOOKS` | Mọi lớp môn: sổ điểm đã khóa (không còn assessment `OPEN`) |
| `MISSING_CONDUCT` | Mọi HS ACTIVE có bản ghi hạnh kiểm |
| `MISSING_SEMESTER_SUMMARY` | Mọi HS có tổng kết HK (cần **Tái tính** nếu thiếu) |
| `ALREADY_CLOSED` | Lớp đã khóa (thông tin, không chặn lớp khác) |

### API học kỳ

| Bước | Method | Path |
|------|--------|------|
| Tái tính TB môn + tổng kết HK | `POST` | `/grade-summaries/recompute` |
| Kiểm tra readiness | `GET` | `/grade-summaries/semesters/:semesterId/finalize-readiness` |
| Khóa học kỳ toàn trường | `POST` | `/grade-summaries/semesters/:semesterId/finalize-all` |
| Khóa theo lớp CN (legacy) | `POST` | `/grade-summaries/semesters/:semesterId/finalize` |

**UI admin:** `Tổng kết học tập` → tab **Học kỳ** → panel **Khóa học kỳ toàn trường**.

**Body tái tính** (có thể bỏ `homeroomClassId` để toàn trường):

```json
{
  "semesterId": "uuid-hoc-ky"
}
```

---

## Luồng tổng kết năm & xét lên lớp

Chạy **sau khi đã khóa cả HK1 và HK2**.

### Sơ đồ

```text
[Hoàn thành luồng HK cho HK1 và HK2]
        ↓
Admin: Tổng kết → Cả năm → Tái tính năm
        ↓
  • Tính TB cả năm, học lực, rèn luyện
  • Gán promotionDecision (PROMOTED / RETAINED / GRADUATED / PENDING)
  • Lưu student_year_summary (DRAFT)
        ↓
Admin: GET finalize-promotion-readiness
        ↓
Admin: Chốt lên lớp (toàn trường)
        ↓
  • Tái tính năm lần cuối
  • student_year_summary DRAFT → CLOSED
        ↓
Admin: tạo năm học mới + học kỳ (thường HK1)
        ↓
Admin: POST /year-preparation/prepare-next-year
  • Tạo lớp HC năm sau cho HS lên lớp (cấu trúc + GVCN từ năm cũ)
  • Gán nextHomeroomClassId (PROMOTED → khối+1)
  • Tạo ghi danh ACTIVE vào HK đích
  • RETAINED / GRADUATED: bỏ qua
        ↓
(Tuỳ chọn) chỉnh tay PATCH year-summaries / POST from-year-promotions
```

### Tiền đề chốt lên lớp

Mỗi HS cần:

| # | Dữ liệu | Trạng thái yêu cầu |
|---|---------|-------------------|
| 1 | Tổng kết HK1 | `CLOSED` |
| 2 | Tổng kết HK2 | `CLOSED` |
| 3 | Hạnh kiểm HK1 | `CLOSED` |
| 4 | Hạnh kiểm HK2 | `CLOSED` |
| 5 | TB cả năm | ≠ null (có TB HK1 và TB HK2) |

Readiness báo thêm:

| Mã | Ý nghĩa |
|----|---------|
| `HK1_SEMESTER_NOT_CLOSED` / `HK2_...` | Chưa khóa tổng kết học kỳ |
| `HK1_CONDUCT_NOT_CLOSED` / `HK2_...` | Hạnh kiểm chưa khóa (chưa khóa HK) |
| `MISSING_YEAR_SUMMARY` | Chưa có bản ghi tổng kết năm → **Tái tính năm** |
| `PENDING_PROMOTION` | HS còn `promotionDecision = PENDING` (chưa đủ dữ liệu xét lên lớp) |

### Quyết định lên lớp (`PromotionDecision`)

Tính tự động khi **Tái tính năm** (`resolvePromotionDecision`):

| Giá trị | Điều kiện (tóm tắt) |
|---------|---------------------|
| `PENDING` | Thiếu dữ liệu HK1/HK2 đã khóa, hoặc TB năm null, hoặc chưa đủ điều kiện rõ ràng |
| `RETAINED` | Học lực/rèn luyện `UNSATISFACTORY`, hoặc vắng > 45 buổi/năm |
| `PROMOTED` | Đủ điều kiện lên lớp (học lực & rèn luyện ≥ `SATISFACTORY`, vắng ≤ 45) |
| `GRADUATED` | Khối tốt nghiệp (12), TB năm ≥ 5, đủ điều kiện | Sau **chốt lên lớp**: `students.status` → `INACTIVE` (tài khoản `users` giữ nguyên) |

### API cả năm

| Bước | Method | Path |
|------|--------|------|
| Tái tính tổng kết năm | `POST` | `/grade-summaries/academic-years/:academicYearId/recompute-year-summaries` |
| Kiểm tra readiness | `GET` | `/grade-summaries/academic-years/:academicYearId/finalize-promotion-readiness` |
| Chốt lên lớp toàn trường | `POST` | `/grade-summaries/academic-years/:academicYearId/finalize-promotion-all` |
| Chốt theo lớp CN (legacy) | `POST` | `/grade-summaries/academic-years/:academicYearId/finalize-promotion` |
| Gán lớp năm sau | `PATCH` | `/grade-summaries/year-summaries/:id` |
| Xem trước chuẩn bị năm sau | `GET` | `/year-preparation/preview` |
| Chuẩn bị năm sau (lớp + map + ghi danh) | `POST` | `/year-preparation/prepare-next-year` |
| Xem trước ghi danh năm sau | `GET` | `/student-enrollments/from-year-promotions/preview` |
| Tạo ghi danh năm sau | `POST` | `/student-enrollments/from-year-promotions` |

**UI admin:** `Tổng kết học tập` → tab **Cả năm / Lên lớp** → panel **Chốt lên lớp toàn trường**, sau khi chốt → panel **Chuẩn bị & ghi danh năm sau**.

### Tạo ghi danh năm sau (Phase 7E #5)

**Cách nhanh (khuyến nghị):** sau khi đã tạo năm học mới + học kỳ đích, dùng `POST /year-preparation/prepare-next-year`:

| Bước | Hành vi |
|------|---------|
| Tạo lớp HC | Mirror cấu trúc năm cũ cho lớp có HS `PROMOTED`: mã khối+1 (10A1→11A1); giữ GVCN & sức chứa. `RETAINED` không tạo lớp |
| Map HS | Chỉ gán `nextHomeroomClassId` cho `PROMOTED`; `RETAINED` / `GRADUATED` bỏ qua |
| Ghi danh | Gọi cùng logic `from-year-promotions` vào `targetSemesterId` (chỉ PROMOTED; idempotent) |

**Cách thủ công:** 

1. Năm nguồn đã chốt lên lớp (`student_year_summaries.status = CLOSED`)
2. Năm học mới + học kỳ đích (thường HK1) + lớp HC đã tồn tại
3. Gán `nextHomeroomClassId` cho HS `PROMOTED` (lớp thuộc năm đích)
4. `POST /student-enrollments/from-year-promotions`

Hành vi ghi danh:

| Quyết định | Kết quả |
|------------|---------|
| `PROMOTED` + có lớp năm sau hợp lệ | Tạo enrollment `ACTIVE` (idempotent nếu đã có) |
| Thiếu lớp / lớp sai năm | Đếm `missingNextClass` / `invalidNextClass`, không tạo |
| `RETAINED` / `GRADUATED` | Bỏ qua |

### Xếp lớp đầu năm (ở lại + mới lên cấp)

HS **ở lại** và **mới lên cấp** không đi qua `prepare-next-year`. Dùng màn **Xếp lớp đầu năm** (`/class-placement`):

| API | Việc |
|-----|------|
| `GET /class-placement/unassigned` | List HS ACTIVE chưa có ghi danh HK đích (`RETAINED` / `NEW_INTAKE`) |
| `POST /class-placement/assign` | Xếp tay → tạo enrollment (HS ở lại chỉ cùng khối năm trước) |
| `GET/POST /class-placement/auto-balance` | Chia đều vào lớp ACTIVE của khối (tôn trọng capacity; ở lại lọc theo khối) |

Import HS: `ma_lop_hc` **tuỳ chọn** — bỏ trống thì chỉ tạo hồ sơ, xếp lớp sau trên màn này.

**Import Excel chia lớp:** `POST /imports/class-placement` — mỗi sheet = một lớp (tên sheet = mã lớp). Lớp chưa có → tự tạo (suy khối từ mã, vd. `10A1` → khối 10) + ghi danh HS. Tải mẫu `GET /imports/templates/class-placement?academicYearId&semesterId` điền sẵn HS ở lại / mới lên cấp chưa có lớp từ DB.

**Lớp môn năm mới:** import Excel trên `/course-sections` (`POST /imports/course-sections`) — mỗi sheet = một lớp HC, tạo record mới. Tải mẫu có `semesterId`: khối 10 lấy môn từ cấu hình khối; khối 11/12 ưu tiên môn từ HK2 năm trước trong DB (đã lọc theo cấu hình khối hiện tại).

**Body tái tính năm** (rỗng = toàn trường):

```json
{}
```

Chỉ chốt lên lớp cho **năm học hiện tại**, sau khi kết thúc HK2 (UI chặn nếu đang trong HK1).

---

## Bảng dữ liệu theo giai đoạn

| Giai đoạn | Bảng chính | Ai tạo / cập nhật |
|-----------|------------|-------------------|
| Trong HK | `assessments`, `scores` | GVBM |
| Sau khóa sổ | `student_subject_results` | Tái tính (admin) |
| Hạnh kiểm | `student_conduct_records` | GVCN lưu; admin khóa cùng HK |
| Tổng kết HK | `student_semester_summaries` | Tái tính; admin khóa HK |
| Tổng kết năm | `student_year_summaries` | Tái tính năm; admin chốt lên lớp |

---

## Seed & script dev

| Lệnh | Mục đích |
|------|----------|
| `pnpm prisma:seed-summaries-semester` | TB môn + tổng kết HK + hạnh kiểm (DRAFT) cho một HK |
| `pnpm prisma:seed-conduct-semester` | Chỉ hạnh kiểm (upsert); `SEED_CONDUCT_STATUS=CLOSED` để khóa sẵn |
| `pnpm prisma:lock-semester` | Khóa assessment (sổ điểm) — chưa tính tổng kết |
| `pnpm prisma:seed-year-complete` | **Năm hiện tại:** điểm + điểm danh HK1/HK2, khóa sổ, tổng kết CLOSED, xét lên lớp DRAFT, đặt HK2 hiện hành |
| `SEED_SUMMARIES_SEMESTER_ID=<uuid>` | Chỉ định học kỳ khi seed summaries |
| `SEED_SKIP_HK1=true` | Bỏ qua seed lại HK1 (chỉ khóa/đóng nếu đã có) khi chạy `seed-year-complete` |

**Thứ tự seed demo gợi ý:**

```bash
# Sau prisma:seed (đã có HK1 điểm/tổng kết DRAFT)
pnpm prisma:seed-year-complete

# Hoặc bỏ qua tái tạo HK1 nếu đã khóa tay:
SEED_SKIP_HK1=true pnpm prisma:seed-year-complete
```

Sau đó trên UI: **Tái tính năm** (tuỳ chọn) → **Chốt lên lớp**.

---

## Xử lý lỗi thường gặp

| Triệu chứng | Nguyên nhân thường gặp | Cách xử lý |
|-------------|------------------------|------------|
| 「X lớp môn chưa khóa sổ」 | GVBM chưa lock gradebook | Khóa sổ từng lớp môn |
| 「Thiếu hạnh kiểm」 | GVCN chưa lưu | Portal → Hạnh kiểm → Lưu |
| 「Thiếu tổng kết học kỳ」 | Chưa tái tính sau khóa sổ | Admin → Tái tính |
| 「X HS chưa đủ dữ liệu xét lên lớp」 | `PENDING` trên tổng kết năm | Khóa đủ HK1+HK2 → **Tái tính năm** |
| Nút chốt lên lớp disabled | Đang HK1 hoặc không phải năm hiện tại | Chờ HK2, chọn đúng năm học |

---

## Portal (read-only / nhập liệu)

| Path UI | API | Ghi chú |
|---------|-----|---------|
| `/portal/my-homeroom/conduct-records` | `PUT /portal/my-homeroom/conduct-records` | GVCN **lưu** hạnh kiểm |
| `/portal/my-summaries` | `GET /portal/my-summaries` | HS xem tổng kết |
| Portal PH | `GET /portal/my-children/:id/summaries` | PH xem con |

Không có API portal để khóa hạnh kiểm hay chốt lên lớp — thuộc quyền admin.

---

## Tóm tắt một dòng

```text
GVBM khóa sổ → GVCN lưu hạnh kiểm → Admin khóa HK1, HK2 → Admin tái tính năm → Admin chốt lên lớp
```
