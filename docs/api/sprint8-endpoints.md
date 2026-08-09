# Sprint 8 – API Endpoints (đề xuất)

> Import/export XLSX, CSV, PDF. Phụ thuộc Sprint 3–7 (dữ liệu nguồn).

## Quy ước chung

| Hạng mục | Quy ước |
|----------|---------|
| Import | `POST` + `multipart/form-data`, field `file` |
| Export XLSX/CSV | `GET` + query `format=xlsx` (default) \| `format=csv` |
| Export PDF | `GET` + `Accept: application/pdf` hoặc path suffix `/pdf` |
| Auth | Giống module gốc (`SCHOOL_ADMIN`, `TEACHER`, …) |
| Response file | `StreamableFile` — header `Content-Disposition: attachment` |

### Lỗi import (422)

```json
{
  "successCount": 0,
  "errorCount": 2,
  "errors": [
    { "row": 3, "field": "ngay_sinh", "message": "Ngày sinh không đúng định dạng YYYY-MM-DD" },
    { "row": 5, "field": "ma_lop_hc", "message": "Không tìm thấy lớp 10A9 trong năm học hiện tại" }
  ]
}
```

### Thành công import (200)

```json
{
  "successCount": 28,
  "errorCount": 0,
  "created": 20,
  "updated": 8,
  "errors": []
}
```

---

## Templates (Admin)

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/imports/templates/students` | SCHOOL_ADMIN | File mẫu import HS + ghi danh (`.xlsx`) |
| GET | `/imports/templates/scores` | SCHOOL_ADMIN, TEACHER | File mẫu import điểm theo lớp môn |

Query tuỳ chọn: `academicYearId`, `homeroomClassId`, `courseSectionId` — pre-fill mã lớp/môn trên template.

---

## Import (Admin / GV)

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| POST | `/imports/students` | SCHOOL_ADMIN | Import HS (+ ghi danh lớp HC) |
| POST | `/imports/scores` | SCHOOL_ADMIN, TEACHER | Import điểm bulk |

### POST /imports/students — multipart

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `file` | file | `.xlsx` hoặc `.csv` |
| `academicYearId` | string (form) | Năm học ghi danh |
| `mode` | string | `strict` (default, all-or-nothing) \| `partial` (phase sau) |

### POST /imports/scores — multipart

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `file` | file | `.xlsx` hoặc `.csv` |
| `courseSectionId` | string (form) | Lớp môn |
| `assessmentId` | string (form, optional) | Ghi vào một đầu điểm; bỏ trống = nhiều cột trên file |

**Cột điểm (MVP):**

| Cột | Mô tả |
|-----|-------|
| `ma_hs` / `external_code` | Mã HS |
| `ho_ten` | Đối chiếu (optional) |
| `diem` | Số hoặc để trống |

---

## Export — Admin

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/exports/students` | SCHOOL_ADMIN | Danh sách HS |
| GET | `/exports/teachers` | SCHOOL_ADMIN | Danh sách GV |
| GET | `/exports/parents` | SCHOOL_ADMIN | Danh sách phụ huynh |
| GET | `/exports/enrollments` | SCHOOL_ADMIN | Ghi danh lớp HC |
| GET | `/exports/gradebook/course-sections/:courseSectionId` | SCHOOL_ADMIN | Sổ điểm lớp môn |
| GET | `/exports/semester-summaries` | SCHOOL_ADMIN | Tổng kết học kỳ |
| GET | `/exports/year-summaries` | SCHOOL_ADMIN | Tổng kết năm / lên lớp |
| GET | `/exports/attendance` | SCHOOL_ADMIN | Điểm danh theo filter |
| GET | `/exports/timetable/homeroom-classes/:homeroomClassId` | SCHOOL_ADMIN | TKB lớp HC |
| GET | `/exports/timetable/course-sections/:courseSectionId` | SCHOOL_ADMIN | TKB lớp môn |

### Query chung (export)

| Param | Mô tả |
|-------|-------|
| `format` | `xlsx` \| `csv` (PDF dùng route `/pdf` hoặc `format=pdf`) |
| `academicYearId` | Lọc theo năm học |
| `semesterId` | Lọc theo học kỳ |
| `homeroomClassId` | Lọc theo lớp HC |
| `fromDate`, `toDate` | Điểm danh |

### PDF routes (gợi ý)

| Method | Path | Mô tả |
|--------|------|-------|
| GET | `/exports/gradebook/course-sections/:id/pdf` | Bảng điểm in |
| GET | `/exports/semester-summaries/pdf` | Bảng tổng kết lớp |
| GET | `/exports/year-summaries/pdf` | Biên bản xét lên lớp |
| GET | `/exports/timetable/homeroom-classes/:id/pdf` | TKB in treo lớp |

Query filter giống bản XLSX tương ứng.

---

## Export — Portal

| Method | Path | Role | Mô tả |
|--------|------|------|-------|
| GET | `/portal/exports/my-gradebook-classes/:courseSectionId` | TEACHER | Sổ điểm lớp được phân công |
| GET | `/portal/exports/my-gradebook-classes/:courseSectionId/pdf` | TEACHER | PDF bảng điểm |
| GET | `/portal/exports/my-homeroom/semester-summaries` | TEACHER | Tổng kết lớp CN |
| GET | `/portal/exports/my-grades` | STUDENT | Bảng điểm cá nhân |
| GET | `/portal/exports/my-grades/pdf` | STUDENT, PARENT | PDF bảng điểm con / bản thân |
| GET | `/portal/exports/my-schedule/pdf` | STUDENT, TEACHER | TKB cá nhân |

---

## Ví dụ client download

```typescript
const response = await api.get('/exports/students', {
  params: { format: 'xlsx', academicYearId },
  responseType: 'blob',
});
const url = URL.createObjectURL(response.data);
const a = document.createElement('a');
a.href = url;
a.download = 'danh-sach-hoc-sinh.xlsx';
a.click();
URL.revokeObjectURL(url);
```

---

## Phân quyền

| Endpoint | TEACHER | STUDENT | PARENT |
|----------|---------|---------|--------|
| Import HS | ❌ | ❌ | ❌ |
| Import điểm | ✅ lớp được phân công | ❌ | ❌ |
| Export toàn trường | ❌ | ❌ | ❌ |
| Export lớp CN / lớp môn | ✅ | ❌ | ❌ |
| Export bản thân / con | ❌ | ✅ | ✅ |

---

## Tài liệu liên quan

- [sprint-8-plan.md](../sprints/sprint-8-plan.md)
- [012-import-export-libraries.md](../decisions/012-import-export-libraries.md)
- [conventions.md](./conventions.md)
