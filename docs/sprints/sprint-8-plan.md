# Sprint 8 – Kế hoạch triển khai

**Mục tiêu:** Import/export dữ liệu (XLSX, CSV), báo cáo PDF, hoàn thiện vận hành (CI/CD, deployment)  
**Thời gian ước tính:** 2–3 tuần  
**Ngôn ngữ UI:** Tiếng Việt  
**Phụ thuộc:** Sprint 7 hoàn thành (tổng kết, hạnh kiểm, lên lớp)

## Điều kiện hoàn thành

```text
Admin đăng nhập trường DEMO
→ Tải template Excel/CSV (HS, điểm, …)
→ Import file — validate từng dòng, báo lỗi chi tiết
→ Export danh sách / sổ điểm / tổng kết ra XLSX hoặc CSV
→ Xuất báo cáo PDF (bảng điểm, tổng kết lớp, TKB)
→ GV / GVCN export phạm vi được phép (read-only)
→ CI chạy lint + test; deploy MVP lên môi trường staging/production
→ Migration + seed + build pass
```

## Quyết định MVP

| Hạng mục | Quyết định |
|----------|------------|
| Định dạng import | **XLSX + CSV** (cùng schema cột) |
| Định dạng export | **XLSX + CSV + PDF** |
| Thư viện | `exceljs`, `csv-parse`, `csv-stringify`, `puppeteer` — [ADR 012](../decisions/012-import-export-libraries.md) |
| Xử lý file | **Server-side** — client upload/download blob |
| Validate import | Zod schema dùng chung sau bước parse |
| PDF | HTML template → Puppeteer `page.pdf()` — **export only** |
| Template Excel | Server generate — sheet dữ liệu + sheet hướng dẫn (tuỳ module) |
| CSV tiếng Việt | UTF-8 **with BOM** khi export |
| Lưu file export lớn | Stream response; tuỳ chọn upload R2 + presigned URL (phase sau) |
| Import async job | Hoãn — MVP xử lý đồng bộ, giới hạn 5 MB / ~10k dòng |
| CI/CD | GitHub Actions: lint, unit test, e2e (PR); deploy staging on merge main |

## Phạm vi Sprint 8

### Trong phạm vi

| Module | Mô tả |
|--------|-------|
| **Import HS + ghi danh** | Bulk tạo/cập nhật HS, gán lớp HC theo năm học (hoãn từ Sprint 3) |
| **Import điểm** | Bulk điểm theo lớp môn / đầu điểm (hoãn từ Sprint 6) |
| **Export danh sách** | HS, GV, phụ huynh, ghi danh — XLSX + CSV |
| **Export sổ điểm** | Lưới điểm lớp môn theo học kỳ — XLSX + PDF |
| **Export tổng kết** | TB môn, học lực, hạnh kiểm, lên lớp — XLSX + PDF |
| **Export TKB** | Lớp HC / lớp môn — PDF (+ XLSX tuỳ chọn) |
| **Export điểm danh** | Theo lớp / khoảng ngày — XLSX + CSV |
| **Template download** | GET endpoint trả file mẫu `.xlsx` cho từng loại import |
| **Module NestJS** | `imports/`, `exports/` (hoặc `reports/`) + shared parsers |
| **Frontend** | Nút Import/Export trên trang admin tương ứng; dialog upload + hiển thị lỗi dòng |
| **CI/CD** | Workflow lint/test; hướng dẫn deploy |

### Ngoài phạm vi

- Import TKB Excel (Sprint 4 hoãn) — phase 8B hoặc sau MVP
- Import khối/môn/lớp hàng loạt (Sprint 2 hoãn) — phase sau
- ZIP gói nhiều file, JSON backup tenant
- Import async queue (Bull/Redis)
- Chữ ký số PDF, watermark
- Báo cáo tùy biến drag-drop (report builder)

---

## Phases

