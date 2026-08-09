# ADR 012: Thư viện import / export file (Sprint 8)

**Trạng thái:** ✅ Đã chốt  
**Ngày quyết định:** 2026-08-04  
**Ngữ cảnh:** Sprint 8 — import/export dữ liệu hàng loạt và báo cáo in ấn

## Quyết định

| Định dạng | Thư viện | Vai trò |
|-----------|----------|---------|
| **XLSX** | [`exceljs`](https://github.com/exceljs/exceljs) | Đọc/ghi Excel, template nhiều sheet, style cơ bản |
| **CSV** | [`csv-parse`](https://csv.js.org/parse/) + [`csv-stringify`](https://csv.js.org/stringify/) | Import/export CSV, stream, UTF-8 BOM |
| **PDF** | [`puppeteer`](https://pptr.dev/) | Render HTML template → PDF (báo cáo in ấn) |

**Không dùng** SheetJS (`xlsx`) cho MVP — ưu tiên `exceljs` vì template import và export có định dạng.

**Không import PDF** — PDF chỉ dùng export.

## Lý do

### Excel — `exceljs`

- Hỗ trợ workbook nhiều sheet (template + hướng dẫn)
- Style header, độ rộng cột — phù hợp file mẫu admin tải về
- TypeScript typings sẵn có
- Tách biệt với CSV — mỗi lib làm đúng việc của format

### CSV — `csv-parse` / `csv-stringify`

- Parse an toàn (quote, delimiter, dòng lỗi)
- Stream cho file lớn (danh sách HS cả trường)
- Export UTF-8 **with BOM** — Excel Windows mở đúng tiếng Việt
- Cùng schema cột với template XLSX; chỉ khác bước đọc file

### PDF — `puppeteer`

- Layout báo cáo giống web (HTML + CSS) — dễ bảo trì hơn code layout thủ công (`pdfkit`)
- Font tiếng Việt qua `@font-face` / Google Fonts trong template
- Phù hợp bảng điểm, tổng kết, TKB in treo lớp

**Trade-off:** Puppeteer nặng hơn (Chromium). Chấp nhận cho MVP; production cần cấu hình Docker / `PUPPETEER_EXECUTABLE_PATH` nếu dùng Chrome hệ thống.

## Kiến trúc xử lý

```text
Client upload (.xlsx | .csv)
  → NestJS FileInterceptor (multipart)
  → detect MIME / extension
  → exceljs | csv-parse → rows[]
  → Zod validate (schema dùng chung)
  → ImportService → transaction Prisma

Client export
  → API trả application/octet-stream hoặc redirect R2 (file lớn)
  → exceljs | csv-stringify | puppeteer (HTML → PDF)
```

**Parse và generate trên server** — client chỉ upload/download (`react-dropzone` đã có).

## Package cài đặt

```bash
cd server
pnpm add exceljs csv-parse csv-stringify puppeteer
```

Chỉ cài trên `server/` — client không cần thêm dependency cho MVP.

## Quy ước kỹ thuật

| Hạng mục | Quy ước |
|----------|---------|
| CSV encoding | UTF-8 with BOM khi export |
| CSV delimiter | `,` (document trong template) |
| XLSX template | Sheet 1: dữ liệu; Sheet 2 (tuỳ chọn): hướng dẫn cột |
| PDF font | Noto Sans / Be Vietnam Pro — embed hoặc load qua CDN trong template HTML |
| Validate | Zod schema **một bộ** cho CSV và XLSX cùng loại import |
| Giới hạn upload | MVP: 5 MB / 10 000 dòng (config env) |
| Lỗi import | Trả `422` + danh sách `{ row, field, message }[]` |

## Phạm vi ngoài ADR này

- ZIP gói nhiều file — phase sau
- JSON backup tenant — phase sau
- Import PDF / OCR — không làm

## Tài liệu liên quan

- [sprint-8-plan.md](../sprints/sprint-8-plan.md)
- [sprint8-endpoints.md](../api/sprint8-endpoints.md)
