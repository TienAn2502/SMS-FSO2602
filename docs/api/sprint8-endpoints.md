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

| POST | `/imports/class-placement` | SCHOOL_ADMIN | Import chia lớp đầu năm (mỗi sheet = một lớp; tự tạo lớp nếu chưa có) |
| GET | `/imports/templates/class-placement` | SCHOOL_ADMIN | File mẫu chia lớp (`.xlsx`); query `academicYearId`+`semesterId` → điền HS ở lại / mới lên cấp từ DB |
| POST | `/imports/course-sections` | SCHOOL_ADMIN | Import lớp môn (mỗi sheet = một lớp HC; tạo record mới) |
| GET | `/imports/templates/course-sections` | SCHOOL_ADMIN | File mẫu lớp môn (`.xlsx`); query `semesterId` → điền từ HC + môn khối |
| POST | `/imports/teaching-assignments` | SCHOOL_ADMIN | Import phân công giảng dạy |
| GET | `/imports/templates/teaching-assignments` | SCHOOL_ADMIN | File mẫu phân công (`.xlsx`); query `semesterId` → khối đầu cấp trống email; khối trên điền GV từ HK2 năm trước |
| POST | `/imports/timetable` | SCHOOL_ADMIN | Import TKB ma trận (mỗi sheet = một lớp HC) |
| GET | `/imports/templates/timetable` | SCHOOL_ADMIN | File mẫu TKB (`.xlsx`); query `semesterId` → khối 10 trống; khối 11/12 từ TKB HK2 năm trước |

### POST /imports/class-placement — multipart

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `file` | file | Chỉ `.xlsx` (multi-sheet) |
| `academicYearId` | string (form) | Năm học của lớp HC / ghi danh |
| `semesterId` | string (form) | Học kỳ ghi danh |

**Quy ước file:** mỗi sheet = một lớp; **tên sheet = mã lớp** (vd. `10A1`). Sheet `Huong_dan` bị bỏ qua. Lớp chưa có trong năm → tạo HC (`code`/`name` = tên sheet, khối suy từ prefix mã khớp `gradeLevels` của trường).

**Cột mỗi sheet:**

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| `ho_ten` | Có | Họ tên |
| `ngay_sinh` | Có | ISO hoặc `dd/mm/yyyy` |
| `gioi_tinh` | Không | Nam/Nữ hoặc MALE/FEMALE |
| `email` | Không | Email đăng nhập |
| `mat_khau` | Không | Mặc định theo env nếu tạo user mới |
| `external_code` | Không | Mã HS ngoài |

**Response (success):** `successCount`, `created`, `updated`, `classesCreated`, `classesExisting`, `errors: []`.

### GET /imports/templates/class-placement

| Query | Mô tả |
|-------|-------|
| `academicYearId` | (khuyến nghị) Năm học — cùng `semesterId` để lấy HS từ DB |
| `semesterId` | (khuyến nghị) Học kỳ — pool chưa xếp lớp (`RETAINED` / `NEW_INTAKE`) |

Có đủ năm + học kỳ: mỗi sheet gợi ý một lớp; HS ở lại → mã lớp năm trước; mới lên cấp → chia đều lớp khối đầu cấp (hoặc `{khối}A1` nếu chưa có lớp). Thiếu query → file mẫu tĩnh.

### POST /imports/course-sections — multipart

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `file` | file | Chỉ `.xlsx` (multi-sheet) |
| `semesterId` | string (form) | Học kỳ đích (tạo record mới) |

**Quy ước:** mỗi sheet = một lớp HC (tên sheet = mã lớp). Lớp HC phải đã có trong năm của học kỳ. Mỗi dòng = một lớp môn mới.

| Cột | Bắt buộc | Mô tả |
|-----|----------|-------|
| `ma_mon` | Có | Mã môn (vd. TOAN) — phải cấu hình cho khối lớp |
| `ten_lop_mon` | Không | Mặc định `{tên môn} {mã lớp}` |
| `ma_lop_mon` | Không | Mặc định `{ma_mon}-{mã lớp}` |
| `email_gv` | Không | Tạo phân công ACTIVE nếu lớp môn chưa có GV |

**Response:** `created`, `skippedExisting`, `assignmentsCreated`.

### GET /imports/templates/course-sections

| Query | Mô tả |
|-------|-------|
| `semesterId` | (khuyến nghị) Đủ mọi lớp HC của năm; khối đầu cấp = môn cấu hình khối; khối trên ưu tiên môn từ HK2 năm trước (lọc theo cấu hình khối hiện tại) |

File mẫu tĩnh: `docs/samples/course-sections-import-sample.xlsx` (sheet `10A1`–`10A3`, `11A1`, `12A1` + `Huong_dan`).

### GET /imports/templates/teaching-assignments

| Query | Mô tả |
|-------|-------|
| `semesterId` | (khuyến nghị) Đủ lớp môn ACTIVE của học kỳ; khối đầu cấp (vd. 10) = `email_gv` trống; khối 11/12 = email GV từ phân công ACTIVE HK2 năm trước (cùng mã lớp HC + mã môn) |

Cột: `email_gv`, `ma_lop_mon`, `ngay_phan_cong`. Dòng trống `email_gv` bị bỏ qua khi import. File mẫu tĩnh: `docs/samples/teaching-assignments-import-sample.xlsx`.

### GET /imports/templates/timetable

| Query | Mô tả |
|-------|-------|
| `semesterId` | (khuyến nghị) Mỗi sheet = một lớp HC ACTIVE; khối trên ưu tiên TKB ACTIVE HK2 năm trước; khối đầu cấp / thiếu TKB → gợi ý từ lớp môn đã phân công |

Mỗi ngày 10 tiết (1–5 sáng, 6–10 chiều). Mỗi ô: mã môn / tên môn (tuỳ chọn dòng phòng). GV lấy từ **phân công ACTIVE** (đối chiếu teaching assignment theo lớp HC + môn). Ô chưa có phân công → bỏ qua (không lỗi). Import ghi đè TKB cũ của các lớp có trong file. Nên tải mẫu kèm `semesterId` thay vì file mẫu tĩnh.

### POST /imports/students — multipart

| Field | Kiểu | Mô tả |
|-------|------|-------|
| `file` | file | `.xlsx` hoặc `.csv` |
| `academicYearId` | string (form) | Năm học ghi danh (khi có `ma_lop_hc`) |
| `semesterId` | string (form) | Học kỳ ghi danh (khi có `ma_lop_hc`) |

`ma_lop_hc` trên file là **tuỳ chọn**. Bỏ trống → chỉ tạo/cập nhật hồ sơ HS; xếp lớp sau tại `/class-placement`.


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