### Phase 8A – Hạ tầng file & thư viện

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | ADR thư viện | [012-import-export-libraries.md](../decisions/012-import-export-libraries.md) | ✅ |
| 2 | Cài package server | `server/package.json` | ✅ |
| 3 | Shared: `parseUploadedFile`, `CsvWriter`, `WorkbookBuilder` | `server/src/common/files/` | ✅ |
| 4 | Shared: `PdfRendererService` (Puppeteer pool / singleton) | `server/src/common/pdf/` | ✅ |
| 5 | HTML templates PDF (layout + font VN) | `server/src/templates/pdf/` | ✅ |
| 6 | Env: `IMPORT_MAX_BYTES`, `PUPPETEER_EXECUTABLE_PATH` | `.env.example` | ✅ |

**Package:**

```bash
cd server && pnpm add exceljs csv-parse csv-stringify puppeteer
```

---

### Phase 8B – Import

| # | Task | Endpoint gợi ý | Trạng thái |
|---|------|----------------|------------|
| 1 | Module `imports` | `server/src/modules/imports/` | ⬜ |
| 2 | Template HS + ghi danh | `GET /imports/templates/students` | ⬜ |
| 3 | Import HS | `POST /imports/students` (multipart) | ⬜ |
| 4 | Template điểm | `GET /imports/templates/scores` | ⬜ |
| 5 | Import điểm lớp môn | `POST /imports/scores` | ⬜ |
| 6 | Response lỗi theo dòng | `{ successCount, errors: [{ row, field, message }] }` | ⬜ |
| 7 | E2E import HS mẫu | `test/imports.e2e-spec.ts` | ⬜ |
| 8 | Frontend: upload + preview lỗi | trang Students, Gradebook | ⬜ |

**Luồng import:**

```text
Admin tải template XLSX
→ Điền dữ liệu (hoặc export CSV từ hệ thống cũ)
→ POST multipart file
→ Server: exceljs | csv-parse → rows[]
→ Zod validate từng dòng
→ Transaction Prisma (create/update)
→ 200 + summary | 422 + errors[]
```

**Schema cột HS (MVP gợi ý):**

| Cột | Bắt buộc | Ghi chú |
|-----|----------|---------|
| `ho_ten` | Có | |
| `ngay_sinh` | Có | `YYYY-MM-DD` |
| `gioi_tinh` | Không | `MALE` / `FEMALE` |
| `email` | Không | Tạo user STUDENT nếu có |
| `ma_lop_hc` | Có | Mã lớp trong năm học hiện tại |
| `external_code` | Không | Mã HS hệ thống cũ (map update) |

---

### Phase 8C – Export XLSX / CSV

| # | Task | Endpoint gợi ý | Trạng thái |
|---|------|----------------|------------|
| 1 | Module `exports` | `server/src/modules/exports/` | ⬜ |
| 2 | Export danh sách HS | `GET /exports/students?format=xlsx\|csv` | ⬜ |
| 3 | Export sổ điểm lớp môn | `GET /exports/gradebook/...` | ⬜ |
| 4 | Export tổng kết học kỳ | `GET /exports/semester-summaries/...` | ⬜ |
| 5 | Export tổng kết năm / lên lớp | `GET /exports/year-summaries/...` | ⬜ |
| 6 | Export điểm danh | `GET /exports/attendance/...` | ⬜ |
| 7 | Portal GV: export lớp được phân công | `GET /portal/exports/...` | ⬜ |
| 8 | Frontend: nút Export + chọn định dạng | các trang liên quan | ⬜ |

**Query `format`:** `xlsx` (default) | `csv`

Response headers:

```http
Content-Type: application/vnd.openxmlformats-officedocument.spreadsheetml.sheet
Content-Disposition: attachment; filename="danh-sach-hoc-sinh.xlsx"
```

CSV:

```http
Content-Type: text/csv; charset=utf-8
```

(Body bắt đầu bằng BOM `\uFEFF`)

---

### Phase 8D – Export PDF

| # | Task | Endpoint gợi ý | Trạng thái |
|---|------|----------------|------------|
| 1 | PDF bảng điểm lớp môn | `GET /exports/gradebook/.../pdf` | ⬜ |
| 2 | PDF tổng kết lớp HC (học kỳ) | `GET /exports/semester-summaries/.../pdf` | ⬜ |
| 3 | PDF biên bản xét lên lớp | `GET /exports/year-summaries/.../pdf` | ⬜ |
| 4 | PDF thời khóa biểu | `GET /exports/timetable/.../pdf` | ⬜ |
| 5 | Header trường (logo, tên trường, năm học) | template HTML | ⬜ |
| 6 | Portal HS/PH: PDF bảng điểm cá nhân | `GET /portal/exports/...` | ⬜ |

**Puppeteer flow:**

```text
Service load data từ DB
→ render HTML (Handlebars / template string)
→ PdfRendererService: launch browser → setContent → pdf({ format: 'A4' })
→ return Buffer → StreamableFile
```

---

### Phase 8E – CI/CD & deployment

| # | Task | File chính | Trạng thái |
|---|------|------------|------------|
| 1 | GitHub Actions: lint + test PR | `.github/workflows/ci.yml` | ⬜ |
| 2 | E2E trên CI (Postgres service) | workflow | ⬜ |
| 3 | Build Docker server (+ Chromium cho Puppeteer) | `server/Dockerfile` | ⬜ |
| 4 | Deploy client (Vite static) | Vercel / Cloudflare Pages / nginx | ⬜ |
| 5 | Deploy server | Railway / Render / VPS | ⬜ |
| 6 | Docs deploy | [deployment.md](../setup/deployment.md) | ⬜ |
| 7 | Health check + migrate on deploy | `prisma migrate deploy` | ⬜ |

**Lưu ý Puppeteer production:**

- Docker image cần dependencies Chromium (`--no-sandbox` trong container)
- Hoặc set `PUPPETEER_EXECUTABLE_PATH` trỏ Chrome hệ thống
- Giới hạn concurrent PDF (queue / semaphore) tránh OOM

---

## Quy tắc nghiệp vụ import

| # | Quy tắc |
|---|---------|
| 1 | Mọi thao tác theo `schoolId` từ JWT |
| 2 | Import HS: không xóa cứng — chỉ create/update theo `external_code` hoặc email |
| 3 | Import điểm: chỉ ghi assessment `OPEN`; không sửa assessment `CLOSED` |
| 4 | Lỗi một dòng không rollback dòng khác **nếu** chọn mode `partial` — MVP mặc định **all-or-nothing** (transaction) |
| 5 | Export chỉ dữ liệu user được phép xem (RBAC giống GET API hiện tại) |
| 6 | PDF tổng kết chỉ export bản `CLOSED` (hoặc cảnh báo watermark "BẢN NHÁP") |

---

## Kế thừa sprint trước

| Tính năng hoãn | Sprint | Sprint 8 |
|----------------|--------|----------|
| Import Excel HS | 3 | Phase 8B |
| Import Excel điểm | 6 | Phase 8B |
| Export Excel / PDF báo cáo | 5, 6, 7 | Phase 8C, 8D |
| Export TKB PDF | 4 | Phase 8D |
| CI/CD, deployment | 4+ | Phase 8E |

---

## Seed / demo

| Dữ liệu | Mục đích test |
|---------|---------------|
| File `students-import-sample.xlsx` | 5 HS mẫu — e2e import |
| Export 10A1 HK1 | So khớp sổ điểm Sprint 6 seed |
| PDF tổng kết 10A1 | In thử layout |

---

## Tài liệu liên quan

| Tài liệu | Nội dung |
|----------|----------|
| [012-import-export-libraries.md](../decisions/012-import-export-libraries.md) | ADR thư viện |
| [sprint8-endpoints.md](../api/sprint8-endpoints.md) | REST API |
| [sprint-7-plan.md](./sprint-7-plan.md) | Sprint trước |
| [conventions.md](../api/conventions.md) | Quy ước API |

---

## Bước tiếp theo

Sau Sprint 8 (học vụ) → chuyển sang **Platform SaaS**:

1. [Sprint 9](./sprint-9-plan.md) — onboard tenant, CRUD trường, system admin UI  
2. [Sprint 10](./sprint-10-plan.md) — impersonation, audit log, dashboard vận hành  
3. [Sprint 11](./sprint-11-plan.md) — quota, feature flags, billing (tuỳ chọn)
